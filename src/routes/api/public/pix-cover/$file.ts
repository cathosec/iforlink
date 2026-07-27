import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isOpaque(k: string) {
  return k.startsWith("sb_publishable_") || k.startsWith("sb_secret_");
}

export const Route = createFileRoute("/api/public/pix-cover/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = params.file;
        if (!/^[\w.-]{4,120}\.(jpg|jpeg|png|webp)$/i.test(file)) {
          return new Response("Not found", { status: 404 });
        }
        const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "";
        const key =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
          import.meta.env.VITE_SUPABASE_ANON_KEY ??
          "";
        if (!url || !key) return new Response("Not configured", { status: 500 });
        const client = createClient<Database>(url, key, {
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (isOpaque(key) && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data, error } = await client.storage.from("pix-covers").download(file);
        if (error || !data) return new Response("Not found", { status: 404 });
        const ext = file.split(".").pop()!.toLowerCase();
        const ct = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        return new Response(await data.arrayBuffer(), {
          status: 200,
          headers: { "Content-Type": ct, "Cache-Control": "public, max-age=300, s-maxage=3600" },
        });
      },
    },
  },
});
