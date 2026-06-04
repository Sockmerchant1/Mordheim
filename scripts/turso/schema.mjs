export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_salt TEXT,
    password_hash TEXT,
    session_token_hash TEXT,
    session_expires_at TEXT,
    claim_token_hash TEXT,
    claim_expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS campaign_members (
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS scheduled_games (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 180,
    location_type TEXT NOT NULL,
    location_name TEXT NOT NULL,
    host_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    host_name TEXT NOT NULL,
    max_players INTEGER NOT NULL DEFAULT 2,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    google_calendar_event_id TEXT,
    google_calendar_event_url TEXT,
    google_calendar_invite_created_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS game_invitations (
    game_id TEXT NOT NULL REFERENCES scheduled_games(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    email TEXT,
    warband_name TEXT,
    invite_status TEXT NOT NULL DEFAULT 'invited',
    responded_at TEXT,
    PRIMARY KEY (game_id, player_id)
  )`,
  `CREATE TABLE IF NOT EXISTS rosters (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    warband_type_id TEXT NOT NULL,
    roster_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS campaign_members_user_id_idx ON campaign_members (user_id)`,
  `CREATE INDEX IF NOT EXISTS scheduled_games_campaign_date_idx ON scheduled_games (campaign_id, date, time)`,
  `CREATE INDEX IF NOT EXISTS game_invitations_game_id_idx ON game_invitations (game_id)`,
  `CREATE INDEX IF NOT EXISTS rosters_owner_updated_idx ON rosters (owner_user_id, updated_at DESC)`
];

export async function applySchema(conn) {
  for (const sql of schemaStatements) {
    const statement = await conn.prepare(sql);
    await statement.run();
  }
  const now = new Date().toISOString();
  await (await conn.prepare(`INSERT INTO campaigns (id, name, created_by, created_at, updated_at)
    VALUES (?, ?, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`))
    .run(["autumn-in-the-city", "Autumn in the City", now, now]);
}
