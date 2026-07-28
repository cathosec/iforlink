import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createMpOAuthState, getRequestHostFallback, loadPixConfig, MP_AUTH_URL, MP_PAY_URL, MP_TOKEN_URL, publicSupabase } from "./pix.server";

/** Gera URL OAuth do Mercado Pago para o usuário conectar a conta dele. */
export const startMpOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cfg = await loadPixConfig({ supabase: context.supabase });
    const clientId = (cfg.oauth_client_id ?? "").trim();
    const hasClientSecret = !!cfg.has_oauth_client_secret || !!(cfg.oauth_client_secret ?? "").trim();
    if (!clientId) {
      throw new Error("OAuth do Mercado Pago não configurado pelo admin (Client ID ausente).");
    }
    if (!hasClientSecret) {
      throw new Error("OAuth do Mercado Pago não configurado pelo admin (Client Secret ausente).");
    }
    const host = await getRequestHostFallback();
    const redirectUri = `https://${host}/api/public/oauth/mercadopago/callback`;
    const oauth = await createMpOAuthState();

    const { error: stateErr } = await context.supabase.from("oauth_states").insert({
      state: oauth.state,
      user_id: context.userId,
      provider: "mercadopago",
      code_verifier: oauth.codeVerifier,
      redirect_uri: redirectUri,
    } as never);
    if (stateErr) throw new Error(`Falha ao preparar conexão Mercado Pago: ${stateErr.message}`);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      platform_id: "mp",
      redirect_uri: redirectUri,
      state: oauth.state,
      code_challenge: oauth.codeChallenge,
      code_challenge_method: "S256",
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

/** Admin: testa se as credenciais OAuth do Mercado Pago estão válidas. */
export const testMpIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores");
    const cfg = await loadPixConfig({ supabase: context.supabase, includeSecret: true });
    const clientId = (cfg.oauth_client_id ?? "").trim();
    const clientSecret = (cfg.oauth_client_secret ?? "").trim();
    if (!clientId || !clientSecret) {
      return { ok: false as const, message: "Client ID e Client Secret ainda não configurados." };
    }
    const t0 = Date.now();
    try {
      const res = await fetch(MP_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      const latency = Date.now() - t0;
      const body: Record<string, unknown> = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false as const,
          status: res.status,
          latency_ms: latency,
          message: String(body?.message ?? body?.error ?? "Credenciais rejeitadas pelo Mercado Pago"),
        };
      }
      return {
        ok: true as const,
        status: res.status,
        latency_ms: latency,
        scope: String(body?.scope ?? ""),
        expires_in: Number(body?.expires_in ?? 0),
        message: "Conexão com o Mercado Pago validada com sucesso.",
      };
    } catch (e) {
      return {
        ok: false as const,
        latency_ms: Date.now() - t0,
        message: e instanceof Error ? e.message : "Erro de rede ao consultar Mercado Pago",
      };
    }
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

/** Público: dados seguros para inicializar o SDK Mercado Pago no checkout do apoiador. */
export const getCampaignPaymentContext = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => {
    if (!data.slug) throw new Error("slug obrigatório");
    return data;
  })
  .handler(async ({ data }) => {
    const supabase = publicSupabase();
    const { data: rows, error } = await supabase.rpc(
      "get_pix_campaign_public_data" as never,
      { _slug: data.slug } as never,
    );
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error("Campanha não encontrada");
    const r = row as {
      campaign_id: string;
      accepts_card: boolean;
      public_key: string | null;
      live_mode: boolean;
      fee_pct?: number | string;
      min_fee_cents?: number | string;
      creator_role?: string;
    };
    // Fase 3: comissão vem do plano do criador (Free/Pro) via RPC.
    // Fallback para pix_config global se o RPC não retornar (compat).
    let feePct = Number(r.fee_pct ?? NaN);
    let minFeeCents = Number(r.min_fee_cents ?? NaN);
    if (!Number.isFinite(feePct) || !Number.isFinite(minFeeCents)) {
      const cfg = await loadPixConfig();
      feePct = Number(cfg.fee_percent ?? 0);
      minFeeCents = Math.max(0, Number(cfg.min_fee_cents ?? 0));
    }
    return {
      campaign_id: r.campaign_id,
      accepts_card: r.accepts_card,
      public_key: r.public_key,
      live_mode: r.live_mode,
      fee_percent: feePct,
      min_fee_cents: Math.max(0, minFeeCents),
      creator_role: (r.creator_role ?? "free") as "free" | "pro" | "admin",
      mp_fee_pix_percent: 0.99,
      mp_fee_card_percent: 4.98,
      mp_fee_card_fixed_cents: 0,
    };
  });

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

    const { data: tokRows, error: tokErr } = await supabase.rpc(
      "get_pix_campaign_owner_token" as never,
      { _campaign_id: camp.id } as never,
    );
    if (tokErr) throw new Error(`Falha ao localizar conta MP do criador: ${tokErr.message}`);
    const acct = Array.isArray(tokRows)
      ? (tokRows[0] as { access_token?: string; fee_pct?: number | string; min_fee_cents?: number | string } | undefined)
      : undefined;
    if (!acct?.access_token) throw new Error("O criador da campanha ainda não conectou o Mercado Pago.");

    // Fase 3: usa taxa do plano do criador; fallback para cfg global.
    const ownerFeePct = Number.isFinite(Number(acct.fee_pct))
      ? Number(acct.fee_pct)
      : Number(cfg.fee_percent ?? 0);
    const ownerMinFee = Number.isFinite(Number(acct.min_fee_cents))
      ? Math.max(0, Number(acct.min_fee_cents))
      : Math.max(0, Number(cfg.min_fee_cents ?? 0));

    const { computeCampaignFees, MP_DEFAULT_FEES } = await import("@/lib/payments/fees");
    const fees = computeCampaignFees({
      baseCents: data.amount_cents,
      feePct: ownerFeePct,
      minFeeCents: ownerMinFee,
      mpPct: MP_DEFAULT_FEES.pixPct,
      passToSupporter: !!camp.pass_fee_to_supporter,
    });
    const feeCents = fees.feeForLink;
    const charged = fees.total;
    const net = fees.netCreator;
    if (net < 0) throw new Error("Configuração de taxa inválida");

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

    const host = await getRequestHostFallback("");
    const notificationUrl = host ? `https://${host}/api/public/webhooks/mercadopago` : undefined;

    const body: Record<string, unknown> = {
      transaction_amount: charged / 100,
      description: `Apoio: ${camp.title}`,
      payment_method_id: "pix",
      external_reference: String(contribId),
      notification_url: notificationUrl,
      payer: {
        email: data.supporter_email,
        first_name: (data.supporter_name ?? "Apoiador").split(" ")[0] || "Apoiador",
        last_name: (data.supporter_name ?? "").split(" ").slice(1).join(" ") || "ForLink",
      },
    };
    if (feeCents > 0) body.application_fee = feeCents / 100;

    const doPost = (payload: Record<string, unknown>) =>
      fetch(MP_PAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${acct.access_token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": String(contribId),
        },
        body: JSON.stringify(payload),
      });

    let resp = await doPost(body);
    let json: Record<string, unknown> = await resp.json().catch(() => ({}));
    const feeRejected = !resp.ok && "application_fee" in body && (
      /application_fee/i.test(String(json?.message ?? "")) ||
      (Array.isArray((json as { cause?: unknown }).cause) &&
        ((json as { cause?: Array<{ description?: string; code?: string | number }> }).cause ?? [])
          .some((c) => /application_fee/i.test(String(c?.description ?? "")) || String(c?.code ?? "") === "2107"))
    );
    if (feeRejected) {
      console.warn("[PIX] retry without application_fee:", json?.message);
      const { application_fee: _omit, ...rest } = body as Record<string, unknown>;
      resp = await doPost(rest);
      json = await resp.json().catch(() => ({}));
    }
    if (!resp.ok) {
      console.error("[PIX] MP payment failed", resp.status, json);
      throw new Error((json as { message?: string })?.message ?? "Falha ao gerar cobrança no Mercado Pago");
    }
    const mpJson = json as { id?: string | number; status?: string; point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } } };
    const txn = mpJson.point_of_interaction?.transaction_data ?? {};
    await supabase.rpc("attach_pix_contribution_mp", {
      _contribution_id: String(contribId),
      _mp_payment_id: String(mpJson.id ?? ""),
      _qr_code: txn.qr_code ?? null,
      _qr_code_base64: txn.qr_code_base64 ?? null,
      _ticket_url: txn.ticket_url ?? null,
      _status: mpJson.status ?? "pending",
      _raw: json,
    } as never);

    return {
      id: String(contribId),
      status: String(mpJson.status ?? "pending"),
      qr_code: txn.qr_code as string | null,
      qr_code_base64: txn.qr_code_base64 as string | null,
      ticket_url: txn.ticket_url as string | null,
      amount_cents: charged,
      fee_cents: feeCents,
    };
  });

/**
 * Público: processa pagamento com cartão de crédito/débito ou carteira Mercado Pago.
 * O token é tokenizado no client via Payment Brick (PCI-DSS) — nunca recebemos PAN.
 */
interface ProcessCardInput {
  campaignSlug: string;
  amount_cents: number;
  supporter_name?: string;
  supporter_email: string;
  message?: string;
  is_anonymous?: boolean;
  brick: {
    token?: string;
    issuer_id?: string | number;
    payment_method_id: string;
    payment_type_id?: string;
    installments?: number;
    payer?: {
      email?: string;
      identification?: { type?: string; number?: string };
    };
  };
}

export const processCardPayment = createServerFn({ method: "POST" })
  .inputValidator((data: ProcessCardInput) => {
    if (!data.campaignSlug) throw new Error("Campanha inválida");
    if (!data.supporter_email?.includes("@")) throw new Error("E-mail obrigatório");
    if (!Number.isFinite(data.amount_cents) || data.amount_cents < 100) throw new Error("Valor mínimo R$ 1,00");
    if (data.amount_cents > 5_000_000) throw new Error("Valor acima do limite");
    if (!data.brick?.payment_method_id) throw new Error("Método de pagamento inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const supabase = publicSupabase();

    const { data: camp, error: campErr } = await supabase
      .from("pix_campaigns")
      .select("id,user_id,title,min_cents,accepts_card,pass_fee_to_supporter,is_active")
      .eq("slug", data.campaignSlug)
      .maybeSingle();
    if (campErr || !camp || !camp.is_active) throw new Error("Campanha indisponível");
    if (!camp.accepts_card) throw new Error("Cartão/carteira desabilitado nessa campanha");
    if (data.amount_cents < (camp.min_cents ?? 100)) {
      throw new Error(`Valor mínimo desta campanha: R$ ${((camp.min_cents ?? 100) / 100).toFixed(2)}`);
    }

    const cfg = await loadPixConfig();
    if (!cfg.enabled) throw new Error("Pagamentos desativados no momento.");
    const { computeCampaignFees, MP_DEFAULT_FEES } = await import("@/lib/payments/fees");
    const fees = computeCampaignFees({
      baseCents: data.amount_cents,
      feePct: Number(cfg.fee_percent ?? 0),
      minFeeCents: Math.max(0, Number(cfg.min_fee_cents ?? 0)),
      mpPct: MP_DEFAULT_FEES.cardPct,
      mpFixedCents: MP_DEFAULT_FEES.cardFixedCents,
      passToSupporter: !!camp.pass_fee_to_supporter,
    });
    const feeCents = fees.feeForLink;
    const charged = fees.total;
    const net = fees.netCreator;
    if (net < 0) throw new Error("Configuração de taxa inválida");



    const { data: tokRows, error: tokErr } = await supabase.rpc(
      "get_pix_campaign_owner_token" as never,
      { _campaign_id: camp.id } as never,
    );
    if (tokErr) throw new Error(`Falha ao localizar conta MP do criador: ${tokErr.message}`);
    const acct = Array.isArray(tokRows) ? (tokRows[0] as { access_token?: string } | undefined) : undefined;
    if (!acct?.access_token) throw new Error("O criador da campanha ainda não conectou o Mercado Pago.");

    const { data: contribId, error: rpcErr } = await supabase.rpc("create_pending_pix_contribution", {
      _campaign_id: camp.id,
      _supporter_name: data.supporter_name ?? null,
      _supporter_email: data.supporter_email,
      _message: data.message ?? null,
      _is_anonymous: !!data.is_anonymous,
      _amount_cents: charged,
      _net_cents: net,
      _fee_cents: feeCents,
      _method: data.brick.payment_method_id,
    } as never);
    if (rpcErr || !contribId) throw new Error(rpcErr?.message ?? "Falha ao registrar contribuição");

    const host = await getRequestHostFallback("");
    const notificationUrl = host ? `https://${host}/api/public/webhooks/mercadopago` : undefined;

    const payer: Record<string, unknown> = {
      email: data.brick.payer?.email ?? data.supporter_email,
    };
    if (data.brick.payer?.identification?.number) {
      payer.identification = {
        type: data.brick.payer.identification.type ?? "CPF",
        number: data.brick.payer.identification.number,
      };
    }
    if (data.supporter_name) {
      payer.first_name = data.supporter_name.split(" ")[0];
      payer.last_name = data.supporter_name.split(" ").slice(1).join(" ") || "ForLink";
    }

    const body: Record<string, unknown> = {
      transaction_amount: charged / 100,
      description: `Apoio: ${camp.title}`,
      external_reference: String(contribId),
      notification_url: notificationUrl,
      statement_descriptor: "FORLINK",
      payment_method_id: data.brick.payment_method_id,
      payer,
    };
    if (feeCents > 0) body.application_fee = feeCents / 100;
    if (data.brick.token) body.token = data.brick.token;
    if (data.brick.issuer_id) body.issuer_id = data.brick.issuer_id;
    if (data.brick.installments) body.installments = data.brick.installments;
    if (data.brick.payment_type_id) body.payment_type_id = data.brick.payment_type_id;

    const doPost = (payload: Record<string, unknown>) =>
      fetch(MP_PAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${acct.access_token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": String(contribId),
        },
        body: JSON.stringify(payload),
      });

    let resp = await doPost(body);
    let json: Record<string, unknown> = await resp.json().catch(() => ({}));
    const feeRejected = !resp.ok && "application_fee" in body && (
      /application_fee/i.test(String((json as { message?: string })?.message ?? "")) ||
      (Array.isArray((json as { cause?: unknown }).cause) &&
        ((json as { cause?: Array<{ description?: string; code?: string | number }> }).cause ?? [])
          .some((c) => /application_fee/i.test(String(c?.description ?? "")) || String(c?.code ?? "") === "2107"))
    );
    if (feeRejected) {
      console.warn("[CARD] retry without application_fee:", (json as { message?: string })?.message);
      const { application_fee: _omit, ...rest } = body as Record<string, unknown>;
      resp = await doPost(rest);
      json = await resp.json().catch(() => ({}));
    }
    if (!resp.ok) {
      console.error("[CARD] MP payment failed", resp.status, json);
      const jErr = json as { message?: string; cause?: Array<{ description?: string }> };
      const msg = jErr?.message || (Array.isArray(jErr?.cause) && jErr.cause[0]?.description) || "Falha ao processar pagamento";
      throw new Error(String(msg));
    }

    const cardJson = json as { id?: string | number; status?: string; status_detail?: string; transaction_details?: { external_resource_url?: string } };
    await supabase.rpc("attach_pix_contribution_mp", {
      _contribution_id: String(contribId),
      _mp_payment_id: String(cardJson.id ?? ""),
      _qr_code: null,
      _qr_code_base64: null,
      _ticket_url: cardJson.transaction_details?.external_resource_url ?? null,
      _status: cardJson.status ?? "pending",
      _raw: json,
    } as never);

    return {
      id: String(contribId),
      status: String(cardJson.status ?? "pending"),
      status_detail: String(cardJson.status_detail ?? ""),
      amount_cents: charged,
      fee_cents: feeCents,
    };
  });

/** Público: consulta status para polling. */
export const getContributionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = publicSupabase();
    const { data: rows, error } = await supabase.rpc(
      "get_pix_contribution_status" as never,
      { _id: data.id } as never,
    );
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error("Contribuição não encontrada");
    return row as { id: string; status: string; approved_at: string | null; amount_cents: number; badge_key: string | null };
  });
