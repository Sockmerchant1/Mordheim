import {
  clearAccountProfile,
  loadAccountProfile,
  readAccountProfile,
  saveAccountProfile
} from "../lib/account";
import { cloudEnabled, cloudJson } from "../lib/cloud";
import { errorMessage } from "../lib/errors";
import { schedulerConfig } from "./config";
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

const localScheduleKey = "mordheim.scheduler.localSnapshot";

type SchedulerBackend = SchedulerSnapshot["backend"];

export function readPlayerProfile(): PlayerProfile | undefined {
  return readAccountProfile();
}

export async function loadAuthenticatedPlayerProfile(): Promise<PlayerProfile | undefined> {
  return loadAccountProfile();
}

export function subscribeToSchedulerAuth(callback: (profile: PlayerProfile | undefined) => void) {
  void loadAuthenticatedPlayerProfile().then(callback);
  return () => {};
}

export function savePlayerProfile(profile: PlayerProfile): PlayerProfile {
  return saveAccountProfile(profile);
}

export function isSchedulerAuthenticated(profile: PlayerProfile | undefined) {
  if (!profile?.playerId || !profile.playerName) return false;
  if (cloudEnabled) return Boolean(profile.sessionToken) && sessionIsCurrent(profile);
  if (!schedulerConfig.appsScriptUrl) return true;
  if (!profile.sessionToken || !profile.sessionExpiresAt) return false;
  return sessionIsCurrent(profile);
}

export function logoutPlayer() {
  clearAccountProfile();
}

export async function registerPlayer(input: SchedulerAuthInput): Promise<PlayerProfile> {
  validateAuthInput(input);
  if (cloudEnabled) {
    if (!input.email?.trim()) throw new Error("Email is required for cloud accounts.");
    const response = await cloudJson<{ profile: PlayerProfile }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        playerName: input.playerName.trim(),
        email: input.email.trim(),
        password: input.password
      })
    });
    return savePlayerProfile(response.profile);
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
  if (cloudEnabled) {
    const response = await cloudJson<{ profile: PlayerProfile }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        playerNameOrEmail: input.playerNameOrEmail.trim(),
        password: input.password
      })
    });
    return savePlayerProfile(response.profile);
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
  if (cloudEnabled) {
    if (!isSchedulerAuthenticated(profile)) {
      return {
        games: [],
        invitations: [],
        players: [],
        backend: "turso",
        warning: "Log in to load the shared cloud campaign schedule."
      };
    }
    try {
      const snapshot = await callCloudSchedulerApi<SchedulerSnapshot>("listGames", {
        campaignId: schedulerConfig.campaignId,
        auth: authFor(profile)
      });
      return normalizeSnapshot({ ...snapshot, backend: "turso" });
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
  if (cloudEnabled) {
    try {
      await callCloudSchedulerApi("upsertPlayer", { campaignId: schedulerConfig.campaignId, player: saved, auth: authFor(saved) });
    } catch {
      upsertLocalPlayer(saved);
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
      warbandName: input.hostWarbandName?.trim() || undefined,
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

  if (cloudEnabled) {
    try {
      return normalizeSnapshot(await callCloudSchedulerApi<SchedulerSnapshot>("createGame", {
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

export async function respondToInvite(
  gameId: string,
  player: PlayerProfile,
  inviteStatus: Exclude<SchedulerInviteStatus, "host">,
  warbandName?: string
): Promise<SchedulerSnapshot> {
  if (cloudEnabled) {
    try {
      return normalizeSnapshot(await callCloudSchedulerApi<SchedulerSnapshot>("respondToInvite", {
        campaignId: schedulerConfig.campaignId,
        gameId,
        playerId: player.playerId,
        inviteStatus,
        warbandName: warbandName?.trim() || undefined,
        auth: authFor(player)
      }));
    } catch {
      return respondLocal(gameId, player, inviteStatus, warbandName);
    }
  }
  if (schedulerConfig.appsScriptUrl) {
    try {
      return normalizeSnapshot(await callSchedulerApi<SchedulerSnapshot>("respondToInvite", {
        campaignId: schedulerConfig.campaignId,
        gameId,
        playerId: player.playerId,
        inviteStatus,
        warbandName: warbandName?.trim() || undefined,
        auth: authFor(player)
      }));
    } catch {
      return respondLocal(gameId, player, inviteStatus, warbandName);
    }
  }
  return respondLocal(gameId, player, inviteStatus, warbandName);
}

export async function updateGameStatus(gameId: string, status: SchedulerGameStatus): Promise<SchedulerSnapshot> {
  if (cloudEnabled) {
    try {
      return normalizeSnapshot(await callCloudSchedulerApi<SchedulerSnapshot>("updateGame", {
        campaignId: schedulerConfig.campaignId,
        gameId,
        patch: { status },
        auth: authFor(readPlayerProfile())
      }));
    } catch {
      return updateLocalGame(gameId, { status });
    }
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
  if (cloudEnabled) {
    throw new Error("Calendar invites are planned for a later cloud update.");
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

async function callCloudSchedulerApi<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const body = await cloudJson<{ data?: T }>("/api/scheduler", {
    method: "POST",
    body: JSON.stringify({ action, ...payload })
  });
  return body.data as T;
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

function respondLocal(
  gameId: string,
  player: PlayerProfile,
  inviteStatus: Exclude<SchedulerInviteStatus, "host">,
  warbandName?: string
): SchedulerSnapshot {
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
      ? {
          ...invite,
          inviteStatus,
          respondedAt: new Date().toISOString(),
          email: player.email || invite.email,
          warbandName: warbandName?.trim() || invite.warbandName
        }
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
  if (cloudEnabled) return "turso";
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

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "player";
}

function sessionIsCurrent(profile: PlayerProfile) {
  if (!profile.sessionExpiresAt) return true;
  return new Date(profile.sessionExpiresAt).getTime() > Date.now();
}
