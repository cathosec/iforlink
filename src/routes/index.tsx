import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, BadgeCheck, ArrowRight, Bookmark, FolderTree, Smartphone, Share2, Lock, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "ForLink — Seus links favoritos, organizados e acessíveis de qualquer lugar" },
      { name: "description", content: "Salve, organize e acesse seus links favoritos em um só lugar. Categorias, links privados, perfil público compartilhável e sincronização entre dispositivos." },
      { property: "og:title", content: "ForLink — Salve seus links, acesse de qualquer lugar" },
      { property: "og:description", content: "O agregador de links brasileiro para salvar favoritos, organizar por categoria e compartilhar num perfil público." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

interface DirProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  views_count: number;
}

function Home() {
  const [q, setQ] = useState("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["directory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,avatar_url,is_verified,views_count")
        .order("views_count", { ascending: false })
        .limit(24);
      return (data as DirProfile[]) ?? [];
    },
  });

  const filtered = q
    ? profiles.filter(
        (p) =>
          p.username.toLowerCase().includes(q.toLowerCase()) ||
          p.display_name.toLowerCase().includes(q.toLowerCase()) ||
          (p.bio ?? "").toLowerCase().includes(q.toLowerCase()),
      )
    : profiles;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-background to-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:py-28 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Agregador de links · brasileiro
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-[3.4rem]">
              Salve seus links favoritos.
              <br />
              <span className="text-brand">Acesse de qualquer lugar.</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Guarde artigos, ferramentas, referências e sites que você usa todo dia.
              Organize por categoria, mantenha uma parte privada só sua, e compartilhe o resto num perfil público em <span className="font-medium text-foreground">forlink.app/seu-usuario</span>.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  Começar de graça <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <a href="#diretorio">
                <Button size="lg" variant="outline">Explorar o diretório</Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-brand" /> Links privados</span>
              <span className="inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-brand" /> Sincronizado em todo dispositivo</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-brand" /> Pro via PIX</span>
            </div>
          </div>

          {/* Visual mock — bookmark card preview */}
          <div className="relative">
            <div className="absolute inset-x-4 -bottom-4 h-32 rounded-2xl bg-brand/10 blur-2xl" aria-hidden />
            <Card className="relative overflow-hidden p-0 shadow-lg">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                </div>
                <span className="ml-2 text-xs text-muted-foreground">forlink.app/voce</span>
              </div>
              <div className="space-y-4 p-5">
                {[
                  { cat: "Ferramentas do dia", items: [["Figma", "figma.com"], ["Linear", "linear.app"], ["Notion", "notion.so"]] },
                  { cat: "Leituras salvas", items: [["Paul Graham — Essays", "paulgraham.com"], ["Nielsen Norman Group", "nngroup.com"]] },
                ].map((g) => (
                  <div key={g.cat}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.cat}</div>
                    <div className="space-y-1.5">
                      {g.items.map(([title, host]) => (
                        <div key={host} className="flex items-center gap-2.5 rounded-md border bg-card px-2.5 py-1.5">
                          <img
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${host}`}
                            alt=""
                            width={16}
                            height={16}
                            loading="lazy"
                            className="h-4 w-4 shrink-0 rounded-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{title}</div>
                            <div className="truncate text-[10px] text-muted-foreground">{host}</div>
                          </div>
                          <Bookmark className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Como funciona</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Um lugar para tudo que você precisa acessar rápido — do celular, do trabalho, da casa de amigo.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { n: "01", icon: Bookmark, t: "Salve", d: "Cole qualquer URL. A ForLink busca o favicon, o título e prepara o card automaticamente." },
              { n: "02", icon: FolderTree, t: "Organize", d: "Agrupe por categoria — leituras, ferramentas, clientes. Marque como pública ou privada." },
              { n: "03", icon: Share2, t: "Acesse", d: "Abra o painel em qualquer navegador ou compartilhe seu perfil público num link só." },
            ].map(({ n, icon: Icon, t, d }) => (
              <div key={n} className="rounded-lg border bg-background p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-soft text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{n}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Search + Directory */}
      <section id="diretorio" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Diretório de perfis</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Descubra criadores, empresas e projetos brasileiros na ForLink.
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2 rounded-md border bg-card px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar perfil ou @usuario"
              className="h-6 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
            Nenhum perfil encontrado para "{q}".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link key={p.id} to="/$username" params={{ username: p.username }} className="group">
                <Card className="h-full overflow-hidden p-6 transition-colors hover:border-brand/40 hover:bg-accent/30">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-11 w-11 border">
                      <AvatarImage src={p.avatar_url ?? undefined} alt={p.display_name} />
                      <AvatarFallback>{p.display_name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-foreground">{p.display_name}</span>
                        {p.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">@{p.username}</div>
                    </div>
                  </div>
                  {p.bio && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>}
                  <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                    <span>{p.views_count.toLocaleString("pt-BR")} visualizações</span>
                    <span className="font-medium text-brand opacity-0 transition group-hover:opacity-100">
                      Ver perfil →
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t bg-secondary/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} ForLink · forlink.app</span>
          <span>Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}

