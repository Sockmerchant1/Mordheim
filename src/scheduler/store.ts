import type { Session } from "@supabase/supabase-js";
import { getSupabaseSession, subscribeToSupabaseAuth, supabase, supabaseEnabled } from "../lib/supabase";
import type {
  CreateGameInput,
  GameInvitation,
  PlayerProfile,
  ScheduledGame,
  SchedulerAuthInput,
  SchedulerGameStatus,
  SchedulerInviteStatus,
  SchedulerLoginInput,
  SchedulerSnapshot
} from "./types";

const profileKey = "mordheim.scheduler.playerProfile";
const localScheduleKey = "mordheim.scheduler.localSnapshot";

type SchedulerBackend = SchedulerSnapshot["backend"];

type SupabaseProfileRow = {
  id: string;
  player_name: string;
  email: string | null;
  updated_at: string | null;
};

type SupabaseGameRow = {
  id: string;
  campaign_id: string;
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  location_type: ScheduledGame["locationType"];
  location_name: string;
  host_user_id: string;
  host_name: string;
  max_players: number;
  notes: string | null;
  status: SchedulerGameStatus;
  google_calendar_event_id: string | null;
  google_calendar_event_url: string | null;
  google_calendar_invite_created_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseInvitationRow = {
  game_id: string;
  player_id: string;
  player_name: string;
  email: string | null;
  warband_name: string | null;
  invite_status: SchedulerInviteStatus;
  responded_at: string | null;
};

export const schedulerConfig = {
  campaignId: import.meta.env.VITE_SCHEDULER_CAMPAIGN_ID ?? "autumn-in-the-city",
  campaignName: import.meta.env.VITE_SCHEDULER_CAMPAIGN_NAME ?? "Autumn in the City",
  appsScriptUrl: (import.meta.env.VITE_SCHEDULER_APPS_SCRIPT_URL ?? "").trim(),
  googleSheetId: import.meta.env.VITE_SCHEDULER_GOOGLE_SHEET_ID ?? "1n2hA3dIFmkJ_gha16WkRD0hqNC5Zt9tmiUHwuJsVCkE",
  googleCalendarId: import.meta.env.VITE_SCHEDULER_GOOGLE_CALENDAR_ID ?? "",
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ?? "").trim(),
  supabaseEnabled
};

export function readPlayerProfile(): PlayerProfile | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(profileKey) ?? "null") as PlayerProfile | null;
    return parsed?.playerId && parsed.playerName ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function loadAuthenticatedPlayerProfile(): Promise<PlayerProfile | undefined> {
  if (!schedulerConfig.supabaseEnabled || !supabase) return readPlayerProfile();
  const session = await getSupabaseSession();
  if (!session?.user) {
    localStorage.removeItem(profileKey);
    return undefined;
  }
  const profile = await ensureSupabaseProfile(session);
  await ensureSupabaseCampaignMembership(profile);
  return savePlayerProfile({
    ...profile,
    sessionExpiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined
  });
}

export function subscribeToSchedulerAuth(callback: (profile: PlayerProfile | undefined) => void) {
  if (!schedulerConfig.supabaseEnabled) return () => {};
  return subscribeToSupabaseAuth(async () => {
    callback(await loadAuthenticatedPlayerProfile());
  });
}

export function savePlayerProfile(profile: PlayerProfile): PlayerProfile {
  const next = {
    ...profile,
    playerId: profile.playerId || `player-${crypto.randomUUID()}`,
    playerName: profile.playerName.trim(),
    email: profile.email?.trim() || undefined,
    lastSeenAt: new Date().toISOString()
  };
  localStorage.setItem(profileKey, JSON.stringify(next));
  return next;
}

export function isSchedulerAuthenticated(profile: PlayerProfile | undefined) {
  if (!profile?.playerId || !profile.playerName) return false;
  if (schedulerConfig.supabaseEnabled) return true;
  if (!schedulerConfig.appsScriptUrl) return true;
  if (!profile.sessionToken || !profile.sessionExpiresAt) return false;
  return new Date(profile.sessionExpiresAt).getTime() > Date.now();
}

export function logoutPlayer() {
  localStorage.removeItem(profileKey);
  if (schedulerConfig.supabaseEnabled && supabase) {
    void supabase.auth.signOut();
  }
}

export async function registerPlayer(input: SchedulerAuthInput): Promise<PlayerProfile> {
  validateAuthInput(input);
  if (schedulerConfig.supabaseEnabled && supabase) {
    if (!input.email?.trim()) throw new Error("Email is required for cloud accounts.");
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          player_name: input.playerName.trim()
        }
      }
    });
    if (error) throw error;
    if (!data.session) {
      throw new Error("Account created. Confirm the email from Supabase, then log in.");
    }
    const profile = await ensureSupabaseProfile(data.session, input.playerName.trim());
    await ensureSupabaseCampaignMembership(profile);
    return savePlayerProfile({
      ...profile,
      sessionExpiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : undefined
    });
  }
  if (schedulerConfig.appsScriptUrl) {
    const profile = await callSchedulerApi<PlayerProfile>("registerPlayer", {
      campaignId: schedulerConfig.campaignId,
      playerName: input.playerName.trim(),
      email: input.email?.trim() || "",
      password: input.password
    });
    return savePlayerProfile(profile);
  }
  const profile = savePlayerProfile({
    playerId: `player-${crypto.randomUUID()}`,
    playerName: input.playerName.trim(),
    email: input.email?.trim() || undefined,
    sessionToken: `local-${crypto.randomUUID()}`,
    sessionExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  });
  upsertLocalPlayer(profile);
  return profile;
}

export async function loginPlayer(input: SchedulerLoginInput): Promise<PlayerProfile> {
  if (!input.playerNameOrEmail.trim() || !input.password) throw new Error("Player name/email and password are required.");
  if (schedulerConfig.supabaseEnabled && supabase) {
    const login = input.playerNameOrEmail.trim();
    if (!login.includes("@")) throw new Error("Use your email address to log in to the cloud account.");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: login,
      password: input.password
    });
    if (error) throw error;
    if (!data.session) throw new Error("Login did not return a session.");
    const profile = await ensureSupabaseProfile(data.session);
    await ensureSupabaseCampaignMembership(profile);
    return savePlayerProfile({
      ...profile,
      sessionExpiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : undefined
    });
  }
  if (schedulerConfig.appsScriptUrl) {
    const profile = await callSchedulerApi<PlayerProfile>("loginPlayer", {
      campaignId: schedulerConfig.campaignId,
      playerNameOrEmail: input.playerNameOrEmail.trim(),
      password: input.password
    });
    return savePlayerProfile(profile);
  }
  const existingPlayer = readLocalSnapshot().players.find((player) =>
    [player.playerName, player.email].filter(Boolean).some((value) => value!.toLowerCase() === input.playerNameOrEmail.trim().toLowerCase())
  );
  if (!existingPlayer) throw new Error("No local player found. Register first.");
  return savePlayerProfile({
    ...existingPlayer,
    sessionToken: `local-${crypto.randomUUID()}`,
    sessionExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  });
}

export async function listSchedule(profile?: PlayerProfile): Promise<SchedulerSnapshot> {
  if (schedulerConfig.supabaseEnabled && supabase) {
    if (!isSchedulerAuthenticated(profile)) {
      return {
        games: [],
        invitations: [],
        players: [],
        backend: "supabase",
        warning: "Log in to load the shared cloud campaign schedule."
      };
    }
    try {
      await ensureSupabaseCampaignMembership(profile!);
      const [gamesResult, playersResult] = await Promise.all([
        supabase
          .from("scheduled_games")
          .select("*")
          .eq("campaign_id", schedulerConfig.campaignId)
          .order("date", { ascending: true })
          .order("time", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, player_name, email, updated_at, campaign_members!inner(campaign_id)")
          .eq("campaign_members.campaign_id", schedulerConfig.campaignId)
          .order("player_name", { ascending: true })
      ]);
      if (gamesResult.error) throw gamesResult.error;
      if (playersResult.error) throw playersResult.error;
      const games = (gamesResult.data ?? []).map(mapSupabaseGame);
      const gameIds = games.map((game) => game.gameId);
      const invitations = gameIds.length
        ? await listSupabaseInvitations(gameIds)
        : [];
      const players = rosterPlayersFromRows(playersResult.data ?? []);
      return normalizeSnapshot({ games, invitations, players, backend: "supabase" });
    } catch (error) {
      return {
        ...readLocalSnapshot(),
        backend: "local",
        warning: `Could not load the shared cloud schedule. Showing local fallback data. ${errorMessage(error)}`
      };
    }
  }
  if (schedulerConfig.appsScriptUrl) {
    if (!isSchedulerAuthenticated(profile)) {
      return {
        games: [],
        invitations: [],
        players: [],
        backend: "google-sheet",
        warning: "Log in to load the shared campaign schedule."
      };
    }
    try {
      const snapshot = await callSchedulerApi<SchedulerSnapshot>("listGames", {
        campaignId: schedulerConfig.campaignId,
        auth: authFor(profile)
      });
      return normalizeSnapshot({ ...snapshot, backend: "google-sheet" });
    } catch (error) {
      return {
        ...readLocalSnapshot(),
        backend: "local",
        warning: `Could not load the shared Google Sheet schedule. Showing local fallback data. ${errorMessage(error)}`
      };
    }
  }
  return {
    ...readLocalSnapshot(),
    backend: "local",
    warning: "Shared scheduler is not configured yet. Schedule changes are stored locally on this device."
  };
}

export async function upsertPlayer(profile: PlayerProfile): Promise<PlayerProfile> {
  const saved = savePlayerProfile(profile);
  if (schedulerConfig.supabaseEnabled && supabase) {
    const session = await getSupabaseSession();
    if (session?.user.id === saved.playerId) {
      await supabase
        .from("profiles")
        .upsert({
          id: saved.playerId,
          player_name: saved.playerName,
          email: saved.email ?? session.user.email ?? null
        })
        .select("id")
        .single();
      await ensureSupabaseCampaignMembership(saved);
    }
    return saved;
  }
  if (schedulerConfig.appsScriptUrl) {
    try {
      await callSchedulerApi("upsertPlayer", { campaignId: schedulerConfig.campaignId, player: saved, auth: authFor(saved) });
    } catch {
      upsertLocalPlayer(saved);
    }
  } else {
    upsertLocalPlayer(saved);
  }
  return saved;
}

export async function createGame(input: CreateGameInput, host: PlayerProfile): Promise<SchedulerSnapshot> {
  validateGameInput(input, host);
  const now = new Date().toISOString();
  const gameId = `game-${crypto.randomUUID()}`;
  const game: ScheduledGame = {
    gameId,
    campaignId: schedulerConfig.campaignId,
    title: input.title.trim() || "Mordheim campaign game",
    date: input.date,
    time: input.time,
    durationMinutes: input.durationMinutes || 180,
    locationType: input.locationType,
    locationName: input.locationName.trim(),
    hostPlayerId: host.playerId,
    hostName: host.playerName,
    maxPlayers: Math.max(2, Math.min(6, input.maxPlayers)),
    notes: input.notes.trim(),
    status: "open",
    createdAt: now,
    updatedAt: now
  };
  const invitations: GameInvitation[] = [
    {
      gameId,
      playerId: host.playerId,
      playerName: host.playerName,
      email: host.email,
      inviteStatus: "host",
      respondedAt: now
    },
    ...uniqueInvitedPlayers(input.invitedPlayers, host.playerId).map((player) => ({
      gameId,
      playerId: player.playerId || `guest-${slug(player.playerName)}-${crypto.randomUUID().slice(0, 8)}`,
      playerName: player.playerName.trim(),
      email: player.email?.trim() || undefined,
      warbandName: player.warbandName?.trim() || undefined,
      inviteStatus: "invited" as SchedulerInviteStatus
    }))
  ];
  const gameWithStatus = { ...game, status: calculateGameStatus(game, invitations) };

  if (schedulerConfig.supabaseEnabled && supabase) {
    await ensureSupabaseCampaignMembership(host);
    const { error: gameError } = await supabase.from("scheduled_games").insert({
      id: gameWithStatus.gameId,
      campaign_id: gameWithStatus.campaignId,
      title: gameWithStatus.title,
      date: gameWithStatus.date,
      time: gameWithStatus.time,
      duration_minutes: gameWithStatus.durationMinutes,
      location_type: gameWithStatus.locationType,
      location_name: gameWithStatus.locationName,
      host_user_id: gameWithStatus.hostPlayerId,
      host_name: gameWithStatus.hostName,
      max_players: gameWithStatus.maxPlayers,
      notes: gameWithStatus.notes,
      status: gameWithStatus.status,
      created_at: gameWithStatus.createdAt,
      updated_at: gameWithStatus.updatedAt
    });
    if (gameError) throw gameError;
    const { error: inviteError } = await supabase.from("game_invitations").upsert(
      invitations.map((invite) => ({
        game_id: invite.gameId,
        player_id: invite.playerId,
        player_name: invite.playerName,
        email: invite.email ?? null,
        warband_name: invite.warbandName ?? null,
        invite_status: invite.inviteStatus,
        responded_at: invite.respondedAt ?? null
      })),
      { onConflict: "game_id,player_id" }
    );
    if (inviteError) throw inviteError;
    return listSchedule(host);
  }

  if (schedulerConfig.appsScriptUrl) {
    try {
      return normalizeSnapshot(await callSchedulerApi<SchedulerSnapshot>("createGame", {
        campaignId: schedulerConfig.campaignId,
        game: gameWithStatus,
        invitations,
        host,
        auth: authFor(host)
      }));
    } catch {
      return createLocalGame(gameWithStatus, invitations, host);
    }
  }

  return createLocalGame(gameWithStatus, invitations, host);
}

export async function respondToInvite(gameId: string, player: PlayerProfile, inviteStatus: Exclude<SchedulerInviteStatus, "host">): Promise<SchedulerSnapshot> {
  if (schedulerConfig.supabaseEnabled && supabase) {
    const { error } = await supabase
      .from("game_invitations")
      .update({
        invite_status: inviteStatus,
        responded_at: new Date().toISOString(),
        email: player.email ?? null
      })
      .eq("game_id", gameId)
      .eq("player_id", player.playerId);
    if (error) throw error;
    await syncSupabaseGameStatus(gameId);
    return listSchedule(player);
  }
  if (schedulerConfig.appsScriptUrl) {
    try {
      return normalizeSnapshot(await callSchedulerApi<SchedulerSnapshot>("respondToInvite", {
        campaignId: schedulerConfig.campaignId,
        gameId,
        playerId: player.playerId,
        inviteStatus,
        auth: authFor(player)
      }));
    } catch {
      return respondLocal(gameId, player, inviteStatus);
    }
  }
  return respondLocal(gameId, player, inviteStatus);
}

export async function updateGameStatus(gameId: string, status: SchedulerGameStatus): Promise<SchedulerSnapshot> {
  if (schedulerConfig.supabaseEnabled && supabase) {
    const { error } = await supabase
      .from("scheduled_games")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", gameId);
    if (error) throw error;
    return listSchedule(readPlayerProfile());
  }
  if (schedulerConfig.appsScriptUrl) {
    try {
      return normalizeSnapshot(await callSchedulerApi<SchedulerSnapshot>("updateGame", {
        campaignId: schedulerConfig.campaignId,
        gameId,
        patch: { status },
        auth: authFor(readPlayerProfile())
      }));
    } catch {
      return updateLocalGame(gameId, { status });
    }
  }
  return updateLocalGame(gameId, { status });
}

export async function createGoogleCalendarInvite(gameId: string): Promise<SchedulerSnapshot> {
  if (schedulerConfig.supabaseEnabled) {
    throw new Error("Google Calendar invite creation is not wired for the Supabase backend yet.");
  }
  if (!schedulerConfig.appsScriptUrl) {
    throw new Error("Google Apps Script endpoint is not configured.");
  }
  return normalizeSnapshot(await callSchedulerApi<SchedulerSnapshot>("createGoogleCalendarInvite", {
    campaignId: schedulerConfig.campaignId,
    gameId,
    googleCalendarId: schedulerConfig.googleCalendarId,
    auth: authFor(readPlayerProfile())
  }));
}

export function acceptedPlayerCount(game: ScheduledGame, invitations: GameInvitation[]) {
  return invitations.filter((invite) => invite.gameId === game.gameId && ["host", "accepted"].includes(invite.inviteStatus)).length;
}

export function calculateGameStatus(game: ScheduledGame, invitations: GameInvitation[]): SchedulerGameStatus {
  if (["cancelled", "completed"].includes(game.status)) return game.status;
  const accepted = acceptedPlayerCount(game, invitations);
  if (accepted >= game.maxPlayers) return "full";
  if (accepted >= 2) return "scheduled";
  return "open";
}

export function invitationsForGame(gameId: string, invitations: GameInvitation[]) {
  return invitations.filter((invite) => invite.gameId === gameId);
}

export function currentPlayerInvite(gameId: string, player: PlayerProfile | undefined, invitations: GameInvitation[]) {
  if (!player) return undefined;
  return invitations.find((invite) => invite.gameId === gameId && invite.playerId === player.playerId);
}

async function callSchedulerApi<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(schedulerConfig.appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload })
  });
  if (!response.ok) throw new Error(response.statusText);
  const body = await response.json();
  if (body?.ok === false) throw new Error(body.error ?? "Scheduler API request failed.");
  return (body?.data ?? body) as T;
}

async function ensureSupabaseProfile(session: Session, preferredName?: string): Promise<PlayerProfile> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const fallbackName = preferredName
    ?? stringValue(session.user.user_metadata.player_name)
    ?? stringValue(session.user.user_metadata.full_name)
    ?? session.user.email?.split("@")[0]
    ?? "Player";
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: session.user.id,
      player_name: fallbackName,
      email: session.user.email ?? null
    })
    .select("id, player_name, email, updated_at")
    .single();
  if (error) throw error;
  return mapSupabaseProfile(data);
}

async function ensureSupabaseCampaignMembership(profile: PlayerProfile) {
  if (!supabase) return;
  const { error } = await supabase.from("campaign_members").upsert(
    {
      campaign_id: schedulerConfig.campaignId,
      user_id: profile.playerId,
      role: "member"
    },
    { onConflict: "campaign_id,user_id" }
  );
  if (error) throw error;
}

async function listSupabaseInvitations(gameIds: string[]): Promise<GameInvitation[]> {
  if (!supabase || !gameIds.length) return [];
  const { data, error } = await supabase
    .from("game_invitations")
    .select("*")
    .in("game_id", gameIds);
  if (error) throw error;
  return (data ?? []).map(mapSupabaseInvitation);
}

async function syncSupabaseGameStatus(gameId: string) {
  if (!supabase) return;
  const [{ data: gameRows, error: gameError }, { data: inviteRows, error: inviteError }] = await Promise.all([
    supabase.from("scheduled_games").select("*").eq("id", gameId).limit(1),
    supabase.from("game_invitations").select("*").eq("game_id", gameId)
  ]);
  if (gameError) throw gameError;
  if (inviteError) throw inviteError;
  const gameRow = gameRows?.[0] as SupabaseGameRow | undefined;
  if (!gameRow) return;
  const game = mapSupabaseGame(gameRow);
  const invitations = (inviteRows ?? []).map((row) => mapSupabaseInvitation(row as SupabaseInvitationRow));
  const status = calculateGameStatus(game, invitations);
  if (status !== game.status) {
    const { error } = await supabase
      .from("scheduled_games")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", gameId);
    if (error) throw error;
  }
}

function mapSupabaseProfile(row: SupabaseProfileRow): PlayerProfile {
  return {
    playerId: row.id,
    playerName: row.player_name,
    email: row.email ?? undefined,
    lastSeenAt: row.updated_at ?? undefined
  };
}

function mapSupabaseGame(row: SupabaseGameRow): ScheduledGame {
  return {
    gameId: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    date: row.date,
    time: row.time,
    durationMinutes: row.duration_minutes,
    locationType: row.location_type,
    locationName: row.location_name,
    hostPlayerId: row.host_user_id,
    hostName: row.host_name,
    maxPlayers: row.max_players,
    notes: row.notes ?? "",
    status: row.status,
    googleCalendarEventId: row.google_calendar_event_id ?? undefined,
    googleCalendarEventUrl: row.google_calendar_event_url ?? undefined,
    googleCalendarInviteCreatedAt: row.google_calendar_invite_created_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSupabaseInvitation(row: SupabaseInvitationRow): GameInvitation {
  return {
    gameId: row.game_id,
    playerId: row.player_id,
    playerName: row.player_name,
    email: row.email ?? undefined,
    warbandName: row.warband_name ?? undefined,
    inviteStatus: row.invite_status,
    respondedAt: row.responded_at ?? undefined
  };
}

function rosterPlayersFromRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => mapSupabaseProfile({
    id: String(row.id),
    player_name: String(row.player_name),
    email: typeof row.email === "string" ? row.email : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null
  }));
}

function validateGameInput(input: CreateGameInput, host: PlayerProfile) {
  if (!host.playerId || !host.playerName.trim()) throw new Error("Create your player profile before scheduling games.");
  if (!input.date) throw new Error("Date is required.");
  if (!input.time) throw new Error("Time is required.");
  if (!input.durationMinutes || input.durationMinutes <= 0) throw new Error("Duration is required.");
  if (input.maxPlayers < 2 || input.maxPlayers > 6) throw new Error("Games must have between 2 and 6 players.");
  if (!input.locationName.trim()) throw new Error("Location is required.");
  const names = input.invitedPlayers.map((player) => player.playerName.trim().toLowerCase()).filter(Boolean);
  if (new Set(names).size !== names.length) throw new Error("Players can only be invited once.");
}

function validateAuthInput(input: SchedulerAuthInput) {
  if (!input.playerName.trim()) throw new Error("Player name is required.");
  if (!input.password || input.password.length < 6) throw new Error("Password must be at least 6 characters.");
}

function authFor(profile: PlayerProfile | undefined) {
  if (!profile?.playerId || !profile.sessionToken) throw new Error("Log in before using the shared scheduler.");
  return {
    playerId: profile.playerId,
    sessionToken: profile.sessionToken
  };
}

function createLocalGame(game: ScheduledGame, invitations: GameInvitation[], host: PlayerProfile): SchedulerSnapshot {
  const current = readLocalSnapshot();
  const snapshot = normalizeSnapshot({
    games: [game, ...current.games.filter((item) => item.gameId !== game.gameId)],
    invitations: [...invitations, ...current.invitations.filter((item) => item.gameId !== game.gameId)],
    players: upsertPlayerList(current.players, [host, ...invitations.map(invitationToPlayer)]),
    backend: "local"
  });
  writeLocalSnapshot(snapshot);
  return snapshot;
}

function respondLocal(gameId: string, player: PlayerProfile, inviteStatus: Exclude<SchedulerInviteStatus, "host">): SchedulerSnapshot {
  const current = readLocalSnapshot();
  const game = current.games.find((item) => item.gameId === gameId);
  if (!game) return current;
  const accepted = acceptedPlayerCount(game, current.invitations);
  const currentInvite = current.invitations.find((invite) => invite.gameId === gameId && invite.playerId === player.playerId);
  if (inviteStatus === "accepted" && accepted >= game.maxPlayers && currentInvite?.inviteStatus !== "accepted") {
    throw new Error("This game is already full.");
  }
  const invitations = current.invitations.map((invite) => (
    invite.gameId === gameId && invite.playerId === player.playerId
      ? { ...invite, inviteStatus, respondedAt: new Date().toISOString(), email: player.email || invite.email }
      : invite
  ));
  const games = current.games.map((item) => (
    item.gameId === gameId
      ? { ...item, status: calculateGameStatus(item, invitations), updatedAt: new Date().toISOString() }
      : item
  ));
  const snapshot = normalizeSnapshot({ ...current, games, invitations, players: upsertPlayerList(current.players, [player]) });
  writeLocalSnapshot(snapshot);
  return snapshot;
}

function updateLocalGame(gameId: string, patch: Partial<ScheduledGame>): SchedulerSnapshot {
  const current = readLocalSnapshot();
  const games = current.games.map((game) => (
    game.gameId === gameId ? { ...game, ...patch, updatedAt: new Date().toISOString() } : game
  ));
  const snapshot = normalizeSnapshot({ ...current, games });
  writeLocalSnapshot(snapshot);
  return snapshot;
}

function upsertLocalPlayer(player: PlayerProfile) {
  const current = readLocalSnapshot();
  const snapshot = normalizeSnapshot({ ...current, players: upsertPlayerList(current.players, [player]) });
  writeLocalSnapshot(snapshot);
}

function readLocalSnapshot(): SchedulerSnapshot {
  try {
    return normalizeSnapshot(JSON.parse(localStorage.getItem(localScheduleKey) ?? "null") as SchedulerSnapshot | null);
  } catch {
    return emptySnapshot();
  }
}

function writeLocalSnapshot(snapshot: SchedulerSnapshot) {
  localStorage.setItem(localScheduleKey, JSON.stringify(snapshot));
}

function emptySnapshot(): SchedulerSnapshot {
  return { games: [], invitations: [], players: [], backend: "local" };
}

function normalizeSnapshot(snapshot?: Partial<SchedulerSnapshot> | null): SchedulerSnapshot {
  const current = snapshot ?? {};
  const games = (current.games ?? []).map((game) => ({
    ...game,
    durationMinutes: Number(game.durationMinutes || 180),
    maxPlayers: Math.max(2, Math.min(6, Number(game.maxPlayers || 2))),
    notes: game.notes ?? "",
    status: game.status ?? "open"
  }));
  const invitations = current.invitations ?? [];
  return {
    games: games.map((game) => ({ ...game, status: calculateGameStatus(game, invitations) })),
    invitations,
    players: current.players ?? [],
    backend: current.backend ?? defaultBackend(),
    warning: current.warning
  };
}

function defaultBackend(): SchedulerBackend {
  if (schedulerConfig.supabaseEnabled) return "supabase";
  if (schedulerConfig.appsScriptUrl) return "google-sheet";
  return "local";
}

function upsertPlayerList(existing: PlayerProfile[], players: PlayerProfile[]) {
  const byId = new Map(existing.map((player) => [player.playerId, player]));
  for (const player of players) {
    if (!player.playerId || !player.playerName) continue;
    const { sessionToken, sessionExpiresAt, ...publicPlayer } = player;
    byId.set(player.playerId, { ...byId.get(player.playerId), ...publicPlayer, lastSeenAt: player.lastSeenAt ?? new Date().toISOString() });
  }
  return Array.from(byId.values()).sort((a, b) => a.playerName.localeCompare(b.playerName));
}

function uniqueInvitedPlayers(players: CreateGameInput["invitedPlayers"], hostPlayerId: string) {
  const seen = new Set<string>();
  return players.filter((player) => {
    const key = player.playerId || player.playerName.trim().toLowerCase();
    if (!key || key === hostPlayerId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function invitationToPlayer(invitation: GameInvitation): PlayerProfile {
  return {
    playerId: invitation.playerId,
    playerName: invitation.playerName,
    email: invitation.email
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "player";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
