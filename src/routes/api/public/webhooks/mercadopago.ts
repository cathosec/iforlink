import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type MpPaymentPayload = {
  id?: string | number;
  status?: string;
  external_reference?: string;
  payment_method_id?: string;
};

type ResolvedContribution = {
  contribution_id: string;
  campaign_id: string;
  access_token: string;
  live_mode: boolean;
};

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabasePublicClient() {
  const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase não configurado no servidor do webhook.");
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: { fetch: createSupabaseFetch(supabaseKey) },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function extractPaymentInfo(request: Request, rawBody: string) {
  const url = new URL(request.url);
  let payload: { type?: string; action?: string; data?: { id?: string } } = {};

  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    // Mercado Pago sometimes sends useful query params even when the body is not JSON.
  }

  const paymentId =
    payload?.data?.id ??
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    "";
  const type = payload?.type ?? payload?.action ?? url.searchParams.get("type") ?? "";

  return { paymentId: String(paymentId), type: String(type), url };
}

async function fetchMercadoPagoPayment(paymentId: string, token: string) {
  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = (await resp.json().catch(() => ({}))) as MpPaymentPayload & Record<string, unknown>;
  return { ok: resp.ok, status: resp.status, body };
}

async function resolveCampaignOwnerToken(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  paymentId: string,
) {
  const resolved = await supabase.rpc(
    "resolve_pix_contribution_by_mp" as never,
    { _mp_payment_id: paymentId } as never,
  );

  const direct = Array.isArray(resolved.data)
    ? (resolved.data[0] as ResolvedContribution | undefined)
    : undefined;

  if (direct?.access_token) return direct.access_token;

  // Fallback for rare cases where the payment exists in Mercado Pago before the
  // local contribution row was updated with mp_payment_id. We fetch the source of
  // truth from Mercado Pago and only apply it if its external_reference matches a
  // known ForLink contribution/payment later in the handler.
  const listed = await supabase.rpc("list_mp_account_tokens" as never);
  const tokens = Array.isArray(listed.data) ? (listed.data as { access_token: string }[]) : [];
  for (const item of tokens) {
    if (!item?.access_token) continue;
    const probe = await fetchMercadoPagoPayment(paymentId, item.access_token);
    if (probe.ok) return item.access_token;
  }

  return null;
}

async function applySubscriptionWebhook(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  externalRef: string,
  mp: MpPaymentPayload & Record<string, unknown>,
  signature: string,
  requestId: string,
  paymentId: string,
) {
  const { error } = await supabase.rpc(
    "apply_mercadopago_payment_update" as never,
    {
      _pix_id: externalRef,
      _mp_payment: mp,
      _signature: signature,
      _request_id: requestId,
      _payment_id: paymentId,
    } as never,
  );

  if (error) {
    console.warn("[MP webhook] subscription apply skipped/failed", error.message);
    return false;
  }

  return true;
}

async function applyCampaignWebhook(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  externalRef: string,
  mp: MpPaymentPayload & Record<string, unknown>,
) {
  const { error } = await supabase.rpc(
    "apply_pix_contribution_update" as never,
    { _contribution_id: externalRef, _mp_payment: mp } as never,
  );

  if (error) {
    console.warn("[MP webhook] campaign apply skipped/failed", error.message);
    return false;
  }

  return true;
}

async function sendSubscriptionEmails(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  externalRef: string,
  paymentId: string,
) {
  try {
    const { data: ctxRow } = await supabase.rpc(
      "get_pix_payment_context" as never,
      { _pix_id: externalRef } as never,
    );
    const row = (Array.isArray(ctxRow) ? ctxRow[0] : ctxRow) as
      | {
          email?: string | null;
          display_name?: string | null;
          username?: string | null;
          amount_cents?: number | null;
          billing_interval?: string | null;
          paid_at?: string | null;
          status?: string | null;
        }
      | null;

    if (!row || row.status !== "approved" || !row.email) return;

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const displayName = row.display_name ?? undefined;
    const username = row.username ?? undefined;
    const paidAt = row.paid_at ?? new Date().toISOString();
    const amountCents = Number(row.amount_cents ?? 0);
    const interval = String(row.billing_interval ?? "month");

    await sendTemplateEmail("payment-confirmed", row.email, {
      idempotencyKey: `pay-confirmed-${externalRef}`,
      settingsClient: supabase,
      templateData: { displayName, amountCents, interval, paidAt, paymentId },
    }).catch((e) => console.error("[MP webhook] payment-confirmed", e));

    await sendTemplateEmail("pro-activated", row.email, {
      idempotencyKey: `pro-activated-${externalRef}`,
      settingsClient: supabase,
      templateData: { displayName, interval, periodEnd: undefined },
    }).catch((e) => console.error("[MP webhook] pro-activated", e));

    const { data: adminEmail } = await supabase.rpc("get_admin_notify_email" as never);
    const adminTo = typeof (adminEmail as unknown) === "string" ? (adminEmail as unknown as string).trim() : "";
    if (adminTo) {
      await sendTemplateEmail("admin-new-subscriber", adminTo, {
        idempotencyKey: `admin-new-sub-${externalRef}`,
        settingsClient: supabase,
        templateData: { email: row.email, displayName, username, amountCents, interval, paidAt, paymentId },
      }).catch((e) => console.error("[MP webhook] admin-new-sub", e));
    }
  } catch (mailErr) {
    console.error("[MP webhook] email dispatch failed", mailErr);
  }
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true, provider: "mercadopago" });
      },
      POST: async ({ request }) => {
        const { logEvent } = await import("@/lib/observability/log.server");
        try {
          const rawBody = await request.text();
          const signature = request.headers.get("x-signature") ?? "";
          const requestId = request.headers.get("x-request-id") ?? "";
          const { paymentId, type, url } = extractPaymentInfo(request, rawBody);

          if (!paymentId || !(type.includes("payment") || url.searchParams.get("type") === "payment")) {
            return new Response("ignored", { status: 200 });
          }

          await logEvent("webhook.received", { paymentId, type, requestId }, {
            targetType: "mp_payment",
            targetId: paymentId,
          });

          const supabase = createSupabasePublicClient();

          // Idempotência: dedup por (provider, event_id).
          {
            const eventId = `${paymentId}:${requestId || "no-req"}`;
            let payloadJson: Record<string, unknown> = {};
            try { payloadJson = rawBody ? JSON.parse(rawBody) : {}; } catch { /* noop */ }
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const { error: dupErr } = await supabaseAdmin
                .from("webhook_events")
                .insert({
                  provider: "mercadopago",
                  event_id: eventId,
                  event_type: type,
                  payload: payloadJson as never,
                  status: "received",
                });
              if (dupErr) {
                const msg = dupErr.message ?? "";
                if (/duplicate|unique|23505/i.test(msg)) {
                  await logEvent("webhook.duplicate", { paymentId, eventId }, {
                    level: "info", targetType: "mp_payment", targetId: paymentId,
                  });
                  return new Response("duplicate", { status: 200 });
                }
                console.warn("[MP webhook] dedup insert failed (proceeding)", msg);
              }
            } catch (e) {
              console.warn("[MP webhook] dedup unavailable (proceeding)", e);
            }
          }
          const { data: platformToken, error: tokenError } = await supabase.rpc(
            "get_mercadopago_webhook_access_token" as never,
            {
              _signature: signature,
              _request_id: requestId,
              _payment_id: paymentId,
            } as never,
          );

          if (tokenError) {
            console.warn("[MP webhook] signature/platform token unavailable", tokenError.message);
            await logEvent("webhook.token_unavailable", { paymentId, error: tokenError.message }, {
              level: "warn", targetType: "mp_payment", targetId: paymentId,
            });
          }

          let mpResult = platformToken ? await fetchMercadoPagoPayment(paymentId, String(platformToken)) : null;
          if (!mpResult?.ok) {
            const ownerToken = await resolveCampaignOwnerToken(supabase, paymentId);
            if (ownerToken) mpResult = await fetchMercadoPagoPayment(paymentId, ownerToken);
          }

          if (!mpResult?.ok) {
            console.error("[MP webhook] fetch payment failed", mpResult?.status ?? "no-token");
            await logEvent("webhook.mp_fetch_failed", { paymentId, status: mpResult?.status ?? null }, {
              level: "error", targetType: "mp_payment", targetId: paymentId,
            });
            return new Response("mp fetch failed", { status: 200 });
          }

          const mp = mpResult.body;
          const externalRef = typeof mp.external_reference === "string" ? mp.external_reference : "";
          if (!externalRef) return new Response("no external_reference", { status: 200 });

          await applySubscriptionWebhook(supabase, externalRef, mp, signature, requestId, paymentId);
          await applyCampaignWebhook(supabase, externalRef, mp);
          await sendSubscriptionEmails(supabase, externalRef, paymentId);

          await logEvent(
            mp.status === "approved" ? "payment.approved" : "payment.updated",
            { paymentId, externalRef, status: mp.status, amount: mp.transaction_amount ?? null },
            { targetType: "mp_payment", targetId: paymentId },
          );

          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("webhook_events")
              .update({ status: "processed", processed_at: new Date().toISOString() })
              .eq("provider", "mercadopago")
              .eq("event_id", `${paymentId}:${requestId || "no-req"}`);
          } catch { /* noop */ }

          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[MP webhook] unexpected", err);
          await logEvent("webhook.exception", { error: (err as Error)?.message ?? String(err) }, { level: "error" });
          return new Response("error logged", { status: 200 });
        }
      },

    },
  },
});
