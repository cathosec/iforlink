import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/mp-pix")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, hook: "mp-pix" }),
      POST: async ({ request }) => {
        const raw = await request.text();
        const url = new URL(request.url);
        let payload: { type?: string; action?: string; data?: { id?: string } } = {};
        try { payload = raw ? JSON.parse(raw) : {}; } catch { /* noop */ }
        const paymentId = payload?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";
        const type = payload?.type ?? payload?.action ?? url.searchParams.get("type") ?? "";
        if (!paymentId || !(type.includes("payment") || url.searchParams.get("type") === "payment")) {
          return new Response("ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Localiza contribuição pelo mp_payment_id
        const { data: contrib } = await supabaseAdmin
          .from("pix_contributions")
          .select("id,campaign_id,status")
          .eq("mp_payment_id", String(paymentId))
          .maybeSingle();
        if (!contrib) {
          // Ainda não vinculada — tenta pelo external_reference após buscar no MP
          // Precisa do token do dono; usa qualquer campanha ativa (fallback simples via qualquer conta)
        }

        // Se não achou, precisa buscar external_reference no MP. Para isso precisamos de token.
        // Estratégia: se achou o contrib, pega token do dono; senão, tenta cada conta ativa.
        let contribId = contrib?.id ?? null;
        let campaignId = contrib?.campaign_id ?? null;
        let ownerToken: string | null = null;

        if (campaignId) {
          const { data: tokRows } = await supabaseAdmin.rpc(
            "get_pix_campaign_owner_token" as never,
            { _campaign_id: campaignId } as never,
          );
          const row = Array.isArray(tokRows) ? tokRows[0] : tokRows;
          ownerToken = (row as { access_token?: string } | null)?.access_token ?? null;
        }

        // Se ainda não conhecemos, resolvemos external_reference tentando 1 token por vez
        if (!contribId || !ownerToken) {
          const { data: accts } = await supabaseAdmin
            .from("mp_accounts").select("access_token").limit(50);
          for (const a of accts ?? []) {
            const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { Authorization: `Bearer ${a.access_token}` },
            });
            if (r.ok) {
              const j = await r.json();
              const ext = j?.external_reference as string | undefined;
              if (ext) {
                contribId = ext;
                ownerToken = a.access_token;
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

        const { error } = await supabaseAdmin.rpc(
          "apply_pix_contribution_update" as never,
          { _contribution_id: contribId, _mp_payment: mp } as never,
        );
        if (error) {
          console.error("[mp-pix webhook] apply failed", error.message);
          return new Response("apply failed", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
