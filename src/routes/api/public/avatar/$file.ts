import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// GET /api/public/avatar/{userId}.jpg
// Streams an avatar from the private "avatars" storage bucket so social
// crawlers (WhatsApp, X, Facebook, LinkedIn, Google) can fetch og:image
// without exposing the bucket publicly.
export const Route = createFileRoute("/api/public/avatar/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = params.file;
        if (!/^[0-9a-fA-F-]{10,64}\.(jpg|jpeg|png|webp)$/.test(file)) {
          return new Response("Not found", { status: 404 });
        }
        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { data, error } = await supabaseAdmin.storage
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
