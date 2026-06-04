import { rosterSchema } from "../../src/rules/schemas.ts";
import type { Roster } from "../../src/rules/types.ts";
import type {
  GameInvitation,
  PlayerProfile,
  ScheduledGame,
  SchedulerGameStatus,
  SchedulerInviteStatus,
  SchedulerSnapshot
} from "../../src/scheduler/types.ts";
import {
  claimDays,
  createSessionToken,
  expiresAt,
  hashPassword,
  hashToken,
  sessionDays,
  verifyPassword
} from "./auth.ts";
import { applyTursoSchema, type SqlExecutor, type SqlRow, type SqlValue } from "./schema.ts";

const defaultCampaignId = "autumn-in-the-city";
const defaultCampaignName = "Autumn in the City";

type AuthedProfile = PlayerProfile & {
  role?: string;
};

type ApiContext = {
  db: SqlExecutor;
  campaignId?: string;
  campaignName?: string;
  applySchema?: boolean;
};

type HandlerContext = Required<Pick<ApiContext, "db" | "campaignId" | "campaignName">>;

export async function handleCloudApiRequest(request: Request, context: ApiContext): Promise<Response> {
  if (request.method === "OPTIONS") return json({ ok: true });
  const handlerContext: HandlerContext = {
    db: context.db,
    campaignId: context.campaignId ?? process.env.VITE_SCHEDULER_CAMPAIGN_ID ?? defaultCampaignId,
    campaignName: context.campaignName ?? process.env.VITE_SCHEDULER_CAMPAIGN_NAME ?? defaultCampaignName
  };
  if (context.applySchema) await applyTursoSchema(context.db);

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, "/api");
    const segments = path.split("/").filter(Boolean);
    if (segments[0] !== "api") return json({ error: "Not found" }, 404);
    if (segments[1] === "health") return json({ ok: true, backend: "turso" });
    if (segments[1] === "auth") return await handleAuth(request, handlerContext, segments[2]);
    if (segments[1] === "rosters") return await handleRosters(request, handlerContext, segments[2]);
    if (segments[1] === "scheduler") return await handleScheduler(request, handlerContext);
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
}

async function handleAuth(request: Request, context: HandlerContext, action?: string) {
  if (request.method === "GET" && action === "me") {
    const profile = await requireRequestSession(request, context);
    return json({ profile });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await readJson(request);
  if (action === "register") {
    const profile = await registerAccount(context, {
      playerName: stringField(body.playerName),
      email: stringField(body.email),
      password: stringField(body.password)
    });
    return json({ profile });
  }
  if (action === "login") {
    const profile = await loginAccount(context, {
      login: stringField(body.playerNameOrEmail) || stringField(body.email),
      password: stringField(body.password)
    });
    return json({ profile });
  }
  if (action === "claim") {
    const profile = await claimAccount(context, {
      email: stringField(body.email),
      claimToken: stringField(body.claimToken),
      password: stringField(body.password),
      playerName: stringField(body.playerName)
    });
    return json({ profile });
  }
  return json({ error: "Not found" }, 404);
}

async function handleRosters(request: Request, context: HandlerContext, id?: string) {
  const profile = await requireRequestSession(request, context);
  if (request.method === "GET" && !id) {
    const result = await context.db.execute({
      sql: `SELECT id, roster_json, updated_at FROM rosters WHERE owner_user_id = ? ORDER BY updated_at DESC`,
      args: [profile.playerId]
    });
    const rows = result.rows.map((row) => ({
      id: stringValue(row.id),
      roster_json: parseJsonString(row.roster_json),
      updated_at: nullableString(row.updated_at)
    }));
    return json({ rosters: rosterSchema.array().parse(rows.map((row) => row.roster_json)), rows });
  }
  if (["POST", "PUT"].includes(request.method)) {
    const raw = await readJson(request);
    const roster = normalizeRoster({ ...raw, id: id || stringField(raw.id) });
    await upsertRoster(context, profile.playerId, roster);
    return json({ roster });
  }
  if (request.method === "DELETE") {
    const rosterId = id || stringField((await readJson(request)).id);
    if (!rosterId) throw new Error("Roster id is required.");
    await context.db.execute({
      sql: `DELETE FROM rosters WHERE id = ? AND owner_user_id = ?`,
      args: [rosterId, profile.playerId]
    });
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function handleScheduler(request: Request, context: HandlerContext) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await readJson(request);
  const action = stringField(body.action);
  if (action === "registerPlayer") {
    const profile = await registerAccount(context, {
      playerName: stringField(body.playerName),
      email: stringField(body.email),
      password: stringField(body.password)
    });
    return json({ ok: true, data: profile });
  }
  if (action === "loginPlayer") {
    const profile = await loginAccount(context, {
      login: stringField(body.playerNameOrEmail),
      password: stringField(body.password)
    });
    return json({ ok: true, data: profile });
  }

  const profile = await requirePayloadSession(context, body.auth);
  await ensureCampaignMembership(context, profile.playerId);

  if (action === "listGames") {
    return json({ ok: true, data: await listGames(context) });
  }
  if (action === "upsertPlayer") {
    const player = body.player as Partial<PlayerProfile> | undefined;
    if (!player?.playerId || player.playerId !== profile.playerId) throw new Error("Players can only update their own profile.");
    const saved = await updateProfile(context, profile.playerId, {
      playerName: stringField(player.playerName) || profile.playerName,
      email: stringField(player.email) || profile.email
    });
    await ensureCampaignMembership(context, saved.playerId);
    return json({ ok: true, data: await listGames(context) });
  }
  if (action === "createGame") {
    const game = body.game as ScheduledGame | undefined;
    const invitations = Array.isArray(body.invitations) ? body.invitations as GameInvitation[] : [];
    if (!game) throw new Error("Game is required.");
    if (game.hostPlayerId !== profile.playerId) throw new Error("Only the host can create this game.");
    await insertGame(context, game, invitations);
    return json({ ok: true, data: await listGames(context) });
  }
  if (action === "respondToInvite") {
    const gameId = stringField(body.gameId);
    const inviteStatus = stringField(body.inviteStatus) as Exclude<SchedulerInviteStatus, "host">;
    const warbandName = stringField(body.warbandName);
    if (!gameId || !inviteStatus) throw new Error("Invitation response is incomplete.");
    await respondToInvite(context, gameId, profile, inviteStatus, warbandName);
    return json({ ok: true, data: await listGames(context) });
  }
  if (action === "updateGame") {
    const gameId = stringField(body.gameId);
    const patch = body.patch as Partial<ScheduledGame> | undefined;
    if (!gameId || !patch?.status) throw new Error("Game status is required.");
    await updateGameStatus(context, gameId, profile, patch.status);
    return json({ ok: true, data: await listGames(context) });
  }

  return json({ ok: false, error: `Unknown scheduler action: ${action}` }, 400);
}

async function registerAccount(context: HandlerContext, input: { playerName: string; email: string; password: string }) {
  if (!input.playerName.trim()) throw new Error("Player name is required.");
  if (!input.email.includes("@")) throw new Error("Email is required.");
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");
  const duplicate = await findProfileByLogin(context, input.email) || await findProfileByLogin(context, input.playerName);
  if (duplicate) throw new Error("That player name or email is already registered.");
  const now = new Date().toISOString();
  const password = await hashPassword(input.password);
  const session = createSessionToken();
  const sessionExpiresAt = expiresAt(sessionDays);
  const profileId = `player-${crypto.randomUUID()}`;
  await context.db.execute({
    sql: `INSERT INTO profiles (
      id, player_name, email, password_salt, password_hash, session_token_hash, session_expires_at,
      claim_token_hash, claim_expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
    args: [profileId, input.playerName.trim(), input.email.trim(), password.salt, password.hash, hashToken(session), sessionExpiresAt, now, now]
  });
  await ensureCampaignMembership(context, profileId);
  return publicProfile({ id: profileId, player_name: input.playerName.trim(), email: input.email.trim(), updated_at: now }, session, sessionExpiresAt);
}

async function loginAccount(context: HandlerContext, input: { login: string; password: string }) {
  if (!input.login.trim() || !input.password) throw new Error("Player name/email and password are required.");
  const row = await findProfileByLogin(context, input.login);
  if (!row || !stringValue(row.password_salt) || !stringValue(row.password_hash)) {
    throw new Error("Incorrect player name/email or password, or this migrated account still needs to be claimed.");
  }
  const ok = await verifyPassword(input.password, stringValue(row.password_salt), stringValue(row.password_hash));
  if (!ok) throw new Error("Incorrect player name/email or password.");
  const session = createSessionToken();
  const sessionExpiresAt = expiresAt(sessionDays);
  const now = new Date().toISOString();
  await context.db.execute({
    sql: `UPDATE profiles SET session_token_hash = ?, session_expires_at = ?, updated_at = ? WHERE id = ?`,
    args: [hashToken(session), sessionExpiresAt, now, stringValue(row.id)]
  });
  await ensureCampaignMembership(context, stringValue(row.id));
  return publicProfile({ ...row, updated_at: now }, session, sessionExpiresAt);
}

async function claimAccount(context: HandlerContext, input: { email: string; claimToken: string; password: string; playerName?: string }) {
  if (!input.email.includes("@") || !input.claimToken.trim()) throw new Error("Email and claim token are required.");
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");
  const row = await findProfileByLogin(context, input.email);
  if (!row || !stringValue(row.claim_token_hash) || !stringValue(row.claim_expires_at)) throw new Error("Claim token is invalid or expired.");
  if (new Date(stringValue(row.claim_expires_at)).getTime() < Date.now()) throw new Error("Claim token is invalid or expired.");
  if (hashToken(input.claimToken) !== stringValue(row.claim_token_hash)) throw new Error("Claim token is invalid or expired.");
  const password = await hashPassword(input.password);
  const session = createSessionToken();
  const sessionExpiresAt = expiresAt(sessionDays);
  const now = new Date().toISOString();
  const playerName = input.playerName?.trim() || stringValue(row.player_name);
  await context.db.execute({
    sql: `UPDATE profiles SET
      player_name = ?, password_salt = ?, password_hash = ?, session_token_hash = ?, session_expires_at = ?,
      claim_token_hash = NULL, claim_expires_at = NULL, updated_at = ?
      WHERE id = ?`,
    args: [playerName, password.salt, password.hash, hashToken(session), sessionExpiresAt, now, stringValue(row.id)]
  });
  await ensureCampaignMembership(context, stringValue(row.id));
  return publicProfile({ ...row, player_name: playerName, updated_at: now }, session, sessionExpiresAt);
}

async function requireRequestSession(request: Request, context: HandlerContext) {
  const playerId = request.headers.get("x-mordheim-player-id") ?? "";
  const sessionToken = request.headers.get("x-mordheim-session-token") ?? "";
  return requirePayloadSession(context, { playerId, sessionToken });
}

async function requirePayloadSession(context: HandlerContext, auth: unknown): Promise<AuthedProfile> {
  const candidate = auth as Partial<PlayerProfile> | undefined;
  const playerId = stringField(candidate?.playerId);
  const sessionToken = stringField(candidate?.sessionToken);
  if (!playerId || !sessionToken) throw new Error("Login required.");
  const row = await getProfile(context, playerId);
  if (!row || !stringValue(row.session_token_hash) || !stringValue(row.session_expires_at)) throw new Error("Login required.");
  if (new Date(stringValue(row.session_expires_at)).getTime() < Date.now()) throw new Error("Session expired. Log in again.");
  if (hashToken(sessionToken) !== stringValue(row.session_token_hash)) throw new Error("Login required.");
  return publicProfile(row, sessionToken, stringValue(row.session_expires_at));
}

async function ensureCampaignMembership(context: HandlerContext, userId: string, role = "member") {
  const now = new Date().toISOString();
  await context.db.execute({
    sql: `INSERT INTO campaigns (id, name, created_by, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
    args: [context.campaignId, context.campaignName, now, now]
  });
  await context.db.execute({
    sql: `INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(campaign_id, user_id) DO NOTHING`,
    args: [context.campaignId, userId, role, now]
  });
}

async function listGames(context: HandlerContext): Promise<SchedulerSnapshot> {
  const gamesResult = await context.db.execute({
    sql: `SELECT * FROM scheduled_games WHERE campaign_id = ? ORDER BY date ASC, time ASC`,
    args: [context.campaignId]
  });
  const games = gamesResult.rows.map(mapGame);
  const invitations = games.length ? await listInvitations(context, games.map((game) => game.gameId)) : [];
  const playersResult = await context.db.execute({
    sql: `SELECT p.id, p.player_name, p.email, p.updated_at
      FROM profiles p
      INNER JOIN campaign_members cm ON cm.user_id = p.id
      WHERE cm.campaign_id = ?
      ORDER BY p.player_name ASC`,
    args: [context.campaignId]
  });
  return normalizeSnapshot({
    games,
    invitations,
    players: playersResult.rows.map((row) => publicProfile(row)),
    backend: "turso"
  });
}

async function listInvitations(context: HandlerContext, gameIds: string[]) {
  const placeholders = gameIds.map(() => "?").join(", ");
  const result = await context.db.execute({
    sql: `SELECT * FROM game_invitations WHERE game_id IN (${placeholders})`,
    args: gameIds
  });
  return result.rows.map(mapInvitation);
}

async function insertGame(context: HandlerContext, game: ScheduledGame, invitations: GameInvitation[]) {
  await context.db.execute({
    sql: `INSERT INTO scheduled_games (
      id, campaign_id, title, date, time, duration_minutes, location_type, location_name,
      host_user_id, host_name, max_players, notes, status, google_calendar_event_id,
      google_calendar_event_url, google_calendar_invite_created_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      game.gameId, game.campaignId, game.title, game.date, game.time, game.durationMinutes, game.locationType, game.locationName,
      game.hostPlayerId, game.hostName, game.maxPlayers, game.notes, game.status, game.googleCalendarEventId ?? null,
      game.googleCalendarEventUrl ?? null, game.googleCalendarInviteCreatedAt ?? null, game.createdAt, game.updatedAt
    ]
  });
  for (const invite of invitations) {
    await upsertInvitation(context, invite);
  }
}

async function upsertInvitation(context: HandlerContext, invite: GameInvitation) {
  await context.db.execute({
    sql: `INSERT INTO game_invitations (
      game_id, player_id, player_name, email, warband_name, invite_status, responded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id, player_id) DO UPDATE SET
      player_name = excluded.player_name,
      email = excluded.email,
      warband_name = excluded.warband_name,
      invite_status = excluded.invite_status,
      responded_at = excluded.responded_at`,
    args: [invite.gameId, invite.playerId, invite.playerName, invite.email ?? null, invite.warbandName ?? null, invite.inviteStatus, invite.respondedAt ?? null]
  });
}

async function respondToInvite(
  context: HandlerContext,
  gameId: string,
  player: PlayerProfile,
  inviteStatus: Exclude<SchedulerInviteStatus, "host">,
  warbandName?: string
) {
  const invitation = (await context.db.execute({
    sql: `SELECT * FROM game_invitations WHERE game_id = ? AND player_id = ?`,
    args: [gameId, player.playerId]
  })).rows[0];
  if (!invitation) throw new Error("Invitation not found.");
  const gameRow = (await context.db.execute({ sql: `SELECT * FROM scheduled_games WHERE id = ?`, args: [gameId] })).rows[0];
  if (!gameRow) throw new Error("Game not found.");
  const game = mapGame(gameRow);
  const invitations = await listInvitations(context, [gameId]);
  const accepted = acceptedPlayerCount(game, invitations);
  if (inviteStatus === "accepted" && accepted >= game.maxPlayers && stringValue(invitation.invite_status) !== "accepted") {
    throw new Error("This game is already full.");
  }
  await context.db.execute({
    sql: `UPDATE game_invitations SET invite_status = ?, responded_at = ?, email = ?, warband_name = ?
      WHERE game_id = ? AND player_id = ?`,
    args: [inviteStatus, new Date().toISOString(), player.email ?? null, warbandName?.trim() || null, gameId, player.playerId]
  });
  await syncGameStatus(context, gameId);
}

async function updateGameStatus(context: HandlerContext, gameId: string, profile: AuthedProfile, status: SchedulerGameStatus) {
  const row = (await context.db.execute({ sql: `SELECT * FROM scheduled_games WHERE id = ?`, args: [gameId] })).rows[0];
  if (!row) throw new Error("Game not found.");
  const role = await campaignRole(context, profile.playerId);
  if (stringValue(row.host_user_id) !== profile.playerId && role !== "admin") throw new Error("Only the host can update this game.");
  await context.db.execute({
    sql: `UPDATE scheduled_games SET status = ?, updated_at = ? WHERE id = ?`,
    args: [status, new Date().toISOString(), gameId]
  });
}

async function syncGameStatus(context: HandlerContext, gameId: string) {
  const row = (await context.db.execute({ sql: `SELECT * FROM scheduled_games WHERE id = ?`, args: [gameId] })).rows[0];
  if (!row) return;
  const game = mapGame(row);
  if (["cancelled", "completed"].includes(game.status)) return;
  const invitations = await listInvitations(context, [gameId]);
  const status = calculateGameStatus(game, invitations);
  if (status !== game.status) {
    await context.db.execute({
      sql: `UPDATE scheduled_games SET status = ?, updated_at = ? WHERE id = ?`,
      args: [status, new Date().toISOString(), gameId]
    });
  }
}

async function updateProfile(context: HandlerContext, playerId: string, patch: { playerName: string; email?: string }) {
  const now = new Date().toISOString();
  await context.db.execute({
    sql: `UPDATE profiles SET player_name = ?, email = ?, updated_at = ? WHERE id = ?`,
    args: [patch.playerName.trim(), patch.email?.trim() || null, now, playerId]
  });
  const row = await getProfile(context, playerId);
  if (!row) throw new Error("Player not found.");
  return publicProfile(row);
}

async function upsertRoster(context: HandlerContext, ownerUserId: string, roster: Roster) {
  await context.db.execute({
    sql: `INSERT INTO rosters (id, owner_user_id, campaign_id, name, warband_type_id, roster_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_user_id = excluded.owner_user_id,
        campaign_id = excluded.campaign_id,
        name = excluded.name,
        warband_type_id = excluded.warband_type_id,
        roster_json = excluded.roster_json,
        updated_at = excluded.updated_at`,
    args: [roster.id, ownerUserId, context.campaignId, roster.name, roster.warbandTypeId, JSON.stringify(roster), roster.createdAt, roster.updatedAt]
  });
}

async function findProfileByLogin(context: HandlerContext, login: string) {
  const normalized = login.trim().toLowerCase();
  if (!normalized) return undefined;
  const result = await context.db.execute({
    sql: `SELECT * FROM profiles WHERE lower(player_name) = ? OR lower(email) = ? LIMIT 1`,
    args: [normalized, normalized]
  });
  return result.rows[0];
}

async function getProfile(context: HandlerContext, playerId: string) {
  const result = await context.db.execute({ sql: `SELECT * FROM profiles WHERE id = ? LIMIT 1`, args: [playerId] });
  return result.rows[0];
}

async function campaignRole(context: HandlerContext, playerId: string) {
  const result = await context.db.execute({
    sql: `SELECT role FROM campaign_members WHERE campaign_id = ? AND user_id = ? LIMIT 1`,
    args: [context.campaignId, playerId]
  });
  return nullableString(result.rows[0]?.role);
}

function publicProfile(row: SqlRow, sessionToken?: string, sessionExpiresAt?: string): AuthedProfile {
  return {
    playerId: stringValue(row.id),
    playerName: stringValue(row.player_name),
    email: nullableString(row.email),
    lastSeenAt: nullableString(row.updated_at),
    sessionToken,
    sessionExpiresAt
  };
}

function normalizeRoster(raw: unknown): Roster {
  const now = new Date().toISOString();
  const candidate = raw as Partial<Roster>;
  return rosterSchema.parse({
    ...candidate,
    id: candidate.id || `roster-${crypto.randomUUID()}`,
    createdAt: candidate.createdAt || now,
    updatedAt: now
  });
}

function mapGame(row: SqlRow): ScheduledGame {
  return {
    gameId: stringValue(row.id),
    campaignId: stringValue(row.campaign_id),
    title: stringValue(row.title),
    date: stringValue(row.date),
    time: stringValue(row.time),
    durationMinutes: numberValue(row.duration_minutes, 180),
    locationType: stringValue(row.location_type) as ScheduledGame["locationType"],
    locationName: stringValue(row.location_name),
    hostPlayerId: stringValue(row.host_user_id),
    hostName: stringValue(row.host_name),
    maxPlayers: numberValue(row.max_players, 2),
    notes: stringValue(row.notes),
    status: stringValue(row.status) as SchedulerGameStatus,
    googleCalendarEventId: nullableString(row.google_calendar_event_id),
    googleCalendarEventUrl: nullableString(row.google_calendar_event_url),
    googleCalendarInviteCreatedAt: nullableString(row.google_calendar_invite_created_at),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at)
  };
}

function mapInvitation(row: SqlRow): GameInvitation {
  return {
    gameId: stringValue(row.game_id),
    playerId: stringValue(row.player_id),
    playerName: stringValue(row.player_name),
    email: nullableString(row.email),
    warbandName: nullableString(row.warband_name),
    inviteStatus: stringValue(row.invite_status) as SchedulerInviteStatus,
    respondedAt: nullableString(row.responded_at)
  };
}

function normalizeSnapshot(snapshot: SchedulerSnapshot): SchedulerSnapshot {
  return {
    ...snapshot,
    games: snapshot.games.map((game) => ({ ...game, status: calculateGameStatus(game, snapshot.invitations) }))
  };
}

function acceptedPlayerCount(game: ScheduledGame, invitations: GameInvitation[]) {
  return invitations.filter((invite) => invite.gameId === game.gameId && ["host", "accepted"].includes(invite.inviteStatus)).length;
}

function calculateGameStatus(game: ScheduledGame, invitations: GameInvitation[]): SchedulerGameStatus {
  if (["cancelled", "completed"].includes(game.status)) return game.status;
  const accepted = acceptedPlayerCount(game, invitations);
  if (accepted >= game.maxPlayers) return "full";
  if (accepted >= 2) return "scheduled";
  return "open";
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.method === "GET") return {};
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as Record<string, unknown>;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Mordheim-Player-Id, X-Mordheim-Session-Token",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    }
  });
}

function parseJsonString(value: unknown) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function nullableString(value: unknown) {
  const text = stringValue(value);
  return text || undefined;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function sqlArgs(args: SqlValue[]) {
  return args;
}
