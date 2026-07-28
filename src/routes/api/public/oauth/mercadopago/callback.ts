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

        let supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
        try {
          ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
        } catch (err) {
          console.error("[MP OAuth] Supabase admin unavailable", err instanceof Error ? err.message : String(err));
          return redirect(`/pix?mp=error&reason=server_config&detail=SUPABASE_SERVICE_ROLE_KEY`);
        }

        const { data: cfgRow, error: cfgErr } = await supabaseAdmin
          .from("platform_settings").select("value").eq("key", "pix_config").maybeSingle();
        if (cfgErr) {
          console.error("[MP OAuth] config read failed", cfgErr.message);
          return redirect(`/pix?mp=error&reason=config_read`);
        }
        const cfg = ((cfgRow?.value ?? {}) as PixCfg) || {};
        const clientId = (cfg.oauth_client_id ?? "").trim();
        const clientSecret = (cfg.oauth_client_secret ?? "").trim();
        if (!clientId || !clientSecret) {
          return redirect(`/pix?mp=error&reason=not_configured&detail=client_id_or_secret_missing`);
        }

        const redirectUri = `${site}/api/public/oauth/mercadopago/callback`;
        const payload = {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        };
        const tokenResp = await fetch("https://api.mercadopago.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
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


        const t = tokenJson as {
          access_token?: string; refresh_token?: string; public_key?: string;
          user_id?: string | number; live_mode?: boolean; scope?: string; expires_in?: number;
        };
        const expiresAt = t.expires_in
          ? new Date(Date.now() + Number(t.expires_in) * 1000).toISOString()
          : null;

        const { error: upsertErr } = await supabaseAdmin.from("mp_accounts").upsert({
          user_id: state,
          mp_user_id: String(t.user_id ?? ""),
          access_token: String(t.access_token),
          refresh_token: t.refresh_token ? String(t.refresh_token) : null,
          public_key: t.public_key ? String(t.public_key) : null,
          live_mode: !!t.live_mode,
          scope: t.scope ? String(t.scope) : null,
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
