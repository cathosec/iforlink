import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Encurtador: recebe /s/:code e responde com um redirect 301 permanente.
// 301 preserva o SEO do link ORIGINAL (transfere a autoridade para o destino).
export const Route = createFileRoute("/s/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return new Response("Config inválida", { status: 500 });

        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              // Chaves opacas sb_ não são JWT — remove Authorization padrão
              if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
                h.delete("Authorization");
              }
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data } = await supabase
          .from("short_links")
          .select("url")
          .eq("code", params.code)
          .maybeSingle();

        if (!data?.url) {
          return new Response(
            `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Link não encontrado · ForLink</title><meta name="robots" content="noindex"></head><body style="font-family:system-ui;padding:3rem;text-align:center"><h1>Link não encontrado</h1><p>Este encurtador não existe ou foi removido.</p><p><a href="/">Voltar para o ForLink</a></p></body></html>`,
            { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }

        // Contador (fire-and-forget)
        void supabase.rpc("increment_short_click", { _code: params.code });

        return new Response(null, {
          status: 301,
          headers: {
            Location: data.url,
            "Cache-Control": "public, max-age=300",
            // Sinal explícito para crawlers: SEO deve ir para o destino
            Link: `<${data.url}>; rel="canonical"`,
            "X-Robots-Tag": "noindex, follow",
          },
        });
      },
    },
  },
});
