# Deploying To Netlify

This app runs on Netlify as a Vite site with Netlify Functions. Without cloud env vars, rosters are stored in each user's browser storage. With Turso configured, signed-in players get shared scheduler data and cross-device roster saves.

## Recommended Setup

1. Put this project in a GitHub repository.
2. In Netlify, choose **Add new project**.
3. Choose **Import an existing project**.
4. Connect the GitHub repository.
5. Netlify should read `netlify.toml` automatically.

The configured settings are:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22.12.0`
- Roster storage: browser local storage, or Turso when cloud saves are enabled
- Scheduler storage: Turso through Netlify Functions, with the older Google Apps Script path still available for legacy setups

## Turso Cloud Environment Variables

Create a Turso database, then set these in Netlify under **Site configuration > Environment variables**:

```text
VITE_CLOUD_BACKEND=turso
TURSO_DATABASE_URL=libsql://YOUR_DATABASE.turso.io
TURSO_AUTH_TOKEN=YOUR_TURSO_AUTH_TOKEN
MORDHEIM_AUTH_SECRET=change-this-long-random-secret
VITE_SCHEDULER_CAMPAIGN_ID=autumn-in-the-city
VITE_SCHEDULER_CAMPAIGN_NAME=Autumn in the City
```

Only `VITE_CLOUD_BACKEND` and the scheduler name/id are public browser variables. `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `MORDHEIM_AUTH_SECRET` are server-side Function secrets.

Apply the schema and migrate existing Supabase data from a trusted local shell:

```bash
npm run turso:schema
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY npm run turso:export-supabase
npm run turso:import-supabase
```

The import writes `.local/migration/turso-claim-links.csv`. Give each player their claim token so they can use the Cloud Saves Claim tab to set a new password.

## Legacy Apps Script Scheduler Variables

The older game scheduler can still share data through this Google Sheet:

```text
1n2hA3dIFmkJ_gha16WkRD0hqNC5Zt9tmiUHwuJsVCkE
```

Create a Google Apps Script project using `scripts/googleAppsScriptScheduler.js`, deploy it as a Web App, then add these values in Netlify under **Site configuration > Environment variables**:

```text
VITE_SCHEDULER_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_SCHEDULER_CAMPAIGN_ID=autumn-in-the-city
VITE_SCHEDULER_CAMPAIGN_NAME=Autumn in the City
VITE_SCHEDULER_GOOGLE_SHEET_ID=1n2hA3dIFmkJ_gha16WkRD0hqNC5Zt9tmiUHwuJsVCkE
VITE_SCHEDULER_GOOGLE_CALENDAR_ID=
```

Leave `VITE_SCHEDULER_GOOGLE_CALENDAR_ID` blank to use the Apps Script owner's default calendar. If neither Turso nor `VITE_SCHEDULER_APPS_SCRIPT_URL` is configured, the schedule page uses local fallback data and will not be shared between players.

The Apps Script scheduler requires players to register or log in. Password checking happens inside Apps Script. The `Players` sheet stores salted password hashes and session token hashes, not plain passwords.

## What To Upload To GitHub

Upload the project source files, including:

- `src/`
- `server/`
- `tests/`
- `scripts/`
- `public/`
- `index.html`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.mjs`
- `netlify.toml`
- `README.md`
- `DATA_CONTRIBUTION_GUIDE.md`
- `KNOWN_GAPS.md`
- `NETLIFY_DEPLOY.md`

Do not upload:

- `node_modules/`
- `.local/`
- `.npm-cache/`
- `.tools/`

Those folders are local machine files and are already ignored by `.gitignore`.

## Important Storage Note

The Netlify version is local-first. If someone opens the app on another computer or browser, their rosters will not automatically appear there. Use the app's JSON export/import for backups and transfers.

Game scheduling is shared through Turso when `VITE_CLOUD_BACKEND=turso` is configured. Each player still keeps a small local profile and session token on their own device so invitations can be matched to them.

The local Windows version can still use the SQLite helper server when run with `npm run dev`.

Google Calendar invite creation is planned for a later Turso cloud update. The legacy Apps Script path can still create calendar invites if that backend is configured instead.
