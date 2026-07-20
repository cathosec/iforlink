import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true, provider: "mercadopago" });
      },
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const url = new URL(request.url);
        const signature = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";
        const dataId = url.searchParams.get("data.id") ?? "";

        let payload: { type?: string; action?: string; data?: { id?: string } } = {};
        try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch { /* noop */ }
        const paymentId = payload?.data?.id ?? dataId ?? url.searchParams.get("id") ?? "";
        const type = payload?.type ?? payload?.action ?? url.searchParams.get("type") ?? "";

        if (!paymentId || !(type.includes("payment") || url.searchParams.get("type") === "payment")) {
          return new Response("ignored", { status: 200 });
        }

        const supabase = createSupabasePublicClient();
        const { data: token, error: tokenError } = await supabase.rpc(
          "get_mercadopago_webhook_access_token" as never,
          {
            _signature: signature,
            _request_id: requestId,
            _payment_id: paymentId,
          } as never,
        );

        if (tokenError || !token) {
          console.error("[MP webhook] token/signature validation failed", tokenError?.message);
          return new Response("unauthorized", { status: tokenError?.message?.includes("access token") ? 500 : 401 });
        }

        // Fetch full payment
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${String(token)}` },
        });
        if (!resp.ok) {
          console.error("[MP webhook] fetch payment failed", resp.status);
          return new Response("mp fetch failed", { status: 502 });
        }
        const mp = await resp.json();
        const externalRef = mp.external_reference as string | undefined;
        if (!externalRef) return new Response("no external_reference", { status: 200 });

        const { error: applyError } = await supabase.rpc(
          "apply_mercadopago_payment_update" as never,
          {
            _pix_id: externalRef,
            _mp_payment: mp,
            _signature: signature,
            _request_id: requestId,
            _payment_id: paymentId,
          } as never,
        );

        if (applyError) {
          console.error("[MP webhook] apply payment failed", applyError.message);
          return new Response("apply failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
