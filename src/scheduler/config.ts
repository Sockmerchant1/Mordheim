import { supabaseEnabled } from "../lib/supabase";

export const schedulerConfig = {
  campaignId: import.meta.env.VITE_SCHEDULER_CAMPAIGN_ID ?? "autumn-in-the-city",
  campaignName: import.meta.env.VITE_SCHEDULER_CAMPAIGN_NAME ?? "Autumn in the City",
  appsScriptUrl: (import.meta.env.VITE_SCHEDULER_APPS_SCRIPT_URL ?? "").trim(),
  googleSheetId: import.meta.env.VITE_SCHEDULER_GOOGLE_SHEET_ID ?? "1n2hA3dIFmkJ_gha16WkRD0hqNC5Zt9tmiUHwuJsVCkE",
  googleCalendarId: import.meta.env.VITE_SCHEDULER_GOOGLE_CALENDAR_ID ?? "",
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ?? "").trim(),
  supabaseEnabled
};
