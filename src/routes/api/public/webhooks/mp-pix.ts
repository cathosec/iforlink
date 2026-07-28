import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function getAnon() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const Route = createFileRoute("/api/public/webhooks/mp-pix")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, hook: "mp-pix" }),
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          const url = new URL(request.url);
          let payload: { type?: string; action?: string; data?: { id?: string } } = {};
          try { payload = raw ? JSON.parse(raw) : {}; } catch { /* noop */ }
          const paymentId =
            payload?.data?.id ??
            url.searchParams.get("data.id") ??
            url.searchParams.get("id") ??
            "";
          const type =
            payload?.type ?? payload?.action ?? url.searchParams.get("type") ?? "";
          if (!paymentId || !(String(type).includes("payment") || url.searchParams.get("type") === "payment")) {
            return new Response("ignored", { status: 200 });
          }

          // Idempotência
          const requestId = request.headers.get("x-request-id") ?? "";
          const eventId = `${paymentId}:${requestId || "no-req"}`;
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            let payloadJson: Record<string, unknown> = {};
            try { payloadJson = raw ? JSON.parse(raw) : {}; } catch { /* noop */ }
            const { error: dupErr } = await supabaseAdmin
              .from("webhook_events")
              .insert({
                provider: "mercadopago",
                event_id: eventId,
                event_type: String(type),
                payload: payloadJson as never,
                status: "received",
              });
            if (dupErr && /duplicate|unique|23505/i.test(dupErr.message ?? "")) {
              return new Response("duplicate", { status: 200 });
            }
          } catch { /* noop */ }

          const supabase = getAnon();

          // 1) tenta resolver contribuição pelo mp_payment_id
          type ResolvedRow = { contribution_id: string; campaign_id: string; access_token: string; live_mode: boolean };
          let contribId: string | null = null;
          let ownerToken: string | null = null;

          const resolved = await supabase.rpc(
            "resolve_pix_contribution_by_mp" as never,
            { _mp_payment_id: String(paymentId) } as never,
          );
          const row = Array.isArray(resolved.data) ? (resolved.data[0] as ResolvedRow | undefined) : undefined;
          if (row?.contribution_id) {
            contribId = row.contribution_id;
            ownerToken = row.access_token ?? null;
          }

          // 2) fallback: procura em todas as contas MP e usa external_reference
          if (!contribId || !ownerToken) {
            const listed = await supabase.rpc("list_mp_account_tokens" as never);
            const tokens = Array.isArray(listed.data)
              ? (listed.data as { access_token: string }[])
              : [];
            for (const t of tokens) {
              const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { Authorization: `Bearer ${t.access_token}` },
              });
              if (r.ok) {
                const j = (await r.json()) as { external_reference?: string };
                if (j?.external_reference) {
                  contribId = j.external_reference;
                  ownerToken = t.access_token;
                  break;
                }
              }
            }
          }

          if (!contribId || !ownerToken) {
            return new Response("could not resolve payment", { status: 200 });
          }

          const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${ownerToken}` },
          });
          if (!resp.ok) {
            console.error("[mp-pix webhook] fetch payment failed", resp.status);
            return new Response("mp fetch failed", { status: 502 });
          }
          const mp = await resp.json();

          const { error } = await supabase.rpc(
            "apply_pix_contribution_update" as never,
            { _contribution_id: contribId, _mp_payment: mp } as never,
          );
          if (error) {
            console.error("[mp-pix webhook] apply failed", error.message);
            return new Response("apply failed", { status: 500 });
          }
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("webhook_events")
              .update({ status: "processed", processed_at: new Date().toISOString() })
              .eq("provider", "mercadopago")
              .eq("event_id", eventId);
          } catch { /* noop */ }
          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("[mp-pix webhook] unexpected", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
