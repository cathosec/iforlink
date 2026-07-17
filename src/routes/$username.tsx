import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Copy, Link2, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { getFaviconUrl } from "@/lib/favicon";
import { AdSlot } from "@/components/ad-slot";
import { LogoWordmark } from "@/components/logo";

export const Route = createFileRoute("/$username")({
  component: PublicProfile,
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
    void supabase.rpc("increment_link_click", { _link_id: linkId });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyProfile = async () => {
    const url = `${window.location.origin}/${p.username}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const cats = catsQ.data ?? [];
  const defaultOpen = cats.map((c) => c.id);

  const hostOf = (u: string) => {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
  };
  const totalLinks = cats.reduce((n, c) => n + c.links.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-xl px-4 pb-20 pt-10">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0 border">
            <AvatarImage src={p.avatar_url ?? undefined} alt={p.display_name} />
            <AvatarFallback className="text-base font-medium">{p.display_name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate font-display text-xl font-semibold tracking-tight">{p.display_name}</h1>
              {p.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verificado" />}
            </div>
            <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyProfile} className="shrink-0">
            <Copy className="h-3.5 w-3.5 sm:mr-2" />
            <span className="hidden sm:inline">Copiar</span>
          </Button>
        </header>

        {p.bio && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
        )}

        {/* Stats bar */}
        <div className="mt-5 flex items-center gap-4 border-y py-2.5 text-xs text-muted-foreground">
          <span><span className="font-semibold text-foreground">{totalLinks}</span> links</span>
          <span className="h-3 w-px bg-border" />
          <span><span className="font-semibold text-foreground">{cats.length}</span> categorias</span>
          <span className="h-3 w-px bg-border" />
          <span><span className="font-semibold text-foreground">{p.views_count.toLocaleString("pt-BR")}</span> views</span>
        </div>

        {/* Links */}
        <div className="mt-6">
          {cats.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Link2 className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Este perfil ainda não publicou links.</p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
              {cats.map((cat) => (
                <AccordionItem
                  key={cat.id}
                  value={cat.id}
                  className="overflow-hidden rounded-lg border bg-card"
                >
                  <AccordionTrigger className="px-3.5 py-2.5 text-left hover:no-underline">
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
                          {cat.name}
                        </span>
                        {!cat.is_public && (
                          <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[9px] font-medium uppercase">
                            <Lock className="mr-0.5 h-2.5 w-2.5" /> Privada
                          </Badge>
                        )}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {cat.links.length}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t px-0 pb-0">
                    {cat.links.length === 0 ? (
                      <p className="px-3.5 py-3 text-xs text-muted-foreground">Nenhum link.</p>
                    ) : (
                      <ul className="divide-y">
                        {cat.links.map((l) => (
                          <li key={l.id}>
                            <button
                              onClick={() => handleClick(l.id, l.url)}
                              className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-accent/60"
                            >
                              <img
                                src={l.favicon_url ?? getFaviconUrl(l.url) ?? ""}
                                alt=""
                                className="h-6 w-6 shrink-0 rounded-sm border bg-white object-contain p-0.5"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium leading-tight">{l.title}</div>
                                <div className="truncate text-[11px] leading-tight text-muted-foreground">
                                  {l.description || hostOf(l.url)}
                                </div>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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
