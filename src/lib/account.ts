import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { schedulerConfig } from "../scheduler/config";
import type { PlayerProfile } from "../scheduler/types";
import { errorMessage } from "./errors";
import { getSupabaseSession, subscribeToSupabaseAuth, supabase, supabaseEnabled } from "./supabase";

const profileKey = "mordheim.scheduler.playerProfile";

export type AppAccount = {
  session: Session | null;
  profile?: PlayerProfile;
  authenticated: boolean;
  busy: boolean;
  message: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (playerName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearMessage: () => void;
};

export function useAppAccount(): AppAccount {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | undefined>(() => readAccountProfile());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!supabaseEnabled) {
      setSession(null);
      setProfile(readAccountProfile());
      return;
    }
    const nextSession = await getSupabaseSession();
    setSession(nextSession);
    setProfile(nextSession ? await loadAccountProfile(nextSession) : undefined);
  }

  useEffect(() => {
    if (!supabaseEnabled) return;
    let active = true;
    void getSupabaseSession().then(async (nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setProfile(nextSession ? await loadAccountProfile(nextSession) : undefined);
    }).catch((error) => {
      if (active) setMessage(errorMessage(error));
    });
    const unsubscribe = subscribeToSupabaseAuth((nextSession) => {
      setSession(nextSession);
      setMessage("");
      void (nextSession ? loadAccountProfile(nextSession) : Promise.resolve(undefined))
        .then((nextProfile) => setProfile(nextProfile))
        .catch((error) => setMessage(errorMessage(error)));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function login(email: string, password: string) {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!data.session) throw new Error("Login did not return a session.");
      setSession(data.session);
      setProfile(await loadAccountProfile(data.session));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function register(playerName: string, email: string, password: string) {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { player_name: playerName.trim() } }
      });
      if (error) throw error;
      if (!data.session) {
        setMessage("Account created. Confirm the email from Supabase, then log in.");
        return;
      }
      setSession(data.session);
      setProfile(await loadAccountProfile(data.session, playerName));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearAccountProfile();
      setSession(null);
      setProfile(undefined);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return {
    session,
    profile,
    authenticated: Boolean(profile?.playerId),
    busy,
    message,
    refresh,
    login,
    register,
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

export async function loadAccountProfile(session?: Session | null, preferredName?: string): Promise<PlayerProfile | undefined> {
  const nextSession = session ?? await getSupabaseSession();
  if (!nextSession?.user) {
    clearAccountProfile();
    return undefined;
  }
  const profile = await ensureAccountProfile(nextSession, preferredName);
  await ensureAccountCampaignMembership(profile);
  return saveAccountProfile({
    ...profile,
    sessionExpiresAt: nextSession.expires_at ? new Date(nextSession.expires_at * 1000).toISOString() : undefined
  });
}

export async function ensureAccountProfile(session: Session, preferredName?: string): Promise<PlayerProfile> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const fallbackName = preferredName?.trim()
    || stringValue(session.user.user_metadata.player_name)
    || stringValue(session.user.user_metadata.full_name)
    || session.user.email?.split("@")[0]
    || "Player";
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: session.user.id,
      player_name: fallbackName,
      email: session.user.email ?? null
    })
    .select("id, player_name, email, updated_at")
    .single();
  if (error) throw error;
  return {
    playerId: String(data.id),
    playerName: String(data.player_name),
    email: typeof data.email === "string" ? data.email : undefined,
    lastSeenAt: typeof data.updated_at === "string" ? data.updated_at : undefined
  };
}

export async function ensureAccountCampaignMembership(profile: PlayerProfile) {
  if (!supabase) return;
  const { error } = await supabase.from("campaign_members").insert({
    campaign_id: schedulerConfig.campaignId,
    user_id: profile.playerId,
    role: "member"
  });
  if (error && error.code !== "23505") throw error;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
