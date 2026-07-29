/**
 * Cron endpoint: reconsulta o Cloudflare para todos os custom domains
 * ainda em `pending_dns`, `pending_ssl` ou `failed` e atualiza o status
 * local. Deve ser chamado por `pg_cron` (via `pg_net`) a cada ~15 min
 * usando o apikey publishable do Supabase.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/sync-custom-domains")({
  server: {
    handlers: {
      GET: async () => runSync(),
      POST: async () => runSync(),
    },
  },
});

async function runSync(): Promise<Response> {
  const cfToken = (process.env.CF_API_TOKEN ?? "").trim();
  if (!cfToken) {
    return Response.json({ ok: false, error: "CF_API_TOKEN missing" }, { status: 503 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pending, error } = await supabaseAdmin.rpc("list_custom_domains_to_sync", { _limit: 50 });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const { cfGetCustomHostname, cfCreateCustomHostname, mapCfStatus } = await import(
    "@/lib/custom-domains.server"
  );

  const results: Array<{ id: string; hostname: string; status: string; error?: string }> = [];
  for (const row of (pending ?? []) as Array<{ id: string; hostname: string; cf_custom_hostname_id: string | null; status: string }>) {
    try {
      let cf;
      if (!row.cf_custom_hostname_id) {
        cf = await cfCreateCustomHostname(row.hostname);
      } else {
        cf = await cfGetCustomHostname(row.cf_custom_hostname_id);
      }
      const mapped = mapCfStatus(cf);
      await supabaseAdmin.rpc("update_custom_domain_status", {
        _id: row.id,
        _status: mapped.status,
        _ssl_status: mapped.ssl_status,
        _ownership_verification: mapped.ownership as never,
        _cf_id: cf.id,
        _last_error: mapped.last_error,
      });
      results.push({ id: row.id, hostname: row.hostname, status: mapped.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      await supabaseAdmin.rpc("update_custom_domain_status", {
        _id: row.id,
        _status: "failed",
        _ssl_status: undefined,
        _ownership_verification: undefined,
        _cf_id: row.cf_custom_hostname_id ?? undefined,
        _last_error: msg,
      });
      results.push({ id: row.id, hostname: row.hostname, status: "failed", error: msg });
    }
  }

  return Response.json({ ok: true, processed: results.length, results });
}
