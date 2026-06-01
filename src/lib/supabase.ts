import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

export const supabaseEnabled = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    })
  : undefined;

export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function subscribeToSupabaseAuth(callback: (session: Session | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function ensureSupabaseProfile(session: Session, preferredName?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const email = session.user.email ?? "";
  const playerName = preferredName?.trim() || email.split("@")[0] || "Player";
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: session.user.id,
      player_name: playerName,
      email: email || null
    })
    .select("id")
    .single();
  if (error) throw error;
}
