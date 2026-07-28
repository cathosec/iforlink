import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  SUPABASE_PUBLISHABLE_KEY_FALLBACK,
  SUPABASE_URL_FALLBACK,
} from "@/integrations/supabase/public-config";

export const MP_AUTH_URL = "https://auth.mercadopago.com/authorization";
export const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
export const MP_PAY_URL = "https://api.mercadopago.com/v1/payments";

export interface PixConfig {
  enabled?: boolean;
  fee_percent?: number;
  min_fee_cents?: number;
  oauth_client_id?: string;
  oauth_client_secret?: string;
  has_oauth_client_secret?: boolean;
}

export interface MpOAuthState {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

type SupabaseReader = Pick<SupabaseClient<Database>, "from" | "rpc">;

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export function publicSupabase() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? SUPABASE_URL_FALLBACK;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    SUPABASE_PUBLISHABLE_KEY_FALLBACK;

  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

async function readPrivatePixConfig(supabase: SupabaseReader): Promise<PixConfig | null> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "pix_config")
    .maybeSingle();

  if (error) return null;
  return ((data?.value ?? {}) as PixConfig) || {};
}

async function readPublicPixConfig(supabase: SupabaseReader): Promise<PixConfig | null> {
  const { data, error } = await supabase.rpc("get_public_setting", { _key: "pix_config" });
  if (error) return null;
  return ((data ?? {}) as PixConfig) || {};
}

export async function loadPixConfig(options: { supabase?: SupabaseReader; includeSecret?: boolean } = {}): Promise<PixConfig> {
  if (options.includeSecret && options.supabase) {
    const privateCfg = await readPrivatePixConfig(options.supabase);
    if (privateCfg) return privateCfg;
  }

  if (options.includeSecret && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const privateCfg = await readPrivatePixConfig(supabaseAdmin);
      if (privateCfg) return privateCfg;
    } catch (err) {
      console.warn("[PIX] leitura privada das configurações falhou", err instanceof Error ? err.message : String(err));
    }
  }

  const publicCfg = await readPublicPixConfig(options.supabase ?? publicSupabase());
  return publicCfg ?? {};
}

export async function getRequestHostFallback(defaultHost = "forlink.app") {
  try {
    const mod = await import("@tanstack/react-start/server");
    return mod.getRequestHost() || defaultHost;
  } catch {
    return defaultHost;
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

export async function createMpOAuthState(): Promise<MpOAuthState> {
  const stateBytes = new Uint8Array(32);
  const verifierBytes = new Uint8Array(64);
  crypto.getRandomValues(stateBytes);
  crypto.getRandomValues(verifierBytes);

  const state = base64Url(stateBytes);
  const codeVerifier = base64Url(verifierBytes);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  return { state, codeVerifier, codeChallenge };
}