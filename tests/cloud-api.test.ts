import { beforeEach, describe, expect, it } from "vitest";
import { handleCloudApiRequest } from "../server/cloud/api";
import { hashToken } from "../server/cloud/auth";
import { applyTursoSchema } from "../server/cloud/schema";
import { createSqliteExecutor } from "../server/cloud/sqlite";
import type { SqlExecutor } from "../server/cloud/schema";
import type { PlayerProfile, SchedulerSnapshot } from "../src/scheduler/types";
import { validReiklanders } from "./fixtures/mercenaryRosters";

const baseUrl = "http://127.0.0.1";

describe("cloud API", () => {
  let db: SqlExecutor;

  beforeEach(async () => {
    process.env.MORDHEIM_AUTH_SECRET = "test-secret";
    db = createSqliteExecutor();
    await applyTursoSchema(db);
  });

  it("registers, rejects bad login, and logs in with email/password", async () => {
    const registered = await register("Alice", "alice@example.com", "secret1");
    expect(registered.playerId).toMatch(/^player-/);
    const badLogin = await rawPost("/api/auth/login", { email: "alice@example.com", password: "wrongpw" });
    const badLoginBody = await badLogin.json();
    expect(badLogin.status).toBe(500);
    expect(badLoginBody.error).toMatch(/Incorrect/);
    const loggedIn = await login("alice@example.com", "secret1");
    expect(loggedIn.playerId).toBe(registered.playerId);
    expect(loggedIn.sessionToken).toBeTruthy();
  });

  it("claims a migrated account by email and claim token", async () => {
    const claimToken = "claim-me";
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO profiles (
        id, player_name, email, password_salt, password_hash, session_token_hash, session_expires_at,
        claim_token_hash, claim_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?)`,
      args: ["supabase-user-1", "Migrated Alice", "migrated@example.com", hashToken(claimToken), futureDate(), now, now]
    });
    const claimed = await post<{ profile: PlayerProfile }>("/api/auth/claim", {
      email: "migrated@example.com",
      claimToken,
      password: "secret2"
    });
    expect(claimed.profile.playerId).toBe("supabase-user-1");
    await expect(login("migrated@example.com", "secret2")).resolves.toMatchObject({ playerId: "supabase-user-1" });
  });

  it("keeps roster cloud saves scoped to the authenticated owner", async () => {
    const alice = await register("Alice", "alice@example.com", "secret1");
    const bob = await register("Bob", "bob@example.com", "secret1");
    const roster = { ...validReiklanders(), id: "roster-alice", name: "Alice Company" };

    const saved = await put<{ roster: typeof roster }>("/api/rosters/roster-alice", roster, alice);
    expect(saved.roster.name).toBe("Alice Company");

    const aliceList = await get<{ rosters: typeof roster[] }>("/api/rosters", alice);
    const bobList = await get<{ rosters: typeof roster[] }>("/api/rosters", bob);
    expect(aliceList.rosters.map((item) => item.id)).toContain("roster-alice");
    expect(bobList.rosters).toHaveLength(0);

    await del("/api/rosters/roster-alice", bob);
    const stillAlice = await get<{ rosters: typeof roster[] }>("/api/rosters", alice);
    expect(stillAlice.rosters.map((item) => item.id)).toContain("roster-alice");
  });

  it("creates games, responds to invites, and updates status through campaign-scoped scheduler actions", async () => {
    const alice = await register("Alice", "alice@example.com", "secret1");
    const bob = await register("Bob", "bob@example.com", "secret1");
    const now = new Date().toISOString();
    const game = {
      gameId: "game-1",
      campaignId: "autumn-in-the-city",
      title: "Market square scrap",
      date: "2026-06-10",
      time: "19:00",
      durationMinutes: 180,
      locationType: "nova_games",
      locationName: "Nova Games",
      hostPlayerId: alice.playerId,
      hostName: alice.playerName,
      maxPlayers: 4,
      notes: "",
      status: "open",
      createdAt: now,
      updatedAt: now
    } as const;
    const invitations = [
      { gameId: "game-1", playerId: alice.playerId, playerName: alice.playerName, email: alice.email, inviteStatus: "host", respondedAt: now },
      { gameId: "game-1", playerId: bob.playerId, playerName: bob.playerName, email: bob.email, inviteStatus: "invited" }
    ];

    await scheduler<SchedulerSnapshot>("createGame", { game, invitations, host: alice, auth: authFor(alice) });
    const responded = await scheduler<SchedulerSnapshot>("respondToInvite", {
      gameId: "game-1",
      playerId: bob.playerId,
      inviteStatus: "accepted",
      warbandName: "Bob Company",
      auth: authFor(bob)
    });
    expect(responded.games[0].status).toBe("scheduled");

    const completed = await scheduler<SchedulerSnapshot>("updateGame", {
      gameId: "game-1",
      patch: { status: "completed" },
      auth: authFor(alice)
    });
    expect(completed.games[0].status).toBe("completed");
  });

  async function register(playerName: string, email: string, password: string) {
    const response = await post<{ profile: PlayerProfile }>("/api/auth/register", { playerName, email, password });
    return response.profile;
  }

  async function login(email: string, password: string) {
    const response = await post<{ profile: PlayerProfile }>("/api/auth/login", { email, password });
    return response.profile;
  }

  async function scheduler<T>(action: string, body: Record<string, unknown>) {
    const response = await post<{ data: T }>("/api/scheduler", { action, campaignId: "autumn-in-the-city", ...body });
    return response.data;
  }

  async function get<T>(path: string, profile: PlayerProfile) {
    return parse<T>(await handleCloudApiRequest(new Request(`${baseUrl}${path}`, { headers: headersFor(profile) }), { db }));
  }

  async function post<T>(path: string, body: unknown) {
    return parse<T>(await rawPost(path, body));
  }

  async function rawPost(path: string, body: unknown) {
    return handleCloudApiRequest(new Request(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }), { db });
  }

  async function put<T>(path: string, body: unknown, profile: PlayerProfile) {
    return parse<T>(await handleCloudApiRequest(new Request(`${baseUrl}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headersFor(profile) },
      body: JSON.stringify(body)
    }), { db }));
  }

  async function del(path: string, profile: PlayerProfile) {
    return parse(await handleCloudApiRequest(new Request(`${baseUrl}${path}`, {
      method: "DELETE",
      headers: headersFor(profile)
    }), { db }));
  }
});

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body?.ok === false) throw new Error(body.error ?? response.statusText);
  return body as T;
}

function headersFor(profile: PlayerProfile) {
  return {
    "X-Mordheim-Player-Id": profile.playerId,
    "X-Mordheim-Session-Token": profile.sessionToken ?? ""
  };
}

function authFor(profile: PlayerProfile) {
  return {
    playerId: profile.playerId,
    sessionToken: profile.sessionToken
  };
}

function futureDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}
