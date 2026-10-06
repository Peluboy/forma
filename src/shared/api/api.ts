import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
export type User = { id: string; name: string; email: string };
export type Config = {
  mode: "local" | "supabase" | "offline";
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supportEmail?: string | null;
};
export type Session = {
  user: User | null;
  csrfToken: string | null;
  capabilities?: {
    analysis?: { local: boolean; openai: boolean; gemini?: boolean };
    accountDeletion?: boolean;
  };
};
let configPromise: Promise<Config> | undefined;
let client: SupabaseClient | null = null;
let csrfToken: string | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export function getConfig(): Promise<Config> {
  return (configPromise ||= fetch("/api/config")
    .then(async (r) => {
      if (!r.ok) throw new Error("Server unavailable");
      const config = (await r.json()) as Config;
      if (!["local", "supabase"].includes(config.mode))
        throw new Error("Invalid server configuration");
      return config;
    })
    .catch((e) => {
      configPromise = undefined;
      throw e;
    }));
}
export async function getSupabase() {
  const c = await getConfig();
  if (c.mode !== "supabase") return null;
  if (!client) {
    if (!c.supabaseUrl || !c.supabaseAnonKey)
      throw new Error("Supabase is not configured on this server.");
    client = createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const supabase = await getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session)
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  const body = await response
    .json()
    .catch(() => ({ error: "The server returned an unexpected response." }));
  if (!response.ok)
    throw new ApiError(
      body.error || "Request failed.",
      response.status,
      body.code,
    );
  if ("csrfToken" in body) csrfToken = body.csrfToken;
  return body as T;
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export function authChanged() {
  window.dispatchEvent(new Event("forma-auth-change"));
}
export function useAccount() {
  const [session, setSession] = useState<Session>({
    user: null,
    csrfToken: null,
  });
  const [config, setConfig] = useState<Config>({ mode: "offline" });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    const refresh = async () => {
      try {
        const c = await getConfig();
        const s = await api<Session>("/session");
        if (alive) {
          setConfig(c);
          setSession(s);
          setError("");
        }
      } catch (e) {
        if (alive)
          setError(e instanceof Error ? e.message : "Server unavailable");
      } finally {
        if (alive) setReady(true);
      }
    };
    void refresh();
    void getSupabase()
      .then((sb) => {
        if (!alive || !sb) return;
        const subscription = sb.auth.onAuthStateChange(() => {
          setTimeout(() => void refresh(), 0);
        });
        unsubscribe = () => subscription.data.subscription.unsubscribe();
      })
      .catch(() => {});
    window.addEventListener("forma-auth-change", refresh);
    return () => {
      alive = false;
      unsubscribe?.();
      window.removeEventListener("forma-auth-change", refresh);
    };
  }, []);
  return { session, config, ready, error };
}
export async function signOut(scope: "local" | "global" | "others" = "local") {
  const sb = await getSupabase();
  if (sb) {
    const { error } = await sb.auth.signOut({ scope });
    if (error) throw error;
  } else await post("/auth/logout", { scope });
  if (scope !== "others") csrfToken = null;
  authChanged();
}
