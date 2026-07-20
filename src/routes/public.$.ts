import { createFileRoute } from "@tanstack/react-router";

// Redirects legacy URLs like /public/brand/favicon.svg → /brand/favicon.svg.
// Vite/Cloudflare already serve files inside the public/ folder from the site
// root, so the /public/ prefix does not exist in production. This route keeps
// old shared links working with a permanent redirect.
export const Route = createFileRoute("/public/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const rest = params._splat ?? "";
        const url = new URL(request.url);
        const target = `/${rest}${url.search}`;
        return new Response(null, {
          status: 301,
          headers: { Location: target },
        });
      },
    },
  },
});
