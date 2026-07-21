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
import { BadgeCheck, Copy, Link2, ExternalLink, Lock, Search, Share2, Eye, MousePointerClick, Folder } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { getFaviconUrl } from "@/lib/favicon";
import { AdSlot } from "@/components/ad-slot";
import { LogoWordmark } from "@/components/logo";

interface HeadProfile {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

async function fetchProfileForHead(username: string): Promise<HeadProfile | null> {
  const url = (typeof process !== "undefined" && process.env?.SUPABASE_URL) || undefined;
  const key = (typeof process !== "undefined" && process.env?.SUPABASE_PUBLISHABLE_KEY) || undefined;
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
    const description = (p.bio && p.bio.trim().length > 0
      ? p.bio.trim()
      : `Confira os links favoritos de ${p.display_name} no ForLink.`
    ).slice(0, 300);
    // og:image must be an absolute http(s) URL. Legacy avatars were stored as
    // data: URLs; crawlers can't fetch those, so we fall back to the brand mark.
    const rawAvatar = p.avatar_url ?? "";
    const isAbsoluteHttp = /^https?:\/\//i.test(rawAvatar);
    const image = isAbsoluteHttp
      ? rawAvatar
      : "https://forlink.app/brand/mark-color.svg";
    const imageAlt = `Foto de perfil de ${p.display_name}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:alt", content: imageAlt },
        { property: "og:image:width", content: "512" },
        { property: "og:image:height", content: "512" },
        { property: "profile:username", content: p.username },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
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
              description,
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
}
interface LinkItem {
  id: string; title: string; description: string | null; url: string;
  favicon_url: string | null; clicks_count: number; display_order: number; is_visible: boolean;
}
interface CatRow { id: string; name: string; display_order: number; is_public: boolean; links: LinkItem[] }

function PublicProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const profileQ = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,avatar_url,is_verified,views_count")
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
    void supabase.rpc("increment_profile_view", { _username: profileQ.data.username });
  }, [profileQ.data, isOwner]);

  const catsQ = useQuery({
    queryKey: ["cats", profileQ.data?.id, isOwner],
    enabled: !!profileQ.data?.id,
    queryFn: async () => {
      // Owner (logged as themselves) gets everything, including private categories.
      // Anyone else only gets public + visible (RLS also enforces this).
      let q = supabase
        .from("user_categories")
        .select("id,name,display_order,is_public,links(id,title,description,url,favicon_url,clicks_count,display_order,is_visible)")
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Cabeçalho editorial */}
      <div className="relative overflow-hidden border-b bg-gradient-to-b from-accent/30 via-background to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(55%_55%_at_50%_0%,color-mix(in_oklab,var(--brand)_10%,transparent),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-2xl px-4 pb-6 pt-10 sm:pt-14">
          <header className="flex flex-col items-center text-center">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-1 rounded-full bg-gradient-to-br from-brand/30 via-brand/10 to-transparent blur-md"
              />
              <Avatar className="relative h-24 w-24 shrink-0 border-[3px] border-background shadow-xl ring-1 ring-border/60">
                <AvatarImage src={p.avatar_url ?? undefined} alt={p.display_name} />
                <AvatarFallback className="text-2xl font-semibold">
                  {p.display_name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="mt-5 flex items-center justify-center gap-1.5">
              <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-[28px]">
                {p.display_name}
              </h1>
              {p.is_verified && (
                <BadgeCheck className="h-5 w-5 shrink-0 text-brand" aria-label="Verificado" />
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">@{p.username}</p>

            {p.bio && (
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-foreground/80">
                {p.bio}
              </p>
            )}

            {/* Estatísticas inline elegantes */}
            <dl className="mt-6 flex items-center justify-center divide-x divide-border/70 rounded-full border bg-card/60 px-1 py-1 shadow-sm backdrop-blur">
              <div className="flex items-baseline gap-1.5 px-4 py-1">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Links</dt>
                <dd className="font-display text-sm font-semibold tabular-nums">{totalLinks}</dd>
              </div>
              <div className="flex items-baseline gap-1.5 px-4 py-1">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Categorias</dt>
                <dd className="font-display text-sm font-semibold tabular-nums">{cats.length}</dd>
              </div>
              <div className="flex items-baseline gap-1.5 px-4 py-1">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Views</dt>
                <dd className="font-display text-sm font-semibold tabular-nums">
                  {p.views_count.toLocaleString("pt-BR")}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyProfile} className="h-9 rounded-full px-4">
                <Copy className="mr-2 h-3.5 w-3.5" /> Copiar link
              </Button>
              <Button size="sm" onClick={shareProfile} className="h-9 rounded-full px-4 shadow-sm">
                <Share2 className="mr-2 h-3.5 w-3.5" /> Compartilhar
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

        {/* Links */}
        <div>
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
                  className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-brand">
                          <Folder className="h-3.5 w-3.5" />
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

          {totalClicks > 0 && !query && (
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground/80">
                {totalClicks.toLocaleString("pt-BR")}
              </span>{" "}
              cliques totais nos links
            </p>
          )}
        </div>

        {!hideAds && <AdSlot slot="profile" label="Publicidade" />}


        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <Link to="/" className="group flex flex-col items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
              Criado com
            </span>
            <LogoWordmark className="h-5 w-auto opacity-70 transition-opacity group-hover:opacity-100" />
          </Link>
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
