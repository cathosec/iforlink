import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isOpaqueSupabaseKey(value: string): boolean {
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

    // New Supabase publishable keys are opaque strings, not JWT bearer tokens.
    // Keep them as apikey only so Storage/Data API accepts the request.
    if (isOpaqueSupabaseKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

// GET /api/public/avatar/{userId}.jpg
// Streams an avatar from the "avatars" storage bucket using the publishable
// key + a public SELECT policy on storage.objects. Works on Cloudflare
// Workers without SUPABASE_SERVICE_ROLE_KEY.
export const Route = createFileRoute("/api/public/avatar/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = params.file;
        if (!/^[0-9a-fA-F-]{10,64}\.(jpg|jpeg|png|webp)$/.test(file)) {
          return new Response("Not found", { status: 404 });
        }
        try {
          const url =
            process.env.SUPABASE_URL ??
            import.meta.env.VITE_SUPABASE_URL ??
            "";
          const key =
            process.env.SUPABASE_PUBLISHABLE_KEY ??
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
            import.meta.env.VITE_SUPABASE_ANON_KEY ??
            "";
          if (!url || !key) {
            return new Response("Not configured", { status: 500 });
          }
          const client = createClient<Database>(url, key, {
            global: { fetch: createSupabaseFetch(key) },
            auth: {
              storage: undefined,
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          const { data, error } = await client.storage
            .from("avatars")
            .download(file);
          if (error || !data) {
            return new Response("Not found", { status: 404 });
          }
          const ext = file.split(".").pop()!.toLowerCase();
          const contentType =
            ext === "png"
              ? "image/png"
              : ext === "webp"
                ? "image/webp"
                : "image/jpeg";
          const buf = await data.arrayBuffer();
          return new Response(buf, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=300, s-maxage=3600",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
