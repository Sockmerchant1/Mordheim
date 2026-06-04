import { createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { connect } from "@tursodatabase/serverless";
import { applySchema } from "./schema.mjs";

const {
  TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN,
  MORDHEIM_AUTH_SECRET = "mordheim-local-dev-secret"
} = process.env;

const inputPath = process.argv[2] || ".local/migration/supabase-export.json";
const claimsPath = ".local/migration/turso-claim-links.csv";

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before importing.");
}

const exported = JSON.parse(await readFile(inputPath, "utf8"));
const conn = connect({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });
await applySchema(conn);

const claimRows = [["email", "player_name", "claim_token"]];

for (const profile of exported.profiles ?? []) {
  const claimToken = profile.email ? randomBytes(24).toString("base64url") : "";
  if (claimToken) claimRows.push([profile.email, profile.player_name, claimToken]);
  await run(`INSERT INTO profiles (
    id, player_name, email, password_salt, password_hash, session_token_hash, session_expires_at,
    claim_token_hash, claim_expires_at, created_at, updated_at
  ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    player_name = excluded.player_name,
    email = excluded.email,
    claim_token_hash = COALESCE(profiles.claim_token_hash, excluded.claim_token_hash),
    claim_expires_at = COALESCE(profiles.claim_expires_at, excluded.claim_expires_at),
    updated_at = excluded.updated_at`, [
    profile.id,
    profile.player_name || profile.email?.split("@")[0] || "Player",
    profile.email || null,
    claimToken ? hashToken(claimToken) : null,
    claimToken ? daysFromNow(30) : null,
    profile.created_at || new Date().toISOString(),
    profile.updated_at || profile.created_at || new Date().toISOString()
  ]);
}

for (const campaign of exported.campaigns ?? []) {
  await run(`INSERT INTO campaigns (id, name, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, created_by = excluded.created_by, updated_at = excluded.updated_at`, [
    campaign.id,
    campaign.name,
    campaign.created_by || null,
    campaign.created_at || new Date().toISOString(),
    campaign.updated_at || campaign.created_at || new Date().toISOString()
  ]);
}

for (const member of exported.campaign_members ?? []) {
  await run(`INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(campaign_id, user_id) DO UPDATE SET role = excluded.role`, [
    member.campaign_id,
    member.user_id,
    member.role || "member",
    member.joined_at || new Date().toISOString()
  ]);
}

for (const game of exported.scheduled_games ?? []) {
  await run(`INSERT INTO scheduled_games (
    id, campaign_id, title, date, time, duration_minutes, location_type, location_name,
    host_user_id, host_name, max_players, notes, status, google_calendar_event_id,
    google_calendar_event_url, google_calendar_invite_created_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    date = excluded.date,
    time = excluded.time,
    duration_minutes = excluded.duration_minutes,
    location_type = excluded.location_type,
    location_name = excluded.location_name,
    host_name = excluded.host_name,
    max_players = excluded.max_players,
    notes = excluded.notes,
    status = excluded.status,
    google_calendar_event_id = excluded.google_calendar_event_id,
    google_calendar_event_url = excluded.google_calendar_event_url,
    google_calendar_invite_created_at = excluded.google_calendar_invite_created_at,
    updated_at = excluded.updated_at`, [
    game.id,
    game.campaign_id,
    game.title,
    game.date,
    game.time,
    game.duration_minutes || 180,
    game.location_type,
    game.location_name,
    game.host_user_id,
    game.host_name,
    game.max_players || 2,
    game.notes || "",
    game.status || "open",
    game.google_calendar_event_id || null,
    game.google_calendar_event_url || null,
    game.google_calendar_invite_created_at || null,
    game.created_at || new Date().toISOString(),
    game.updated_at || game.created_at || new Date().toISOString()
  ]);
}

for (const invite of exported.game_invitations ?? []) {
  await run(`INSERT INTO game_invitations (game_id, player_id, player_name, email, warband_name, invite_status, responded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id, player_id) DO UPDATE SET
      player_name = excluded.player_name,
      email = excluded.email,
      warband_name = excluded.warband_name,
      invite_status = excluded.invite_status,
      responded_at = excluded.responded_at`, [
    invite.game_id,
    invite.player_id,
    invite.player_name,
    invite.email || null,
    invite.warband_name || null,
    invite.invite_status || "invited",
    invite.responded_at || null
  ]);
}

for (const roster of exported.rosters ?? []) {
  await run(`INSERT INTO rosters (id, owner_user_id, campaign_id, name, warband_type_id, roster_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      campaign_id = excluded.campaign_id,
      name = excluded.name,
      warband_type_id = excluded.warband_type_id,
      roster_json = excluded.roster_json,
      updated_at = excluded.updated_at`, [
    roster.id,
    roster.owner_user_id,
    roster.campaign_id || "autumn-in-the-city",
    roster.name,
    roster.warband_type_id,
    typeof roster.roster_json === "string" ? roster.roster_json : JSON.stringify(roster.roster_json),
    roster.created_at || new Date().toISOString(),
    roster.updated_at || roster.created_at || new Date().toISOString()
  ]);
}

await mkdir(dirname(claimsPath), { recursive: true });
await writeFile(claimsPath, `${claimRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
console.log(`Imported Supabase export into Turso.`);
console.log(`Wrote claim tokens to ${claimsPath}.`);

async function run(sql, args = []) {
  const statement = await conn.prepare(sql);
  await statement.run(args);
}

function hashToken(token) {
  return createHmac("sha256", MORDHEIM_AUTH_SECRET).update(token).digest("hex");
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
