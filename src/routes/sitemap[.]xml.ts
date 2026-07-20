import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://forlink.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

async function fetchPublicProfiles(): Promise<{ username: string; updated_at?: string }[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/profiles?select=username,updated_at&order=updated_at.desc.nullslast&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return [];
    return (await res.json()) as { username: string; updated_at?: string }[];
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0", lastmod: today },
          { path: "/sobre", changefreq: "monthly", priority: "0.7", lastmod: today },
          { path: "/contato", changefreq: "monthly", priority: "0.6", lastmod: today },
          { path: "/guias", changefreq: "weekly", priority: "0.8", lastmod: today },
          { path: "/privacidade", changefreq: "yearly", priority: "0.3", lastmod: today },
          { path: "/termos", changefreq: "yearly", priority: "0.3", lastmod: today },
        ];

        const profiles = await fetchPublicProfiles();
        const profileEntries: SitemapEntry[] = profiles
          .filter((p) => !!p.username)
          .map((p) => ({
            path: `/${p.username}`,
            changefreq: "weekly",
            priority: "0.8",
            lastmod: p.updated_at ? p.updated_at.slice(0, 10) : today,
          }));

        const entries = [...staticEntries, ...profileEntries];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
