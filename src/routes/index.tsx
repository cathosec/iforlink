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
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Plataforma brasileira · forlink.app
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Um link, todos os seus links.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              A ForLink reúne, organiza e dá contexto aos links que você compartilha.
              Perfil público, categorias, métricas e um plano Pro sem enrolação.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  Criar meu perfil <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <a href="#diretorio">
                <Button size="lg" variant="outline">Ver o diretório</Button>
              </a>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <div>
                  <div className="font-medium text-foreground">Perfis verificados</div>
                  <div className="text-muted-foreground">Selo oficial para marcas e criadores.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <div>
                  <div className="font-medium text-foreground">Pagamento em PIX</div>
                  <div className="text-muted-foreground">Ativação imediata do plano Pro.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <div>
                  <div className="font-medium text-foreground">Domínio próprio</div>
                  <div className="text-muted-foreground">forlink.app/seu-usuario, pronto para compartilhar.</div>
                </div>
              </div>
            </div>
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

