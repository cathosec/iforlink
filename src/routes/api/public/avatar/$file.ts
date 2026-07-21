import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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
            process.env.VITE_SUPABASE_URL ??
            "";
          const key =
            process.env.SUPABASE_PUBLISHABLE_KEY ??
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
            process.env.VITE_SUPABASE_ANON_KEY ??
            "";
          if (!url || !key) {
            return new Response("Not configured", { status: 500 });
          }
          const client = createClient<Database>(url, key, {
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
