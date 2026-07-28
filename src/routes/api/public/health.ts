import { createFileRoute } from "@tanstack/react-router";

/**
 * Health check público — resposta rápida (sem segredos) para monitorar
 * pós-deploy no Cloudflare. Retorna 200 se OK, 503 se algum check crítico falhou.
 *
 * Checks:
 *  - env: variáveis essenciais presentes (nomes apenas, nunca valores)
 *  - db: SELECT 1 via cliente publishable (valida URL/anon + rede)
 *  - assets: fetch HEAD nos arquivos de marca (detecta rota /brand quebrada)
 *
 * Nunca vaza valores de segredos, tokens ou detalhes internos de erro.
 */

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      HEAD: async ({ request }) => handle(request),
    },
  },
});

type CheckResult = { ok: boolean; detail?: string; ms?: number };

async function handle(request: Request) {
  const started = Date.now();
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "1";

  const env = checkEnv();
  const [db, assets] = await Promise.all([checkDb(), checkAssets(url.origin)]);

  const criticalOk = env.ok && db.ok;
  const status = criticalOk ? 200 : 503;

  const body = {
    ok: criticalOk,
    version: process.env.LOVABLE_DEPLOY_ID ?? "unknown",
    ts: new Date().toISOString(),
    uptime_ms: Date.now() - started,
    checks: verbose
      ? { env, db, assets }
      : {
          env: { ok: env.ok },
          db: { ok: db.ok, ms: db.ms },
          assets: { ok: assets.ok },
        },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

function checkEnv(): CheckResult {
  const required = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((k) => !process.env[k]?.trim());
  return missing.length === 0
    ? { ok: true }
    : { ok: false, detail: `missing:${missing.join(",")}` };
}

async function checkDb(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    // Consulta barata em tabela pública (respeita RLS anon).
    const { error } = await supabase.from("platform_settings").select("key").limit(1);
    const ms = Date.now() - start;
    if (error && !/permission|denied/i.test(error.message ?? "")) {
      return { ok: false, ms, detail: "db_error" };
    }
    return { ok: true, ms };
  } catch {
    return { ok: false, ms: Date.now() - start, detail: "db_unreachable" };
  }
}

async function checkAssets(origin: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const targets = ["/brand/favicon.svg", "/brand/mark-color.svg", "/brand/og-image.png"];
    const results = await Promise.all(
      targets.map(async (path) => {
        try {
          const res = await fetch(new URL(path, origin).toString(), { method: "HEAD" });
          return res.ok;
        } catch {
          return false;
        }
      }),
    );
    const ok = results.every(Boolean);
    return { ok, ms: Date.now() - start, detail: ok ? undefined : "asset_missing" };
  } catch {
    return { ok: false, ms: Date.now() - start, detail: "assets_unreachable" };
  }
}
