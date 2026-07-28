import { createFileRoute } from "@tanstack/react-router";

interface PixCfg {
  oauth_client_id?: string;
  oauth_client_secret?: string;
}

export const Route = createFileRoute("/api/public/oauth/mercadopago/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // userId
        const errorParam = url.searchParams.get("error");
        const site = `${url.protocol}//${url.host}`;

        const redirect = (path: string) => new Response(null, {
          status: 302,
          headers: { Location: `${site}${path}` },
        });

        if (errorParam) return redirect(`/pix?mp=error&reason=${encodeURIComponent(errorParam)}`);
        if (!code || !state) return redirect(`/pix?mp=error&reason=missing_params`);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfgRow } = await supabaseAdmin
          .from("platform_settings").select("value").eq("key", "pix_config").maybeSingle();
        const cfg = ((cfgRow?.value ?? {}) as PixCfg) || {};
        if (!cfg.oauth_client_id || !cfg.oauth_client_secret) {
          return redirect(`/pix?mp=error&reason=not_configured`);
        }

        const redirectUri = `${site}/api/public/oauth/mercadopago/callback`;
        const form = new URLSearchParams({
          client_id: cfg.oauth_client_id,
          client_secret: cfg.oauth_client_secret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        });
        const tokenResp = await fetch("https://api.mercadopago.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: form.toString(),
        });
        const rawBody = await tokenResp.text();
        let tokenJson: Record<string, unknown> = {};
        try { tokenJson = JSON.parse(rawBody) as Record<string, unknown>; } catch { /* noop */ }
        if (!tokenResp.ok || !tokenJson.access_token) {
          console.error("[MP OAuth] token exchange failed", tokenResp.status, rawBody);
          const mpMsg =
            (typeof tokenJson.error === "string" && tokenJson.error) ||
            (typeof tokenJson.message === "string" && tokenJson.message) ||
            `http_${tokenResp.status}`;
          return redirect(
            `/pix?mp=error&reason=token_exchange&detail=${encodeURIComponent(String(mpMsg))}`,
          );
        }


        const expiresAt = tokenJson.expires_in
          ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
          : null;

        const { error: upsertErr } = await supabaseAdmin.from("mp_accounts").upsert({
          user_id: state,
          mp_user_id: String(tokenJson.user_id ?? ""),
          access_token: String(tokenJson.access_token),
          refresh_token: tokenJson.refresh_token ? String(tokenJson.refresh_token) : null,
          public_key: tokenJson.public_key ? String(tokenJson.public_key) : null,
          live_mode: !!tokenJson.live_mode,
          scope: tokenJson.scope ? String(tokenJson.scope) : null,
          expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        } as never, { onConflict: "user_id" });
        if (upsertErr) {
          console.error("[MP OAuth] upsert failed", upsertErr.message);
          return redirect(`/pix?mp=error&reason=save`);
        }
        return redirect(`/pix?mp=connected`);
      },
    },
  },
});
