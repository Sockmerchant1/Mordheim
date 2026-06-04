# Mordheim Warband Manager

An unofficial local-first Mordheim roster and campaign helper. The app separates canonical rules data from player roster state so rosters reference structured records for fighter types, equipment, skills, special rules, source documents and campaign log entries.

The first fully seeded warbands are **Witch Hunters**, the official **Mercenaries** variants, **Averlanders**, **Kislevites**, **Ostlanders**, **Sisters of Sigmar**, **Carnival of Chaos**, **Cult of the Possessed**, **Skaven**, **Skaven of Clan Pestilens**, **Undead**, **Orc Mob**, **Dwarf Treasure Hunters**, **Beastmen Raiders**, **Shadow Warriors**, **Lizardmen**, **Forest Goblins**, **Black Orcs**, **Amazons (Lustria)**, **Amazons (Mordheim)**, **Pirates**, and **Gunnery School of Nuln**. The attached workbook was used as a roster layout and data-entry reference only; Broheim-hosted rule documents are treated as the source references.

## Stack

- React + TypeScript + Vite
- Zod for rules and roster schemas
- SQLite persistence through Node 24 `node:sqlite`
- Vitest rules-engine tests
- Playwright UI flow specs
- Simple CSS for responsive and printable roster layouts

## Deploy To Netlify

This app is ready to deploy to Netlify as a static Vite site. Netlify uses `netlify.toml`, runs `npm run build`, and publishes `dist`.

On Netlify, the app can still run local-first in each player's browser storage, but it now also supports Turso-backed cloud accounts through Netlify Functions for shared scheduler data and cross-device roster saves. If the cloud backend is not configured, players should use JSON export/import to back up or move rosters between devices. Players can also use Export PDF from Play Mode or the roster editor, then choose "Save as PDF" in the browser print dialog.

See `NETLIFY_DEPLOY.md` for step-by-step setup and the GitHub upload checklist.

## Installable App

The Netlify site is configured as an installable web app. On iPhone or iPad, open the site in Safari, tap Share, then choose Add to Home Screen. On Mac Safari, use File, then Add to Dock.

App icon files live in `public/pwa-icon-192.png`, `public/pwa-icon-512.png`, and `public/apple-touch-icon.png`. The current checked-in icon is the Mordheim skull artwork. Warband icon assets live in matching `public/warband-icons/light` and `public/warband-icons/dark` slug-named files.

## Run Locally

Requires Node 24+ because the local development API uses `node:sqlite` when Turso credentials are not present. The Netlify deployment uses Netlify Functions plus Turso for cloud accounts.

On macOS, double-click:

```text
Open Mordheim App.command
```

On Windows, use:

```text
Open Mordheim App.bat
```

Or run the friendly launcher:

```bash
npm start
```

The launcher installs dependencies if needed, starts the local API and Vite app, then opens the browser.

The lower-level development commands are:

```bash
npm install
npm run dev
```

The Vite app runs at `http://127.0.0.1:5173` and the local API runs at `http://127.0.0.1:5174`. Local cloud-dev state is stored in `.local/mordheim-cloud.sqlite`; rules data stays in `src/data`.

To enable the Turso cloud path, set:

```text
VITE_CLOUD_BACKEND=turso
VITE_SCHEDULER_CAMPAIGN_ID=autumn-in-the-city
VITE_SCHEDULER_CAMPAIGN_NAME=Autumn in the City
TURSO_DATABASE_URL=libsql://YOUR_DATABASE.turso.io
TURSO_AUTH_TOKEN=YOUR_TURSO_AUTH_TOKEN
MORDHEIM_AUTH_SECRET=change-this-long-random-secret
```

See `.env.example` for the current project values.

## Tests

```bash
npm test
npm run test:e2e
npm run typecheck
```

If Playwright browsers are not installed yet, run `npx playwright install` once before `npm run test:e2e`.

This workspace blocks package child executables, so Vite/Vitest/Playwright cannot launch here. I added a Node-native verification path that exercises the implemented warband rules:

```bash
npm run test:node
```

## Data Model Summary

Rules data:

- `SourceDocument`
- `WarbandType`
- `FighterType`
- `EquipmentItem`
- `EquipmentList`
- `SkillCategory`
- `Skill`
- `SpecialRule`
- `HiredSword`
- `RuleReference`

Roster state:

- `Roster`
- `RosterMember`
- `CampaignLogEntry`

Rules live in JSON seed files under `src/data`; campaign roster state is saved separately as JSON in SQLite. Play Mode battle state and in-progress After Battle drafts are temporary local browser data and are only applied to the permanent roster after final confirmation.

## App Modes

- **Roster Editor**: the existing long-term roster builder and campaign editor.
- **Campaign**: a campaign dashboard for history, economy, fighter progression, notes and between-game reminders.
- **Schedule**: a shared game scheduler for campaign games, invitations, a compact month calendar and optional Google Calendar invites.
- **Play Mode**: opened by the Roster button for quick table use. It has a compact battle dashboard, rout watch, status totals, rules lookup, dice/table helpers and an After Battle handoff. Secondary actions such as PDF export, roster editing, battle reset and view filters sit under More actions. Fighter cards use segmented battle status controls, wound tracking, a compact `+ XP` picker for OOA/objective/other battle XP, relevant-rules lookup and printable PDF roster sheets.
- **After Battle**: a guided post-game flow with a progress rail, checkpoint drawer and focused next/previous steps for result, XP, serious injuries, exploration, income, trading, advances, roster updates and final review.

The Create Warband screen also includes legal starter roster templates for implemented warbands. Templates live in `src/data/starterRosters.ts`, use canonical fighter/equipment ids, and are verified by the Node rules check.

The After Battle flow compares pre-battle XP with final XP using the central advancement threshold helper in `src/rules/engine.ts`, queues one advance slot per crossed threshold, and writes one campaign history entry when updates are applied. Serious injury and exploration steps use the shared dice/table helper in `src/rules/tableDice.ts`, so rolls can fill draft fields while still allowing manual overrides. Exploration defaults to one die per Hero who was not Out of Action in the battle snapshot, plus one winner's die for a win; Heroes who later make a Full Recovery still do not add an exploration die for that battle.

The Trading step is a post-battle ledger. Canonical equipment records can be bought, sold, found, moved between stash and fighters, or logged as discarded. Gold changes are folded into the treasury preview, and canonical stash/fighter equipment changes are applied only when the final After Battle review is confirmed. Custom items and unusual trading outcomes can still be logged as notes.

## Game Scheduler

The Schedule page is separate from local warband storage. It stores the local player profile in browser storage, then uses a scheduler store abstraction in `src/scheduler/store.ts`.

When Turso is configured, scheduler login uses app-owned email/password accounts through Netlify Functions, shared schedule data lives in Turso tables, and roster saves are mirrored to the signed-in player's cloud account. If Turso is not configured, the scheduler can still use the older Apps Script backend or local fallback mode.

Turso setup commands:

```bash
npm run turso:schema
npm run turso:export-supabase
npm run turso:import-supabase
```

The Supabase export command writes `.local/migration/supabase-export.json`. The import command loads those rows into Turso and writes `.local/migration/turso-claim-links.csv`; migrated players use the Claim tab in Cloud Saves to set a new password because Supabase Auth passwords cannot be exported.

Scheduler data is designed to be shared through this Google Sheet:

`https://docs.google.com/spreadsheets/d/1n2hA3dIFmkJ_gha16WkRD0hqNC5Zt9tmiUHwuJsVCkE/edit`

The frontend does not write directly to Google Sheets. Instead, deploy the Apps Script template in `scripts/googleAppsScriptScheduler.js` as a Web App, then set these environment values in Netlify:

```text
VITE_SCHEDULER_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_SCHEDULER_CAMPAIGN_ID=autumn-in-the-city
VITE_SCHEDULER_CAMPAIGN_NAME=Autumn in the City
VITE_SCHEDULER_GOOGLE_SHEET_ID=1n2hA3dIFmkJ_gha16WkRD0hqNC5Zt9tmiUHwuJsVCkE
VITE_SCHEDULER_GOOGLE_CALENDAR_ID=
```

If `VITE_SCHEDULER_APPS_SCRIPT_URL` is not set, the scheduler still works in local fallback mode on that device only. This is useful for testing the UI but not for shared campaign scheduling.

Suggested Google Sheet tabs are created by the Apps Script if missing:

- `Games`
- `Invitations`
- `Players`

Google Calendar invites are still created only by Apps Script. The Turso cloud path shows a planned-later message for calendar invites rather than storing Google credentials in the app backend.

If Turso is configured, scheduler login uses email/password accounts stored as salted password hashes plus hashed session tokens in Turso. If Turso is not configured but the Apps Script endpoint is, scheduler login is handled by Apps Script. If neither backend is configured, login falls back to local test mode and is not shared protection.

## Rules Validation

The pure TypeScript rules engine in `src/rules/engine.ts` accepts a roster and rules database, then returns:

- allowed warbands, fighter types, equipment, skills, prayers, spells and rituals
- calculated roster cost
- calculated warband rating
- structured validation issues with severity, code, detail, suggested fix and source reference

Validation currently covers implemented-warband composition, leader requirements, model limits, ratio limits, group size limits, equipment list restrictions, required roster options, required paired equipment, exclusive equipment, weapon count limits, Skaven Tail Fighting weapon allowance, armour conflicts, henchman equipment uniformity, skill category access, prayer/spell/ritual access, experience sanity checks, cost totals and rating totals.

Hired swords are seeded from local data and can be hired from the Roster Editor. They are stored as roster members with canonical fighter profiles, fixed equipment records, hire fees, upkeep notes and source references, but they do not count toward normal warband size or hero limits.

## Implemented Warbands

- Witch Hunters
- Reiklanders
- Middenheimers
- Marienburgers
- Averlanders
- Kislevites
- Ostlanders
- Sisters of Sigmar
- Carnival of Chaos
- Cult of the Possessed
- Skaven
- Skaven of Clan Pestilens
- Undead
- Orc Mob
- Dwarf Treasure Hunters
- Beastmen Raiders
- Shadow Warriors
- Lizardmen
- Forest Goblins
- Black Orcs
- Amazons (Lustria)
- Amazons (Mordheim)
- Pirates
- Gunnery School of Nuln

The currently tracked Grade 1a official warbands in `src/data/warbandIndex.json` are seeded and covered by rules-engine verification.

## Adding A Warband

1. Add or confirm the source document in `src/data/sources.json`.
2. Create `src/data/warbands/<warband-id>.json`.
3. Define one `warbandType`, all `fighterTypes`, and the warband `equipmentLists`.
4. Reuse existing equipment, skills and special rules where possible.
5. Add concise summaries and page references; do not copy full rulebook sections.
6. Import the seed in `src/data/rulesDb.ts`.
7. Add a starter roster template in `src/data/starterRosters.ts`.
8. Add fixtures and tests in `tests/fixtures` and `tests/rules-engine.test.ts`.

Run:

```bash
npm run seed:index
npm run test:node
```

## Adding A Skill

1. Add the skill id to the relevant category in `src/data/skills.json`.
2. Add a concise skill record with `effectSummary`, `restrictions`, source URL and page ref.
3. Add the category id to any fighter types that can select it.
4. Add a rules-engine test for at least one allowed and one blocked fighter.

## Adding A Hired Sword

1. Add a reviewed record to `src/data/hiredSwords.json`.
2. Include hire fee, upkeep, availability, concise effect summary and source reference.
3. Add or link a fighter type record if the hired sword should appear as a roster member.
4. Add validation tests for hire/upkeep and rating behavior.

## Source And Copyright Note

This app stores concise mechanics, summaries, validation metadata and source/page references. It must not reproduce whole PDFs or long rulebook sections. Broheim URLs and page refs are included so players can check the original rules.

This is an unofficial helper app and is not affiliated with Games Workshop or Broheim. It is not a replacement for the Mordheim rulebooks.
