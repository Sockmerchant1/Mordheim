import { rosterSchema } from "../rules/schemas";
import type { Roster } from "../rules/types";
import { getSupabaseSession, supabase, supabaseEnabled } from "../lib/supabase";

const localKey = "mordheim.rosters";
const apiBaseUrl = (import.meta.env.VITE_ROSTER_API_BASE_URL ?? "").replace(/\/$/, "");
const storageMode = import.meta.env.VITE_ROSTER_STORAGE ?? "auto";

export async function listRosters(): Promise<Roster[]> {
  const local = readLocal();
  if (shouldUseSupabase()) {
    const userId = await authenticatedUserId();
    if (!userId || !supabase) return local;
    try {
      const { data, error } = await supabase
        .from("rosters")
        .select("roster_json")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const remote = rosterSchema.array().parse((data ?? []).map((row) => row.roster_json));
      return mergeRemoteAndLocal(remote, local);
    } catch {
      return local;
    }
  }
  if (!shouldUseRemoteApi()) return readLocal();
  try {
    const response = await fetch(apiUrl("/api/rosters"));
    if (!response.ok) throw new Error(response.statusText);
    return mergeRemoteAndLocal(rosterSchema.array().parse(await response.json()), local);
  } catch {
    return local;
  }
}

export async function saveRoster(roster: Roster): Promise<Roster> {
  const parsed = rosterSchema.parse({ ...roster, updatedAt: new Date().toISOString() });
  if (shouldUseSupabase()) {
    const userId = await authenticatedUserId();
    if (!userId || !supabase) {
      writeLocal(upsertLocal(parsed));
      return parsed;
    }
    try {
      const { data, error } = await supabase
        .from("rosters")
        .upsert({
          id: parsed.id,
          owner_user_id: userId,
          name: parsed.name,
          warband_type_id: parsed.warbandTypeId,
          roster_json: parsed,
          created_at: parsed.createdAt,
          updated_at: parsed.updatedAt
        })
        .select("roster_json")
        .single();
      if (error) throw error;
      const saved = rosterSchema.parse(data.roster_json);
      writeLocal(upsertLocal(saved));
      return saved;
    } catch {
      writeLocal(upsertLocal(parsed));
      return parsed;
    }
  }
  if (!shouldUseRemoteApi()) {
    writeLocal(upsertLocal(parsed));
    return parsed;
  }
  try {
    const response = await fetch(apiUrl(parsed.id ? `/api/rosters/${parsed.id}` : "/api/rosters"), {
      method: parsed.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    });
    if (!response.ok) throw new Error(response.statusText);
    const responseRoster = rosterSchema.parse(await response.json());
    const saved = responseRoster.id === parsed.id
      ? responseRoster
      : rosterSchema.parse({ ...responseRoster, id: parsed.id, createdAt: parsed.createdAt });
    writeLocal(upsertLocal(saved));
    return saved;
  } catch {
    writeLocal(upsertLocal(parsed));
    return parsed;
  }
}

export async function deleteRoster(id: string): Promise<void> {
  if (shouldUseSupabase() && supabase) {
    const userId = await authenticatedUserId();
    if (userId) {
      try {
        await supabase.from("rosters").delete().eq("id", id);
      } finally {
        writeLocal(readLocal().filter((roster) => roster.id !== id));
      }
      return;
    }
  }
  if (shouldUseRemoteApi()) {
    try {
      await fetch(apiUrl(`/api/rosters/${id}`), { method: "DELETE" });
    } finally {
      writeLocal(readLocal().filter((roster) => roster.id !== id));
    }
  } else {
    writeLocal(readLocal().filter((roster) => roster.id !== id));
  }
}

function shouldUseRemoteApi() {
  if (shouldUseSupabase()) return false;
  if (storageMode === "local") return false;
  if (storageMode === "remote") return true;
  if (apiBaseUrl) return true;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function shouldUseSupabase() {
  return storageMode !== "local" && supabaseEnabled;
}

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

function upsertLocal(roster: Roster): Roster[] {
  const existing = readLocal().filter((item) => item.id !== roster.id);
  return [roster, ...existing];
}

function readLocal(): Roster[] {
  try {
    return rosterSchema.array().parse(JSON.parse(localStorage.getItem(localKey) ?? "[]"));
  } catch {
    return [];
  }
}

function writeLocal(rosters: Roster[]) {
  localStorage.setItem(localKey, JSON.stringify(rosters));
}

async function authenticatedUserId() {
  const session = await getSupabaseSession();
  return session?.user.id ?? null;
}

function mergeRemoteAndLocal(primary: Roster[], secondary: Roster[]) {
  const byId = new Map<string, Roster>();
  for (const roster of primary) byId.set(roster.id, roster);
  for (const roster of secondary) {
    if (!byId.has(roster.id)) byId.set(roster.id, roster);
  }
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
