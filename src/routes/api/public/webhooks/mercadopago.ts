import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const url = new URL(request.url);
        const signature = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";
        const dataId = url.searchParams.get("data.id") ?? "";

        // Load settings (token + webhook_secret can be stored in DB by admin).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: setting } = await supabaseAdmin.from("platform_settings").select("value").eq("key", "mercadopago").maybeSingle();
        const cfg = (setting?.value ?? {}) as { mode?: string; access_token_test?: string; access_token_live?: string; webhook_secret?: string };
        const secret = (cfg.webhook_secret && cfg.webhook_secret.trim()) || process.env.MERCADOPAGO_WEBHOOK_SECRET || "";

        // Signature verification (if secret configured)
        if (secret) {
          const parts = Object.fromEntries(signature.split(",").map(p => p.trim().split("=") as [string, string]));
          const ts = parts.ts;
          const v1 = parts.v1;
          if (!ts || !v1) return new Response("bad signature", { status: 401 });
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          try {
            const a = Buffer.from(v1, "hex");
            const b = Buffer.from(expected, "hex");
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return new Response("invalid signature", { status: 401 });
            }
          } catch {
            return new Response("invalid signature", { status: 401 });
          }
        }

        let payload: { type?: string; action?: string; data?: { id?: string } } = {};
        try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch { /* noop */ }
        const paymentId = payload?.data?.id ?? dataId;
        const type = payload?.type ?? payload?.action ?? "";

        if (!paymentId || !(type.includes("payment") || url.searchParams.get("type") === "payment")) {
          return new Response("ignored", { status: 200 });
        }

        const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!token) return new Response("mp token missing", { status: 500 });

        // Fetch full payment
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          console.error("[MP webhook] fetch payment failed", resp.status);
          return new Response("mp fetch failed", { status: 502 });
        }
        const mp = await resp.json();
        const externalRef = mp.external_reference as string | undefined;
        if (!externalRef) return new Response("no external_reference", { status: 200 });

        const { applyPaymentUpdate } = await import("@/lib/mercadopago.functions");
        await applyPaymentUpdate(externalRef, mp);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
