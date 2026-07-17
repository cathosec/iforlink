import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BadgeCheck, Copy, Link2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getFaviconUrl } from "@/lib/favicon";

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
interface CatRow { id: string; name: string; display_order: number; links: LinkItem[] }

function PublicProfile() {
  const { username } = Route.useParams();

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

  const catsQ = useQuery({
    queryKey: ["cats", profileQ.data?.id],
    enabled: !!profileQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_categories")
        .select("id,name,display_order,links(id,title,description,url,favicon_url,clicks_count,display_order,is_visible)")
        .eq("user_id", profileQ.data!.id)
        .eq("is_visible", true)
        .order("display_order");
      const cats = ((data ?? []) as CatRow[]).map((c) => ({
        ...c,
        links: c.links.filter((l) => l.is_visible).sort((a, b) => a.display_order - b.display_order),
      }));
      return cats;
    },
  });

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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-64 bg-gradient-to-b from-brand-soft/50 to-transparent" />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
            <AvatarImage src={p.avatar_url ?? undefined} alt={p.display_name} />
            <AvatarFallback className="text-2xl">{p.display_name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="mt-4 flex items-center gap-1.5">
            <h1 className="font-display text-3xl tracking-tight">{p.display_name}</h1>
            {p.is_verified && (
              <span title="Verificado"><BadgeCheck className="h-6 w-6 text-brand" /></span>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground">@{p.username}</p>
          {p.bio && <p className="mt-4 max-w-lg text-pretty text-muted-foreground">{p.bio}</p>}
          <Button variant="outline" size="sm" onClick={copyProfile} className="mt-5 rounded-full">
            <Copy className="mr-2 h-3.5 w-3.5" /> Copiar link do perfil
          </Button>
        </div>

        <div className="mt-12">
          {cats.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <Link2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Este perfil ainda não publicou links.</p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-3">
              {cats.map((cat) => (
                <AccordionItem
                  key={cat.id}
                  value={cat.id}
                  className="overflow-hidden rounded-2xl border bg-card px-1 shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-4 text-left hover:no-underline">
                    <span className="text-base font-semibold">{cat.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    {cat.links.length === 0 ? (
                      <p className="px-3 pb-3 text-sm text-muted-foreground">Nenhum link nesta categoria.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {cat.links.map((l) => (
                          <li key={l.id}>
                            <button
                              onClick={() => handleClick(l.id, l.url)}
                              className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-accent"
                            >
                              <img
                                src={l.favicon_url ?? getFaviconUrl(l.url) ?? ""}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg border bg-white object-contain p-1.5"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{l.title}</div>
                                {l.description && (
                                  <div className="truncate text-xs text-muted-foreground">{l.description}</div>
                                )}
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
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

        <div className="mt-16 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            criado com <span className="font-semibold">ForLink</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
