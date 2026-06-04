import type { PlayerProfile } from "../scheduler/types";

export type CloudBackend = "turso" | "google-sheet" | "local";

export const cloudBackend = ((import.meta.env.VITE_CLOUD_BACKEND ?? "local").trim() || "local") as CloudBackend;
export const cloudEnabled = cloudBackend === "turso";

const apiBaseUrl = (import.meta.env.VITE_CLOUD_API_BASE_URL ?? "").replace(/\/$/, "");

export function cloudApiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function cloudAuthHeaders(profile?: PlayerProfile): HeadersInit {
  if (!profile?.playerId || !profile.sessionToken) return {};
  return {
    "X-Mordheim-Player-Id": profile.playerId,
    "X-Mordheim-Session-Token": profile.sessionToken
  };
}

export async function cloudJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(cloudApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || response.statusText || "Cloud request failed.");
  }
  return body as T;
}
