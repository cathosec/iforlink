import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BadgeCheck, Copy, Link2, ExternalLink, Lock, Search, Share2, Eye, MousePointerClick, ChevronRight, Heart } from "lucide-react";
import { CategoryIcon } from "@/lib/category-icons";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { getFaviconUrl } from "@/lib/favicon";
import { AdSlot } from "@/components/ad-slot";
import { LogoWordmark } from "@/components/logo";
import { trackEvent } from "@/lib/analytics";
import { SOCIAL_MAP, SocialIcon, normalizeSocialLinks, type SocialLinkEntry } from "@/lib/social-links";
import { YouTubeChannelCard } from "@/components/YouTubeChannelCard";
import { resolveProfileTheme } from "@/lib/profile-themes";
// Card de campanha usa a capa da própria campanha; sem dependência de asset externo.

interface HeadProfile {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

import {
  SUPABASE_PUBLISHABLE_KEY_FALLBACK,
  SUPABASE_URL_FALLBACK,
} from "@/integrations/supabase/public-config";

async function fetchProfileForHead(username: string): Promise<HeadProfile | null> {
  const url =
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    SUPABASE_URL_FALLBACK;
  const key =
    (typeof process !== "undefined" && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_PUBLISHABLE_KEY_FALLBACK;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/profiles?select=username,display_name,bio,avatar_url,is_verified&username=eq.${encodeURIComponent(username)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as HeadProfile[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/$username")({
  component: PublicProfile,
  loader: async ({ params }) => ({
    profileHead: await fetchProfileForHead(params.username),
  }),
  head: ({ params, loaderData }) => {
    const p = loaderData?.profileHead;
    const url = `https://forlink.app/${params.username}`;
    if (!p) {
      const title = `@${params.username} · ForLink`;
      return {
        meta: [
          { title },
          { name: "description", content: `Perfil @${params.username} no ForLink.` },
          { name: "robots", content: "noindex,follow" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = `${p.display_name} (@${p.username}) · ForLink`;
    function truncate(str: string, max: number) {
      if (str.length <= max) return str;
      return str.slice(0, max - 3).trimEnd() + "...";
    }
    const rawDescription =
      p.bio && p.bio.trim().length > 0
        ? p.bio.trim()
        : `Confira os links favoritos de ${p.display_name} no ForLink.`;
    const metaDescription = truncate(rawDescription, 160);
    const ogDescription = truncate(rawDescription, 125);
    // og:image must be an absolute http(s) URL. Avatars podem estar como:
    //  - URL absoluta http(s) → usar direto
    //  - caminho relativo (/api/public/avatar/...) → prefixar com o domínio
    //  - data: URL (legado) ou vazio → fallback para a marca
    const rawAvatar = (p.avatar_url ?? "").trim();
    let image = "https://forlink.app/brand/og-image.png";
    if (/^https?:\/\//i.test(rawAvatar)) {
      image = rawAvatar;
    } else if (rawAvatar.startsWith("/")) {
      image = `https://forlink.app${rawAvatar}`;
    }
    const isSquareAvatar = image !== "https://forlink.app/brand/og-image.png";
    const imageAlt = `Foto de perfil de ${p.display_name}`;
    return {
      meta: [
        { title },
        { name: "description", content: metaDescription },
        { property: "og:type", content: "profile" },
        { property: "og:site_name", content: "ForLink" },
        { property: "og:locale", content: "pt_BR" },
        { property: "og:title", content: title },
        { property: "og:description", content: ogDescription },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:secure_url", content: image },
        { property: "og:image:alt", content: imageAlt },
        { property: "og:image:type", content: image.endsWith(".svg") ? "image/svg+xml" : "image/jpeg" },
        { property: "og:image:width", content: isSquareAvatar ? "512" : "1200" },
        { property: "og:image:height", content: isSquareAvatar ? "512" : "630" },
        { property: "profile:username", content: p.username },
        { name: "twitter:card", content: isSquareAvatar ? "summary" : "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: ogDescription },
        { name: "twitter:image", content: image },
        { name: "twitter:image:alt", content: imageAlt },
      ],

      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url,
            inLanguage: "pt-BR",
            mainEntity: {
              "@type": "Person",
              name: p.display_name,
              alternateName: `@${p.username}`,
              url,
              image,
              description: metaDescription,
            },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-32 text-center">
        <h1 className="font-display text-4xl">Perfil não encontrado</h1>
        <p className="mt-3 text-muted-foreground">Este @usuario ainda não existe no ForLink.</p>
        <Link to="/"><Button className="mt-6">Explorar perfis</Button></Link>
      </div>
    </div>
  ),
});

interface ProfileRow {
  id: string; username: string; display_name: string; bio: string | null;
  avatar_url: string | null; is_verified: boolean; views_count: number;
  social_links: unknown;
  theme: string | null;
}
interface LinkItem {
  id: string; title: string; description: string | null; url: string;
  favicon_url: string | null; clicks_count: number; display_order: number; is_visible: boolean;
}
interface CatRow { id: string; name: string; display_order: number; is_public: boolean; icon: string | null; links: LinkItem[] }

function PublicProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const profileQ = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,avatar_url,is_verified,views_count,social_links,theme")
        .eq("username", username)
        .maybeSingle();
      if (!data) throw notFound();
      return data as ProfileRow;
    },
  });

  const isOwner = !!user && !!profileQ.data && user.id === profileQ.data.id;

  // Incrementa a contagem de visualizações uma única vez por sessão/perfil,
  // ignorando visitas do próprio dono do perfil.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profileQ.data || isOwner) return;
    if (viewedRef.current === profileQ.data.id) return;
    viewedRef.current = profileQ.data.id;
    const key = `forlink:viewed:${profileQ.data.username}`;
    try {
      const last = sessionStorage.getItem(key);
      if (last) return;
      sessionStorage.setItem(key, "1");
    } catch { /* storage indisponível — segue registrando */ }
    supabase.rpc("increment_profile_view", { _username: profileQ.data.username }).then(() => {});
  }, [profileQ.data, isOwner]);

  // Analytics — profundidade de scroll (marcos 25/50/75/100%).
  useEffect(() => {
    if (!profileQ.data || isOwner) return;
    const reached = new Set<number>();
    const milestones = [25, 50, 75, 100];
    const onScroll = () => {
      const doc = document.documentElement;
      const total = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.round(((window.scrollY || doc.scrollTop) / total) * 100));
      for (const m of milestones) {
        if (pct >= m && !reached.has(m)) {
          reached.add(m);
          trackEvent("scroll_depth", {
            percent: m,
            profile_username: profileQ.data!.username,
          });
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [profileQ.data, isOwner]);

  const sectionsRef = useRef<HTMLDivElement | null>(null);

  const catsQ = useQuery({
    queryKey: ["cats", profileQ.data?.id, isOwner],
    enabled: !!profileQ.data?.id,
    queryFn: async () => {
      // Owner (logged as themselves) gets everything, including private categories.
      // Anyone else only gets public + visible (RLS also enforces this).
      let q = supabase
        .from("user_categories")
        .select("id,name,display_order,is_public,icon,links(id,title,description,url,favicon_url,clicks_count,display_order,is_visible)")
        .eq("user_id", profileQ.data!.id)
        .eq("is_visible", true)
        .order("display_order");
      if (!isOwner) q = q.eq("is_public", true);
      const { data } = await q;
      const cats = ((data ?? []) as CatRow[]).map((c) => ({
        ...c,
        links: c.links.filter((l) => l.is_visible).sort((a, b) => a.display_order - b.display_order),
      }));
      return cats;
    },
  });

  // Plano do dono do perfil — Pro/Admin não exibe anúncios na página pública.
  const roleQ = useQuery({
    queryKey: ["owner-role", profileQ.data?.id],
    enabled: !!profileQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profileQ.data!.id);
      const roles = (data ?? []).map((r) => r.role as string);
      return { isPro: roles.includes("pro") || roles.includes("admin") };
    },
  });

  // Complemento "Remover marca" ativo no dono do perfil.
  const removeBrandingQ = useQuery({
    queryKey: ["owner-remove-branding", profileQ.data?.id],
    enabled: !!profileQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc("user_has_active_addon", {
        _user_id: profileQ.data!.id,
        _addon: "remove_branding",
      });
      return data === true;
    },
  });

  // Campanha PIX ativa do dono (pega a mais recente para exibir card discreto).
  const campaignQ = useQuery({
    queryKey: ["profile-campaign", profileQ.data?.id],
    enabled: !!profileQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pix_campaigns")
        .select("slug,title,description,cover_url,accent_color,goal_cents,raised_cents,supporters_count,show_progress")
        .eq("user_id", profileQ.data!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Analytics — visualização de categorias/seções via IntersectionObserver.
  useEffect(() => {
    if (!profileQ.data || isOwner) return;
    if (!sectionsRef.current || typeof IntersectionObserver === "undefined") return;
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const catId = el.dataset.catId;
          const catName = el.dataset.catName;
          if (!catId || seen.has(catId)) continue;
          seen.add(catId);
          trackEvent("section_view", {
            category_id: catId,
            category_name: catName,
            profile_username: profileQ.data!.username,
          });
        }
      },
      { threshold: 0.5 },
    );
    const nodes = sectionsRef.current.querySelectorAll<HTMLElement>("[data-cat-id]");
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [profileQ.data, isOwner, catsQ.data]);
  const hideAds = roleQ.data?.isPro === true;

  if (profileQ.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl animate-pulse px-4 py-16">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted" />
          <div className="mx-auto mt-6 h-6 w-40 rounded bg-muted" />
        </div>
      </div>
    );
  }

  const p = profileQ.data!;

  const handleClick = async (linkId: string, url: string) => {
    supabase.rpc("increment_link_click", { _link_id: linkId }).then(() => {});
    trackEvent("link_click", {
      link_id: linkId,
      link_url: url,
      profile_username: p.username,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${p.username}`
    : `https://forlink.app/${p.username}`;

  const copyProfile = async () => {
    await navigator.clipboard.writeText(profileUrl);
    toast.success("Link copiado para a área de transferência");
  };

  const shareProfile = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: p.display_name,
          text: p.bio ?? `Confira os links de @${p.username}`,
          url: profileUrl,
        });
        return;
      } catch { /* usuário cancelou */ }
    }
    void copyProfile();
  };

  const cats = catsQ.data ?? [];
  const hostOf = (u: string) => {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
  };
  const totalLinks = cats.reduce((n, c) => n + c.links.length, 0);
  const totalClicks = cats.reduce(
    (n, c) => n + c.links.reduce((m, l) => m + (l.clicks_count ?? 0), 0),
    0,
  );

  const filteredCats = query.trim()
    ? cats
        .map((c) => ({
          ...c,
          links: c.links.filter((l) => {
            const q = query.toLowerCase();
            return (
              l.title.toLowerCase().includes(q) ||
              (l.description ?? "").toLowerCase().includes(q) ||
              l.url.toLowerCase().includes(q)
            );
          }),
        }))
        .filter((c) => c.links.length > 0 || c.name.toLowerCase().includes(query.toLowerCase()))
    : cats;
  const defaultOpen = filteredCats.map((c) => c.id);

  const theme = resolveProfileTheme(
    roleQ.data?.isPro ? (p.theme ?? "default") : "default",
  );
  const themeStyle: React.CSSProperties = {
    ...(theme.vars as React.CSSProperties),
    ...(theme.background ? { background: theme.background } : {}),
    ...(theme.fontFamily ? { fontFamily: theme.fontFamily } : {}),
  };

  return (
    <>
      <SiteHeader />
      <div
        className={`forlink-theme min-h-screen bg-background ${theme.className ?? ""}`}
        style={themeStyle}
      >
        {theme.extraCss ? <style dangerouslySetInnerHTML={{ __html: theme.extraCss }} /> : null}


      {/* Cabeçalho compacto */}
      <div className="border-b border-border/60 bg-card/40">

        <div className="mx-auto max-w-2xl px-4 py-4">
          <header className="flex items-center gap-3">
            <Avatar className="h-14 w-14 shrink-0 border-2 border-background shadow-sm ring-1 ring-border/60">
              <AvatarImage src={p.avatar_url ?? undefined} alt={p.display_name} />
              <AvatarFallback className="text-base font-semibold">
                {p.display_name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">
                  {p.display_name}
                </h1>
                {p.is_verified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verificado" />
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              {p.bio && (
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-foreground/70">
                  {p.bio}
                </p>
              )}
              <dl className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="tabular-nums"><b className="font-semibold text-foreground">{totalLinks}</b> links</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums"><b className="font-semibold text-foreground">{cats.length}</b> cat.</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums"><b className="font-semibold text-foreground">{p.views_count.toLocaleString("pt-BR")}</b> views</span>
              </dl>
            </div>

            <div className="flex shrink-0 flex-col gap-1.5">
              <Button variant="outline" size="sm" onClick={copyProfile} className="h-8 rounded-full px-3" aria-label="Copiar link">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={shareProfile} className="h-8 rounded-full px-3 shadow-sm" aria-label="Compartilhar">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </header>
        </div>
      </div>


      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8">
        {/* Busca (só aparece com volume) */}
        {totalLinks > 6 && (
          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nos links..."
              className="h-10 pl-9"
              aria-label="Buscar nos links"
            />
          </div>
        )}

        {/* Campanha PIX ativa — card discreto e elegante */}
        {campaignQ.data && (() => {
          const c = campaignQ.data as typeof campaignQ.data & { show_progress?: boolean | null };
          const showProgress = c.show_progress !== false;
          const goal = c.goal_cents ?? 0;
          const raised = c.raised_cents ?? 0;
          const pct = showProgress && goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : null;
          const missing = goal > 0 ? Math.max(0, goal - raised) : 0;
          const fmt = (cents: number) =>
            (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const accent = c.accent_color || "hsl(var(--brand))";
          const cover = (c as { cover_url?: string | null }).cover_url ?? null;
          return (
            <div
              className="group mb-5 overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <Link
                to="/pix/$slug"
                params={{ slug: c.slug }}
                className="block"
                onClick={() =>
                  trackEvent("campaign_card_click", {
                    campaign_slug: c.slug,
                    profile_username: p.username,
                  })
                }
              >
                <div
                  className="relative flex items-center gap-3 p-4"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 10%, transparent), transparent 70%)`,
                  }}
                >
                  <div
                    className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-black/5"
                    style={cover ? undefined : { background: accent }}
                    aria-hidden
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Heart className="h-6 w-6 text-white" fill="currentColor" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="h-4 gap-1 px-1.5 text-[10px] font-medium uppercase tracking-wide"
                      >
                        <Heart className="h-2.5 w-2.5" style={{ color: accent }} />
                        Apoie
                      </Badge>
                      {c.supporters_count > 0 && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {c.supporters_count} {c.supporters_count === 1 ? "apoio" : "apoios"}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-0.5 truncate text-sm font-semibold text-foreground">
                      {c.title}
                    </h2>
                    {showProgress && pct !== null ? (
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: accent }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                          <span>
                            <b className="font-semibold text-foreground">{fmt(raised)}</b> de {fmt(goal)}
                          </span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                    ) : showProgress && raised > 0 ? (
                      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                        Arrecadado:{" "}
                        <b className="font-semibold text-foreground">{fmt(raised)}</b>
                      </p>
                    ) : c.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    ) : null}
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>

              {/* Botão "Ver progresso" — só quando o dono habilita */}
              {showProgress && (
                <div className="border-t bg-muted/30 px-4 py-2.5">
                  <Link
                    to="/pix/$slug"
                    params={{ slug: c.slug }}
                    className="flex items-center justify-between gap-2 text-xs font-medium"
                    onClick={() =>
                      trackEvent("campaign_progress_click", {
                        campaign_slug: c.slug,
                        profile_username: p.username,
                      })
                    }
                  >
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      Ver progresso
                    </span>
                    <span className="tabular-nums" style={{ color: accent }}>
                      {pct !== null
                        ? missing > 0
                          ? `Faltam ${fmt(missing)}`
                          : "Meta alcançada! 🎉"
                        : raised > 0
                          ? `${fmt(raised)} arrecadados`
                          : "Seja o primeiro a apoiar"}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          );
        })()}


        {/* Links */}
        <div ref={sectionsRef}>
          {filteredCats.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <Link2 className="mx-auto h-7 w-7 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                {query ? "Nenhum resultado encontrado." : "Este perfil ainda não publicou links."}
              </p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-3">
              {filteredCats.map((cat) => (
                <AccordionItem
                  key={cat.id}
                  value={cat.id}
                  data-cat-id={cat.id}
                  data-cat-name={cat.name}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-brand">
                          <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate text-sm font-semibold text-foreground">
                          {cat.name}
                        </span>
                        {!cat.is_public && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 px-1.5 py-0 text-[9px] font-medium uppercase"
                          >
                            <Lock className="mr-0.5 h-2.5 w-2.5" /> Privada
                          </Badge>
                        )}
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {cat.links.length}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t bg-background/40 px-0 pb-0">
                    {cat.links.length === 0 ? (
                      <p className="px-4 py-4 text-xs text-muted-foreground">
                        Nenhum link nesta categoria.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {cat.links.map((l) => (
                          <li key={l.id}>
                            <button
                              onClick={() => handleClick(l.id, l.url)}
                              className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
                            >
                              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md border bg-white">
                                <img
                                  src={l.favicon_url ?? getFaviconUrl(l.url) ?? ""}
                                  alt=""
                                  className="h-5 w-5 object-contain"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                                  }}
                                />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium leading-snug text-foreground">
                                  {l.title}
                                </div>
                                <div className="mt-0 flex items-center gap-1.5 truncate text-[10px] leading-tight text-muted-foreground">
                                  <span className="truncate">
                                    {l.description || hostOf(l.url)}
                                  </span>
                                  {l.clicks_count > 0 && (
                                    <>
                                      <span className="opacity-40">·</span>
                                      <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums">
                                        <MousePointerClick className="h-2.5 w-2.5" />
                                        {l.clicks_count.toLocaleString("pt-BR")}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

        </div>

        {(() => {
          const socials: SocialLinkEntry[] = normalizeSocialLinks(profileQ.data?.social_links);
          if (socials.length === 0) return null;
          const yt = socials.find((s) => s.key === "youtube");
          const others = socials.filter((s) => s.key !== "youtube");
          return (
            <div className="mt-6 space-y-3">
              {yt && (
                <YouTubeChannelCard
                  raw={yt.value}
                  onClick={() => trackEvent("social_click", { platform: "youtube" })}
                />
              )}
              {others.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {others.map((s) => {
                    const p = SOCIAL_MAP[s.key];
                    if (!p) return null;
                    const href = p.toHref(s.value);
                    if (!href) return null;
                    return (
                      <a
                        key={s.key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        aria-label={p.label}
                        title={p.label}
                        onClick={() => trackEvent("social_click", { platform: p.key })}
                        className="group grid h-11 w-11 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-md"
                        style={{ ["--brand" as string]: p.brand } as React.CSSProperties}
                      >
                        <SocialIcon
                          platform={p}
                          className="h-5 w-5 transition-colors group-hover:text-[color:var(--brand)]"
                        />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {!hideAds && <AdSlot slot="profile" label="Publicidade" />}


        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          {!removeBrandingQ.data && (
            <Link to="/" className="group flex flex-col items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
                Criado com
              </span>
              <LogoWordmark className="h-5 w-auto opacity-70 transition-opacity group-hover:opacity-100" />
            </Link>
          )}
          <div className="flex justify-center gap-3 text-[11px] text-muted-foreground">
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <span>·</span>
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
          </div>
        </div>
      </main>
      {hideAds && <style>{`[data-ad-slot="mobile_sticky"]{display:none !important;}`}</style>}
    </div>
  );
}
