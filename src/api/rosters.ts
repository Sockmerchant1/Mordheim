import { rosterSchema } from "../rules/schemas";
import type { Roster } from "../rules/types";
import { errorMessage } from "../lib/errors";
import { cloudAuthHeaders, cloudEnabled, cloudJson } from "../lib/cloud";
import { readAccountProfile } from "../lib/account";

const localKey = "mordheim.rosters";
const cloudStateKey = "mordheim.rosterCloudState";
const apiBaseUrl = (import.meta.env.VITE_ROSTER_API_BASE_URL ?? "").replace(/\/$/, "");
const storageMode = import.meta.env.VITE_ROSTER_STORAGE ?? "auto";

export type RosterCloudState = {
  enabled: boolean;
  remote: boolean;
  lastSyncedAt?: string;
  lastError?: string;
};

type StoredCloudState = {
  enabledRosterIds: string[];
  remoteRosterIds: string[];
  lastSyncedAt: Record<string, string>;
  lastError: Record<string, string>;
};

type CloudRosterRow = {
  id: string;
  roster_json: unknown;
  updated_at: string | null;
};

type RosterListResponse = {
  rosters: Roster[];
  rows: CloudRosterRow[];
};

type RosterResponse = {
  roster: Roster;
};

export async function listRosters(): Promise<Roster[]> {
  const local = readLocal();
  if (shouldUseCloud()) {
    const profile = readAccountProfile();
    if (!profile?.sessionToken) return local;
    try {
      const response = await cloudJson<RosterListResponse>("/api/rosters", {
        headers: cloudAuthHeaders(profile)
      });
      const remoteRows = response.rows ?? [];
      const remote = rosterSchema.array().parse(response.rosters);
      markRemoteRosters(remoteRows);
      const merged = mergeRemoteAndLocal(remote, local);
      writeLocal(merged);
      return merged;
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

export async function saveRoster(roster: Roster, options: { forceCloud?: boolean } = {}): Promise<Roster> {
  const parsed = rosterSchema.parse({ ...roster, updatedAt: new Date().toISOString() });
  if (shouldUseCloud() && (options.forceCloud || isRosterCloudEnabled(parsed.id))) {
    const profile = readAccountProfile();
    if (!profile?.sessionToken) {
      writeLocal(upsertLocal(parsed));
      return parsed;
    }
    try {
      const response = await cloudJson<RosterResponse>(`/api/rosters/${parsed.id}`, {
        method: "PUT",
        headers: cloudAuthHeaders(profile),
        body: JSON.stringify(parsed)
      });
      const saved = rosterSchema.parse(response.roster);
      markRosterCloudSynced(saved.id, saved.updatedAt);
      writeLocal(upsertLocal(saved));
      return saved;
    } catch (error) {
      markRosterCloudError(parsed.id, error);
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
  const cloudState = getRosterCloudState(id);
  if (shouldUseCloud() && (cloudState.enabled || cloudState.remote)) {
    const profile = readAccountProfile();
    if (profile?.sessionToken) {
      await cloudJson(`/api/rosters/${id}`, {
        method: "DELETE",
        headers: cloudAuthHeaders(profile)
      });
      writeLocal(readLocal().filter((roster) => roster.id !== id));
      clearRosterCloudState(id);
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

export async function enableRosterCloudSync(roster: Roster): Promise<Roster> {
  if (!shouldUseCloud()) throw new Error("Cloud saves are not configured.");
  const profile = readAccountProfile();
  if (!profile?.sessionToken) throw new Error("Log in before saving this warband to cloud.");
  setRosterCloudEnabled(roster.id, true);
  return saveRoster(roster, { forceCloud: true });
}

export async function disableRosterCloudSync(id: string): Promise<void> {
  if (shouldUseCloud()) {
    const profile = readAccountProfile();
    if (profile?.sessionToken) {
      await cloudJson(`/api/rosters/${id}`, {
        method: "DELETE",
        headers: cloudAuthHeaders(profile)
      });
    }
  }
  setRosterCloudEnabled(id, false);
}

export function getRosterCloudState(id: string): RosterCloudState {
  const state = readCloudState();
  return {
    enabled: state.enabledRosterIds.includes(id),
    remote: state.remoteRosterIds.includes(id),
    lastSyncedAt: state.lastSyncedAt[id],
    lastError: state.lastError[id]
  };
}

function shouldUseRemoteApi() {
  if (shouldUseCloud()) return false;
  if (storageMode === "local") return false;
  if (storageMode === "remote") return true;
  if (apiBaseUrl) return true;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function shouldUseCloud() {
  return storageMode !== "local" && cloudEnabled;
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

function readCloudState(): StoredCloudState {
  try {
    const parsed = JSON.parse(localStorage.getItem(cloudStateKey) ?? "{}") as Partial<StoredCloudState>;
    return {
      enabledRosterIds: Array.isArray(parsed.enabledRosterIds) ? parsed.enabledRosterIds.filter((id) => typeof id === "string") : [],
      remoteRosterIds: Array.isArray(parsed.remoteRosterIds) ? parsed.remoteRosterIds.filter((id) => typeof id === "string") : [],
      lastSyncedAt: objectOfStrings(parsed.lastSyncedAt),
      lastError: objectOfStrings(parsed.lastError)
    };
  } catch {
    return { enabledRosterIds: [], remoteRosterIds: [], lastSyncedAt: {}, lastError: {} };
  }
}

function writeCloudState(state: StoredCloudState) {
  localStorage.setItem(cloudStateKey, JSON.stringify({
    enabledRosterIds: uniqueStrings(state.enabledRosterIds),
    remoteRosterIds: uniqueStrings(state.remoteRosterIds),
    lastSyncedAt: state.lastSyncedAt,
    lastError: state.lastError
  }));
}

function isRosterCloudEnabled(id: string) {
  const state = readCloudState();
  return state.enabledRosterIds.includes(id) || state.remoteRosterIds.includes(id);
}

function setRosterCloudEnabled(id: string, enabled: boolean) {
  const state = readCloudState();
  if (enabled) {
    state.enabledRosterIds = uniqueStrings([...state.enabledRosterIds, id]);
    state.remoteRosterIds = uniqueStrings([...state.remoteRosterIds, id]);
    delete state.lastError[id];
  } else {
    state.enabledRosterIds = state.enabledRosterIds.filter((item) => item !== id);
    state.remoteRosterIds = state.remoteRosterIds.filter((item) => item !== id);
    delete state.lastSyncedAt[id];
    delete state.lastError[id];
  }
  writeCloudState(state);
}

function markRemoteRosters(rows: CloudRosterRow[]) {
  const state = readCloudState();
  for (const row of rows) {
    if (!row.id) continue;
    state.enabledRosterIds = uniqueStrings([...state.enabledRosterIds, row.id]);
    state.remoteRosterIds = uniqueStrings([...state.remoteRosterIds, row.id]);
    if (row.updated_at) state.lastSyncedAt[row.id] = row.updated_at;
    delete state.lastError[row.id];
  }
  writeCloudState(state);
}

function markRosterCloudSynced(id: string, syncedAt: string) {
  const state = readCloudState();
  state.enabledRosterIds = uniqueStrings([...state.enabledRosterIds, id]);
  state.remoteRosterIds = uniqueStrings([...state.remoteRosterIds, id]);
  state.lastSyncedAt[id] = syncedAt;
  delete state.lastError[id];
  writeCloudState(state);
}

function markRosterCloudError(id: string, error: unknown) {
  const state = readCloudState();
  state.lastError[id] = errorMessage(error);
  writeCloudState(state);
}

function clearRosterCloudState(id: string) {
  const state = readCloudState();
  state.enabledRosterIds = state.enabledRosterIds.filter((item) => item !== id);
  state.remoteRosterIds = state.remoteRosterIds.filter((item) => item !== id);
  delete state.lastSyncedAt[id];
  delete state.lastError[id];
  writeCloudState(state);
}

function objectOfStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items));
}

function mergeRemoteAndLocal(primary: Roster[], secondary: Roster[]) {
  const byId = new Map<string, Roster>();
  for (const roster of primary) byId.set(roster.id, roster);
  for (const roster of secondary) {
    if (!byId.has(roster.id)) byId.set(roster.id, roster);
  }
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
