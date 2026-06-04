import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const tables = ["profiles", "campaigns", "campaign_members", "scheduled_games", "game_invitations", "rosters"];
const outputDir = ".local/migration";
const outputPath = join(outputDir, "supabase-export.json");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before exporting.");
}

const baseUrl = SUPABASE_URL.replace(/\/$/, "");
const exported = {};

for (const table of tables) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!response.ok) {
    throw new Error(`Could not export ${table}: ${response.status} ${await response.text()}`);
  }
  exported[table] = await response.json();
  console.log(`Exported ${exported[table].length} ${table} rows.`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(exported, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
