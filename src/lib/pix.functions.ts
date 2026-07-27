import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MP_AUTH_URL = "https://auth.mercadopago.com/authorization";
const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
const MP_PAY_URL = "https://api.mercadopago.com/v1/payments";

interface PixConfig {
  enabled?: boolean;
  fee_percent?: number;
  min_fee_cents?: number;
  oauth_client_id?: string;
  oauth_client_secret?: string;
}

function publicSupabase() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  const opaque = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (opaque && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

async function loadPixConfig(): Promise<PixConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("platform_settings").select("value").eq("key", "pix_config").maybeSingle();
  return ((data?.value ?? {}) as PixConfig) || {};
}

/** Gera URL OAuth do Mercado Pago para o usuário conectar a conta dele. */
export const startMpOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cfg = await loadPixConfig();
    if (!cfg.oauth_client_id) {
      throw new Error("OAuth do Mercado Pago não configurado pelo admin (Client ID ausente).");
    }
    // Deriva host do request para redirect_uri
    let host = "";
    try {
      const mod = await import("@tanstack/react-start/server");
      host = mod.getRequestHost();
    } catch { /* noop */ }
    if (!host) host = "forlink.app";
    const redirectUri = `https://${host}/api/public/oauth/mercadopago/callback`;
    const state = context.userId;
    const params = new URLSearchParams({
      client_id: cfg.oauth_client_id,
      response_type: "code",
      platform_id: "mp",
      redirect_uri: redirectUri,
      state,
    });
    return { url: `${MP_AUTH_URL}?${params.toString()}` };
  });

/** Desconecta a conta MP do usuário. */
export const disconnectMp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("mp_accounts").delete().eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Retorna se o usuário conectou Mercado Pago (não expõe tokens). */
export const getMpStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("mp_accounts")
      .select("mp_user_id,live_mode,connected_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { connected: !!data, ...(data ?? {}) };
  });

interface CreateContribInput {
  campaignSlug: string;
  amount_cents: number;
  method: "pix" | "card";
  supporter_name?: string;
  supporter_email: string;
  message?: string;
  is_anonymous?: boolean;
}

/** Público: cria uma contribuição pendente e gera PIX no MP do dono da campanha. */
export const createContribution = createServerFn({ method: "POST" })
  .inputValidator((data: CreateContribInput) => {
    if (!data.campaignSlug) throw new Error("Campanha inválida");
    if (!data.supporter_email?.includes("@")) throw new Error("E-mail obrigatório");
    if (!Number.isFinite(data.amount_cents) || data.amount_cents < 100) {
      throw new Error("Valor mínimo R$ 1,00");
    }
    if (data.amount_cents > 5_000_000) throw new Error("Valor acima do limite");
    if (data.method !== "pix" && data.method !== "card") throw new Error("Método inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const supabase = publicSupabase();

    // Busca campanha
    const { data: camp, error: campErr } = await supabase
      .from("pix_campaigns")
      .select("id,user_id,title,min_cents,accepts_card,pass_fee_to_supporter,is_active")
      .eq("slug", data.campaignSlug)
      .maybeSingle();
    if (campErr || !camp || !camp.is_active) throw new Error("Campanha indisponível");
    if (data.method === "card" && !camp.accepts_card) throw new Error("Cartão desabilitado nessa campanha");
    if (data.amount_cents < (camp.min_cents ?? 100)) {
      throw new Error(`Valor mínimo desta campanha: R$ ${((camp.min_cents ?? 100) / 100).toFixed(2)}`);
    }

    const cfg = await loadPixConfig();
    if (!cfg.enabled) throw new Error("Pagamentos PIX desativados no momento.");
    const feePct = Number(cfg.fee_percent ?? 0);
    const minFee = Math.max(0, Number(cfg.min_fee_cents ?? 0));
    let feeCents = Math.max(minFee, Math.round((data.amount_cents * feePct) / 100));

    // Passa taxa para o apoiador: aumenta o valor cobrado
    let charged = data.amount_cents;
    let net = data.amount_cents - feeCents;
    if (camp.pass_fee_to_supporter) {
      charged = data.amount_cents + feeCents;
      net = data.amount_cents;
    }
    if (net < 0) throw new Error("Configuração de taxa inválida");

    // Busca token do dono (bypass RLS via admin)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: acct } = await supabaseAdmin
      .from("mp_accounts")
      .select("access_token,live_mode,mp_user_id")
      .eq("user_id", camp.user_id)
      .maybeSingle();
    if (!acct?.access_token) throw new Error("O criador da campanha ainda não conectou o Mercado Pago.");

    // Cria linha pendente via RPC (SECURITY DEFINER, contorna RLS)
    const { data: contribId, error: rpcErr } = await supabase.rpc("create_pending_pix_contribution", {
      _campaign_id: camp.id,
      _supporter_name: data.supporter_name ?? null,
      _supporter_email: data.supporter_email,
      _message: data.message ?? null,
      _is_anonymous: !!data.is_anonymous,
      _amount_cents: charged,
      _net_cents: net,
      _fee_cents: feeCents,
      _method: data.method,
    } as never);
    if (rpcErr || !contribId) throw new Error(rpcErr?.message ?? "Falha ao registrar contribuição");

    // Deriva webhook URL
    let host = "";
    try {
      const mod = await import("@tanstack/react-start/server");
      host = mod.getRequestHost();
    } catch { /* noop */ }
    const notificationUrl = host ? `https://${host}/api/public/webhooks/mp-pix` : undefined;

    // Cria pagamento PIX no MP com application_fee (marketplace split)
    const body: Record<string, unknown> = {
      transaction_amount: charged / 100,
      description: `Apoio: ${camp.title}`,
      payment_method_id: "pix",
      external_reference: String(contribId),
      notification_url: notificationUrl,
      application_fee: feeCents / 100,
      payer: {
        email: data.supporter_email,
        first_name: (data.supporter_name ?? "Apoiador").split(" ")[0] || "Apoiador",
        last_name: (data.supporter_name ?? "").split(" ").slice(1).join(" ") || "ForLink",
      },
    };

    const resp = await fetch(MP_PAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${acct.access_token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": String(contribId),
      },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("[PIX] MP payment failed", resp.status, json);
      throw new Error(json?.message ?? "Falha ao gerar cobrança no Mercado Pago");
    }
    const txn = json?.point_of_interaction?.transaction_data ?? {};
    await supabase.rpc("attach_pix_contribution_mp", {
      _contribution_id: String(contribId),
      _mp_payment_id: String(json.id ?? ""),
      _qr_code: txn.qr_code ?? null,
      _qr_code_base64: txn.qr_code_base64 ?? null,
      _ticket_url: txn.ticket_url ?? null,
      _status: json.status ?? "pending",
      _raw: json,
    } as never);

    return {
      id: String(contribId),
      status: String(json.status ?? "pending"),
      qr_code: txn.qr_code as string | null,
      qr_code_base64: txn.qr_code_base64 as string | null,
      ticket_url: txn.ticket_url as string | null,
      amount_cents: charged,
      fee_cents: feeCents,
    };
  });

/** Público: consulta status para polling. */
export const getContributionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("pix_contributions")
      .select("id,status,approved_at,amount_cents,badge_key")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Contribuição não encontrada");
    return row;
  });
