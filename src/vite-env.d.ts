/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROSTER_API_BASE_URL?: string;
  readonly VITE_ROSTER_STORAGE?: "auto" | "local" | "remote";
  readonly VITE_SCHEDULER_APPS_SCRIPT_URL?: string;
  readonly VITE_SCHEDULER_CAMPAIGN_ID?: string;
  readonly VITE_SCHEDULER_CAMPAIGN_NAME?: string;
  readonly VITE_SCHEDULER_GOOGLE_SHEET_ID?: string;
  readonly VITE_SCHEDULER_GOOGLE_CALENDAR_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
