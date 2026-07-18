import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Bookmark, FolderTree, Smartphone, Share2, Lock, Zap, Check, HelpCircle, ShieldCheck, Mail } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";


export const Route = createFileRoute("/")({
  component: Home,
  head: () => {
    const title = "ForLink — Bio link e agregador de links profissional";
    const description =
      "Crie seu perfil ForLink em forlink.app/seu-usuario. Organize seus links favoritos em categorias, compartilhe em um único endereço e acompanhe cliques. Grátis para começar.";
    const url = "https://forlink.app/";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: "bio link, agregador de links, link na bio, linktree brasileiro, perfil de links, forlink" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "ForLink",
            url: "https://forlink.app/",
            applicationCategory: "SocialNetworkingApplication",
            operatingSystem: "Web",
            inLanguage: "pt-BR",
            offers: [
              { "@type": "Offer", name: "Free", price: "0", priceCurrency: "BRL" },
              { "@type": "Offer", name: "Pro", priceCurrency: "BRL", category: "subscription" },
            ],
          }),
        },
      ],
    };
  },
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

function normalizeUsername(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function AdPlaceholder({ position }: { position: string }) {
  return (
    <div className="my-4 rounded-md border border-dashed bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium uppercase tracking-widest">Espaço para anúncios · {position}</span>
        <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium text-brand">
          Plano Pro não exibe anúncios
        </span>
      </div>
    </div>
  );
}

function Home() {
  const [q, setQ] = useState("");
  const [uname, setUname] = useState("");
  const navigate = useNavigate();

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

  const cleanUname = normalizeUsername(uname);
  const unameValid = cleanUname.length >= 3;

  const claim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unameValid) return;
    navigate({ to: "/auth", search: { username: cleanUname, mode: "signup" } });
  };

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
        <div className="mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Agregador de links · brasileiro
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-[3.4rem]">
              Reserve seu link.
              <br />
              <span className="text-brand">Organize tudo em um só lugar.</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Escolha seu endereço em <span className="font-medium text-foreground">forlink.app</span>,
              crie sua conta em segundos e comece a salvar, organizar e compartilhar seus links favoritos.
            </p>

            {/* Username claim */}
            <form onSubmit={claim} className="mt-8">
              <label htmlFor="claim" className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Escolha seu link
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex flex-1 items-stretch overflow-hidden rounded-md border bg-card shadow-sm ring-brand/20 transition focus-within:border-brand focus-within:ring-2">
                  <span className="flex items-center whitespace-nowrap border-r bg-muted/50 px-3 text-sm text-muted-foreground">
                    forlink.app/
                  </span>
                  <Input
                    id="claim"
                    value={uname}
                    onChange={(e) => setUname(e.target.value)}
                    placeholder="seu-usuario"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 flex-1 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!unameValid}
                  className="h-11 bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto"
                >
                  Reservar <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 min-h-[1.25rem] text-xs text-muted-foreground">
                {uname && !unameValid
                  ? "Use pelo menos 3 caracteres (letras, números e hífen)."
                  : cleanUname
                    ? <>Seu link ficará: <span className="font-medium text-foreground">forlink.app/{cleanUname}</span></>
                    : "Grátis, sem cartão. Você confirma no próximo passo."}
              </p>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
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
                <span className="ml-2 truncate text-xs text-muted-foreground">
                  forlink.app/{cleanUname || "voce"}
                </span>
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

          {/* Plans strip */}
          <div className="mt-10 grid gap-4 rounded-lg border bg-background p-6 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold">Plano Free</h3>
                <span className="text-xs text-muted-foreground">para sempre</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {["Perfil público em forlink.app/seu-usuario", "Até 15 links e 3 categorias", "Links privados só para você", "Sincronização em todo dispositivo"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {f}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border bg-secondary/40 p-4">
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold">Pro</h3>
                <span className="text-xs text-muted-foreground">via PIX</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {["Sem anúncios em todo o site", "Links e categorias ilimitados", "Encurtador forlink.app/s/", "Verificação com selo", "Estatísticas detalhadas de cliques", "Suporte prioritário"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {f}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                O plano Free exibe anúncios discretos no topo do diretório, entre os perfis e uma faixa fixa no mobile. Ao assinar o Pro, todos os espaços são removidos automaticamente.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Top ad slot */}
      <div className="mx-auto max-w-6xl px-4">
        <AdPlaceholder position="Topo do diretório" />
        <AdSlot slot="top" label="Publicidade" />
      </div>

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

        <AdPlaceholder position="Entre os perfis do diretório" />
        <AdSlot slot="feed" label="Publicidade" />
      </section>

      <footer className="border-t bg-secondary/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ForLink · forlink.app</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
            <a href="mailto:contato@forlink.app" className="hover:text-foreground">Contato</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
