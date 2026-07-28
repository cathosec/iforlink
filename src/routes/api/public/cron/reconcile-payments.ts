import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron de reconciliação de pagamentos Mercado Pago.
 *
 * Varre pagamentos PIX (assinaturas e contribuições) que estão `pending`/`in_process`
 * há mais de 5 minutos e consulta a API do Mercado Pago diretamente. Se o pagamento
 * já foi aprovado, aplica a atualização via RPC — mesmo comportamento do webhook.
 *
 * Rodar a cada 10 minutos via pg_cron ou serviço externo. Requer CRON_SECRET.
 */

export const Route = createFileRoute("/api/public/cron/reconcile-payments")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return new Response("cron not configured", { status: 500 });

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  const querySecret = (url.searchParams.get("secret") ?? url.searchParams.get("token") ?? "").trim();
  if (bearer !== expected && headerSecret !== expected && querySecret !== expected) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { logEvent } = await import("@/lib/observability/log.server");

  const olderThan = Number(url.searchParams.get("seconds") ?? 300);
  const limit = Number(url.searchParams.get("limit") ?? 50);

  const stats = {
    subscriptions_checked: 0,
    subscriptions_reconciled: 0,
    contributions_checked: 0,
    contributions_reconciled: 0,
    errors: 0,
  };

  // ---- 1) Assinaturas PIX pendentes ----
  const { data: subs, error: subsErr } = await supabaseAdmin.rpc(
    "list_pending_pix_payments_for_reconcile" as never,
    { _older_than_seconds: olderThan, _limit: limit } as never,
  );
  if (subsErr) console.warn("[reconcile] list subs failed", subsErr.message);

  const platformToken = (process.env.MERCADOPAGO_ACCESS_TOKEN ?? "").trim();

  for (const row of (subs ?? []) as Array<{ pix_id: string; mp_payment_id: string }>) {
    stats.subscriptions_checked += 1;
    try {
      if (!platformToken) continue;
      const resp = await fetch(`https://api.mercadopago.com/v1/payments/${row.mp_payment_id}`, {
        headers: { Authorization: `Bearer ${platformToken}` },
      });
      if (!resp.ok) continue;
      const mp = (await resp.json()) as { status?: string };
      if (mp.status !== "approved") continue;

      const { error } = await supabaseAdmin.rpc(
        "apply_mercadopago_payment_update" as never,
        {
          _pix_id: row.pix_id,
          _mp_payment: mp as never,
          _signature: null,
          _request_id: null,
          _payment_id: row.mp_payment_id,
        } as never,
      );
      if (error) {
        stats.errors += 1;
        console.warn("[reconcile] sub apply failed", error.message);
        continue;
      }
      stats.subscriptions_reconciled += 1;
      await logEvent(
        "payment.reconciled_by_cron",
        { pixId: row.pix_id, mpPaymentId: row.mp_payment_id, kind: "subscription" },
        { targetType: "mp_payment", targetId: row.mp_payment_id },
      );
    } catch (e) {
      stats.errors += 1;
      console.error("[reconcile] sub loop error", e);
    }
  }

  // ---- 2) Contribuições PIX pendentes ----
  const { data: contribs, error: contribsErr } = await supabaseAdmin.rpc(
    "list_pending_pix_contributions_for_reconcile" as never,
    { _older_than_seconds: olderThan, _limit: limit } as never,
  );
  if (contribsErr) console.warn("[reconcile] list contribs failed", contribsErr.message);

  for (const row of (contribs ?? []) as Array<{
    contribution_id: string;
    mp_payment_id: string;
    access_token: string;
  }>) {
    stats.contributions_checked += 1;
    try {
      if (!row.access_token) continue;
      const resp = await fetch(`https://api.mercadopago.com/v1/payments/${row.mp_payment_id}`, {
        headers: { Authorization: `Bearer ${row.access_token}` },
      });
      if (!resp.ok) continue;
      const mp = (await resp.json()) as { status?: string };
      if (mp.status !== "approved") continue;

      const { error } = await supabaseAdmin.rpc(
        "apply_pix_contribution_update" as never,
        { _contribution_id: row.contribution_id, _mp_payment: mp as never } as never,
      );
      if (error) {
        stats.errors += 1;
        console.warn("[reconcile] contrib apply failed", error.message);
        continue;
      }
      stats.contributions_reconciled += 1;
      await logEvent(
        "payment.reconciled_by_cron",
        { contributionId: row.contribution_id, mpPaymentId: row.mp_payment_id, kind: "contribution" },
        { targetType: "mp_payment", targetId: row.mp_payment_id },
      );
    } catch (e) {
      stats.errors += 1;
      console.error("[reconcile] contrib loop error", e);
    }
  }

  return Response.json({ ok: true, ...stats });
}
