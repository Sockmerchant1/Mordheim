import { useEffect, useState } from "react";
import type { PlayerProfile } from "../scheduler/types";
import { cloudAuthHeaders, cloudEnabled, cloudJson } from "./cloud";
import { errorMessage } from "./errors";

const profileKey = "mordheim.scheduler.playerProfile";

export type AppAccount = {
  session: PlayerProfile | null;
  profile?: PlayerProfile;
  authenticated: boolean;
  busy: boolean;
  message: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (playerName: string, email: string, password: string) => Promise<void>;
  claim: (email: string, claimToken: string, password: string, playerName?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearMessage: () => void;
};

type ProfileResponse = {
  profile?: PlayerProfile;
};

export function useAppAccount(): AppAccount {
  const [profile, setProfile] = useState<PlayerProfile | undefined>(() => readAccountProfile());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!cloudEnabled) {
      setProfile(readAccountProfile());
      return;
    }
    const stored = readAccountProfile();
    if (!stored?.sessionToken) {
      setProfile(undefined);
      return;
    }
    const loaded = await cloudJson<ProfileResponse>("/api/auth/me", {
      headers: cloudAuthHeaders(stored)
    });
    const next = loaded.profile ? saveAccountProfile({ ...loaded.profile, sessionToken: stored.sessionToken }) : undefined;
    setProfile(next);
  }

  useEffect(() => {
    if (!cloudEnabled) return;
    let active = true;
    void refresh().catch((error) => {
      clearAccountProfile();
      if (active) {
        setProfile(undefined);
        setMessage(errorMessage(error));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    await runAccountAction(async () => {
      const response = await cloudJson<ProfileResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (!response.profile?.sessionToken) throw new Error("Login did not return a session.");
      setProfile(saveAccountProfile(response.profile));
    });
  }

  async function register(playerName: string, email: string, password: string) {
    await runAccountAction(async () => {
      const response = await cloudJson<ProfileResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ playerName, email, password })
      });
      if (!response.profile?.sessionToken) throw new Error("Registration did not return a session.");
      setProfile(saveAccountProfile(response.profile));
    });
  }

  async function claim(email: string, claimToken: string, password: string, playerName?: string) {
    await runAccountAction(async () => {
      const response = await cloudJson<ProfileResponse>("/api/auth/claim", {
        method: "POST",
        body: JSON.stringify({ email, claimToken, password, playerName })
      });
      if (!response.profile?.sessionToken) throw new Error("Claim did not return a session.");
      setProfile(saveAccountProfile(response.profile));
    });
  }

  async function logout() {
    setBusy(true);
    setMessage("");
    try {
      clearAccountProfile();
      setProfile(undefined);
    } finally {
      setBusy(false);
    }
  }

  async function runAccountAction(action: () => Promise<void>) {
    if (!cloudEnabled) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return {
    session: profile ?? null,
    profile,
    authenticated: Boolean(profile?.playerId && profile.sessionToken && isSessionCurrent(profile)),
    busy,
    message,
    refresh,
    login,
    register,
    claim,
    logout,
    clearMessage: () => setMessage("")
  };
}

export function readAccountProfile(): PlayerProfile | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(profileKey) ?? "null") as PlayerProfile | null;
    return parsed?.playerId && parsed.playerName ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveAccountProfile(profile: PlayerProfile): PlayerProfile {
  const next = {
    ...profile,
    playerId: profile.playerId || `player-${crypto.randomUUID()}`,
    playerName: profile.playerName.trim(),
    email: profile.email?.trim() || undefined,
    lastSeenAt: new Date().toISOString()
  };
  localStorage.setItem(profileKey, JSON.stringify(next));
  return next;
}

export function clearAccountProfile() {
  localStorage.removeItem(profileKey);
}

export async function loadAccountProfile(): Promise<PlayerProfile | undefined> {
  const stored = readAccountProfile();
  if (!cloudEnabled || !stored?.sessionToken) return stored;
  const response = await cloudJson<ProfileResponse>("/api/auth/me", {
    headers: cloudAuthHeaders(stored)
  });
  return response.profile ? saveAccountProfile({ ...response.profile, sessionToken: stored.sessionToken }) : undefined;
}

export async function ensureAccountCampaignMembership(profile: PlayerProfile) {
  if (!cloudEnabled || !profile.sessionToken) return;
  await cloudJson("/api/scheduler", {
    method: "POST",
    body: JSON.stringify({
      action: "upsertPlayer",
      player: profile,
      auth: {
        playerId: profile.playerId,
        sessionToken: profile.sessionToken
      }
    })
  });
}

function isSessionCurrent(profile: PlayerProfile) {
  if (!profile.sessionExpiresAt) return true;
  return new Date(profile.sessionExpiresAt).getTime() > Date.now();
}
