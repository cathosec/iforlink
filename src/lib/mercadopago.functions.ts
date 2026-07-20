import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MpCfg = {
  enabled?: boolean;
  mode?: string;
  pix_expiration_minutes?: number;
  access_token_test?: string;
  access_token_live?: string;
  webhook_secret?: string;
  prices?: { month_cents?: number; quarter_cents?: number; year_cents?: number };
};

/** Resolve MP access token: settings (by mode) → env fallback. */
function resolveToken(cfg: MpCfg): string {
  const fromCfg = cfg.mode === "live" ? cfg.access_token_live : cfg.access_token_test;
  const token = (fromCfg && fromCfg.trim()) || process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  return token.trim();
}

async function loadMercadoPagoConfig(supabase?: { rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }> }): Promise<MpCfg> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: setting, error } = await supabaseAdmin
        .from("platform_settings")
        .select("value")
        .eq("key", "mercadopago")
        .maybeSingle();
      if (!error && setting?.value) return setting.value as MpCfg;
      if (error) console.warn("[MP] leitura admin das configurações falhou:", error.message);
    } catch (err) {
      console.warn("[MP] service role indisponível; usando configuração pública + token de ambiente", err instanceof Error ? err.message : String(err));
    }
  }

  if (supabase) {
    const { data, error } = await supabase.rpc("get_pricing_public");
    if (!error && data) return data as MpCfg;
    if (error) console.warn("[MP] leitura pública dos planos falhou:", error.message);
  }

  return {};
}

type Interval = "month" | "quarter" | "year";

const INTERVAL_LABEL: Record<Interval, string> = {
  month: "mensal",
  quarter: "trimestral",
  year: "anual",
};

const INTERVAL_DAYS: Record<Interval, number> = {
  month: 30,
  quarter: 90,
  year: 365,
};

/**
 * Cria uma cobrança PIX no Mercado Pago para assinatura ForLink Pro.
 */
export const createPixSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { interval: Interval }) => {
    if (!["month", "quarter", "year"].includes(data.interval)) {
      throw new Error("Intervalo inválido");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const cfg = await loadMercadoPagoConfig(context.supabase);
    if (!cfg.enabled) throw new Error("Pagamentos Mercado Pago desativados pelo administrador.");

    const token = resolveToken(cfg);
    if (!token) throw new Error("Mercado Pago não configurado (nenhum access token definido).");

    const priceKey = data.interval === "month" ? "month_cents" : data.interval === "quarter" ? "quarter_cents" : "year_cents";
    const amountCents = cfg.prices?.[priceKey] ?? 0;
    if (amountCents <= 0) throw new Error("Preço não configurado para esse intervalo.");

    // Fetch profile/email with the authenticated user client, not the service role.
    const claims = context.claims as Record<string, unknown>;
    let email = typeof claims.email === "string" ? claims.email : "";
    let displayName = typeof claims.user_metadata === "object" && claims.user_metadata
      ? ((claims.user_metadata as Record<string, unknown>).display_name as string | undefined)
      : undefined;

    try {
      const { data: authUser } = await context.supabase.auth.getUser(context.accessToken);
      email = authUser.user?.email ?? email;
      displayName = (authUser.user?.user_metadata?.display_name as string | undefined) ?? displayName;
    } catch { /* noop */ }

    try {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("display_name")
        .eq("id", context.userId)
        .maybeSingle();
      displayName = profile?.display_name ?? displayName;
    } catch { /* noop */ }

    if (!email) throw new Error("Não foi possível identificar o e-mail da sua conta para gerar o PIX.");
    displayName = displayName ?? email.split("@")[0];

    const expMin = cfg.pix_expiration_minutes ?? 30;
    const expiresAt = new Date(Date.now() + expMin * 60_000);

    // Derive webhook URL from request host
    let host = "";
    try {
      const mod = await import("@tanstack/react-start/server");
      host = mod.getRequestHost();
    } catch { /* noop */ }
    const notificationUrl = host ? `https://${host}/api/public/webhooks/mercadopago` : undefined;

    // Create pending pix_payments row
    const { data: pix, error: pixErr } = await context.supabase
      .from("pix_payments")
      .insert({
        user_id: context.userId,
        plan: "pro",
        interval: data.interval,
        amount_cents: amountCents,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        payer_email: email,
      })
      .select()
      .single();
    if (pixErr || !pix) throw new Error(pixErr?.message ?? "Falha ao registrar pagamento");

    const idempotencyKey = pix.id;
    const body = {
      transaction_amount: amountCents / 100,
      description: `ForLink Pro ${INTERVAL_LABEL[data.interval]}`,
      payment_method_id: "pix",
      external_reference: pix.id,
      date_of_expiration: expiresAt.toISOString().replace("Z", "-00:00"),
      notification_url: notificationUrl,
      payer: {
        email,
        first_name: displayName.split(" ")[0] || "Usuario",
        last_name: displayName.split(" ").slice(1).join(" ") || "ForLink",
      },
    };

    const resp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      await context.supabase.from("pix_payments").update({ status: "rejected", raw: json }).eq("id", pix.id);
      console.error("[MP] create payment failed", resp.status, json);
      throw new Error(json?.message ?? "Falha ao criar PIX no Mercado Pago");
    }

    const txn = json?.point_of_interaction?.transaction_data ?? {};
    await context.supabase.from("pix_payments").update({
      mp_payment_id: String(json.id),
      qr_code: txn.qr_code ?? null,
      qr_code_base64: txn.qr_code_base64 ?? null,
      ticket_url: txn.ticket_url ?? null,
      status: json.status ?? "pending",
      raw: json,
    }).eq("id", pix.id);

    return {
      id: pix.id,
      mp_payment_id: String(json.id),
      qr_code: txn.qr_code as string | null,
      qr_code_base64: txn.qr_code_base64 as string | null,
      ticket_url: txn.ticket_url as string | null,
      amount_cents: amountCents,
      interval: data.interval,
      expires_at: expiresAt.toISOString(),
    };
  });

/**
 * Consulta o status de um pagamento PIX (para polling na página de checkout).
 */
export const getPixStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("pix_payments")
      .select("*")
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row) throw new Error("Pagamento não encontrado");

    // Se ainda pendente, consulta Mercado Pago
    if (row.status === "pending" && row.mp_payment_id) {
      const cfg = await loadMercadoPagoConfig(context.supabase);
      const token = resolveToken(cfg);
      if (token) {
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${row.mp_payment_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json.status && json.status !== row.status) {
            if (json.status === "approved") {
              if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                await applyPaymentUpdate(row.id, json);
                row.status = json.status;
                row.paid_at = new Date().toISOString();
              } else {
                console.error("[MP] pagamento aprovado, mas SUPABASE_SERVICE_ROLE_KEY não está configurada para ativar a assinatura automaticamente.");
              }
            } else {
              await context.supabase.from("pix_payments").update({ status: json.status, raw: json }).eq("id", row.id);
              row.status = json.status;
            }
          }
        }
      }
    }

    return {
      id: row.id,
      status: row.status,
      paid_at: row.paid_at,
      interval: row.interval as Interval,
      amount_cents: row.amount_cents,
    };
  });

// Shared: apply MP payment payload to DB (creates/updates subscription on approval).
export async function applyPaymentUpdate(pixId: string, mpPayment: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const status = String(mpPayment.status ?? "pending");
  const { data: pix } = await supabaseAdmin
    .from("pix_payments")
    .select("*")
    .eq("id", pixId)
    .maybeSingle();
  if (!pix) return;

  const patch: Record<string, unknown> = { status, raw: mpPayment };
  if (status === "approved" && !pix.paid_at) {
    patch.paid_at = new Date().toISOString();
    const start = new Date();
    const end = new Date(start.getTime() + INTERVAL_DAYS[pix.interval as Interval] * 86400_000);

    // Cancel prior active subs, create new
    await supabaseAdmin.from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("user_id", pix.user_id).eq("status", "active");

    const { data: sub } = await supabaseAdmin.from("subscriptions").insert({
      user_id: pix.user_id,
      plan: "pro",
      status: "active",
      gateway: "mercadopago",
      external_id: pix.mp_payment_id,
      amount_cents: pix.amount_cents,
      currency: "BRL",
      interval: pix.interval,
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
    }).select().single();
    if (sub) patch.subscription_id = sub.id;

    // Promote role to Pro
    await supabaseAdmin.from("user_roles").delete().eq("user_id", pix.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: pix.user_id, role: "pro" });

    // Fire confirmation e-mails (best-effort — never break payment flow)
    try {
      const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(pix.user_id);
      const email = userRow?.user?.email;
      if (email) {
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("display_name").eq("id", pix.user_id).maybeSingle();
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("payment-confirmed", email, {
          idempotencyKey: `pay-confirmed-${pix.id}`,
          templateData: {
            displayName: profile?.display_name ?? undefined,
            amountCents: pix.amount_cents,
            interval: pix.interval,
            paidAt: patch.paid_at,
            paymentId: pix.mp_payment_id ?? undefined,
          },
        });
        await sendTemplateEmail("pro-activated", email, {
          idempotencyKey: `pro-activated-${pix.id}`,
          templateData: {
            displayName: profile?.display_name ?? undefined,
            interval: pix.interval,
            periodEnd: end.toISOString(),
          },
        });
      }
    } catch (err) {
      console.error("[applyPaymentUpdate] email send failed", err);
    }
  }
  await supabaseAdmin.from("pix_payments").update(patch as never).eq("id", pixId);
}

/** Admin: test connection using the token stored in platform_settings (by current mode). */
export const testMercadoPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Ensure caller is admin (RLS-scoped client, no service role needed)
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Acesso restrito a admins.");

    // platform_settings is readable by admins via RLS
    const { data: setting, error: settingErr } = await context.supabase
      .from("platform_settings").select("value").eq("key", "mercadopago").maybeSingle();
    if (settingErr) return { ok: false, message: `Erro lendo configurações: ${settingErr.message}` };
    const cfg = (setting?.value ?? {}) as MpCfg;
    const token = resolveToken(cfg);
    if (!token) return { ok: false, message: "Nenhum access token configurado (test/live). Cole o Access Token no painel e salve antes de testar." };

    const expectedPrefix = cfg.mode === "live" ? "APP_USR-" : "TEST-";
    const prefixOk = token.startsWith(expectedPrefix);

    const r = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await r.json().catch(() => ({}))) as { id?: number; nickname?: string; email?: string; site_id?: string; message?: string };
    if (!r.ok) return { ok: false, message: json?.message ?? `Falha (${r.status})`, prefixOk };
    return {
      ok: true,
      prefixOk,
      mode: cfg.mode ?? "test",
      account: { id: json.id, nickname: json.nickname, email: json.email, site_id: json.site_id },
    };
  });
