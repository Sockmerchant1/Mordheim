# Deploying To Netlify

This app can run on Netlify as a static Vite site. On Netlify, rosters are stored in each user's browser storage. That means no paid database or server is required, but each player should use JSON export/import to back up or move rosters between devices.

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
- Roster storage: browser local storage
- Scheduler storage: Google Sheet through a Google Apps Script web app, if configured

## Scheduler Environment Variables

The game scheduler can share data through this Google Sheet:

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

Leave `VITE_SCHEDULER_GOOGLE_CALENDAR_ID` blank to use the Apps Script owner's default calendar. If `VITE_SCHEDULER_APPS_SCRIPT_URL` is blank, the schedule page uses local fallback data and will not be shared between players.

The scheduler now requires players to register or log in. Password checking happens inside Apps Script. The `Players` sheet stores salted password hashes and session token hashes, not plain passwords. After updating `scripts/googleAppsScriptScheduler.js`, paste the new full script into Google Apps Script and redeploy the Web App so Netlify uses the password-protected backend.

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

Game scheduling is different: it is intended to be shared through the configured Google Sheet and Apps Script endpoint. Each player still keeps a small local profile on their own device so invitations can be matched to them.

The local Windows version can still use the SQLite helper server when run with `npm run dev`.

## Optional Future Upgrade

If you later want shared accounts or cloud rosters, add a real hosted database/API and set:

```text
VITE_ROSTER_STORAGE=remote
VITE_ROSTER_API_BASE_URL=https://your-api.example.com
```

That is not required for the current Netlify setup.
