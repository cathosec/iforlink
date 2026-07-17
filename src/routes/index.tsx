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
import { Search, Sparkles, BadgeCheck, ArrowRight, Layers, Link2, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "ForLink — Diretório de perfis e links curados" },
      { name: "description", content: "Descubra criadores brasileiros e organize seus próprios links em um perfil público, gratuito e bonito." },
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
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand-soft/60 blur-3xl" />
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-20 text-center sm:pt-28">
          <Badge variant="secondary" className="mb-5 gap-1.5 rounded-full px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3" /> forlink.app
          </Badge>
          <h1 className="text-balance font-display text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Um único link para <em className="italic text-brand">tudo</em> que você compartilha.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            Reúna seus melhores links em um perfil público, organizado por categorias.
            Grátis, bonito e pronto em minutos.
          </p>

          <div className="mx-auto mt-10 flex max-w-lg items-center gap-2 rounded-full border bg-card p-1.5 shadow-sm">
            <div className="pl-3 text-muted-foreground"><Search className="h-4 w-4" /></div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar perfil ou @usuario"
              className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Link to="/auth">
              <Button className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90">
                Criar meu ForLink <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Layers className="h-4 w-4" /> Categorias</span>
            <span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Favicon automático</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Perfil público</span>
          </div>
        </div>
      </section>

      {/* Directory */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Perfis em destaque</h2>
            <p className="mt-1 text-sm text-muted-foreground">Curadorias de criadores brasileiros.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            Nenhum perfil encontrado para "{q}".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link key={p.id} to="/$username" params={{ username: p.username }} className="group">
                <Card className="h-full overflow-hidden p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={p.avatar_url ?? undefined} alt={p.display_name} />
                      <AvatarFallback>{p.display_name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold">{p.display_name}</span>
                        {p.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">@{p.username}</div>
                    </div>
                  </div>
                  {p.bio && <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
                  <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
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

      <footer className="border-t bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} ForLink · forlink.app</span>
          <span>Feito com carinho no Brasil 🇧🇷</span>
        </div>
      </footer>
    </div>
  );
}
