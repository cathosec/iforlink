import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Bookmark, FolderTree, Smartphone, Share2, Lock, Zap, Check, HelpCircle, ShieldCheck, Mail, Heart, QrCode, Wallet, Target, Sparkles } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";

/**
 * Resolve o Host da requisição atual contra a tabela `custom_domains`.
 * Retorna o username do dono do domínio, ou null se não for um custom domain.
 */
const resolveCustomHost = createServerFn({ method: "GET" }).handler(async () => {
  const host = (getRequestHost({ xForwardedHost: true }) ?? "").toLowerCase().replace(/:\d+$/, "");
  if (!host || host === "forlink.app" || host === "www.forlink.app" || host.endsWith(".lovable.app") || host.startsWith("localhost")) {
    return { username: null as string | null };
  }
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  if (!url || !key) return { username: null };
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await sb.rpc("resolve_custom_domain", { _hostname: host });
  const row = Array.isArray(data) ? data[0] : data;
  return { username: (row?.username as string | undefined) ?? null };
});

export const Route = createFileRoute("/")({
  component: Home,
  beforeLoad: async () => {
    // Se o host for um domínio personalizado ativo, redireciona para o perfil dono
    try {
      const { username } = await resolveCustomHost();
      if (username) throw redirect({ to: "/$username", params: { username }, replace: true });
    } catch (err) {
      if (err && typeof err === "object" && "isRedirect" in (err as object)) throw err;
      // silencioso: se falhar, segue para a home normal
    }
  },
  head: () => {
    const title = "ForLink — Bio link e agregador de links profissional";
    const description =
      "Crie seu perfil ForLink em forlink.app/seu-usuario. Organize seus links em categorias, compartilhe tudo em um endereço e acompanhe cliques. Grátis.";
    const url = "https://forlink.app/";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: "bio link, agregador de links, link na bio, linktree brasileiro, perfil de links, forlink" },
        { name: "google-adsense-account", content: "ca-pub-4849075700232419" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "ForLink" },
        { property: "og:locale", content: "pt_BR" },

        { property: "og:image", content: "https://forlink.app/brand/og-image.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "ForLink — bio link profissional em forlink.app" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: "https://forlink.app/brand/og-image.png" },
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


const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "O que é a ForLink?",
    a: "A ForLink é uma plataforma brasileira de bio link e agregador de links. Você cria um endereço único em forlink.app/seu-usuario, organiza seus links em categorias e compartilha tudo em um só lugar.",
  },
  {
    q: "É realmente grátis?",
    a: "Sim. O plano Free é gratuito para sempre e inclui até 15 links, 3 categorias, perfil público, links privados e sincronização em todos os dispositivos. Anúncios discretos ajudam a manter o serviço no ar.",
  },
  {
    q: "Qual a diferença entre Free e Pro?",
    a: "O Pro remove todos os anúncios do site, libera links e categorias ilimitados, dá acesso ao encurtador forlink.app/s/, selo de verificação, estatísticas detalhadas de cliques e suporte prioritário.",
  },
  {
    q: "Como faço para assinar o Pro?",
    a: "A assinatura é feita via PIX pelo Mercado Pago, com opções mensal, trimestral ou anual. A confirmação é automática e o Pro é liberado assim que o pagamento é aprovado.",
  },
  {
    q: "Meus links ficam públicos?",
    a: "Você decide. Cada categoria tem uma chave 'Pública' — quando desligada, os links dentro dela só aparecem quando você estiver logado no seu painel. Ideal para separar links pessoais dos que você quer compartilhar.",
  },
  {
    q: "Como funciona o encurtador?",
    a: "Assinantes Pro podem criar links curtos no formato forlink.app/s/codigo. O redirecionamento é 301 e mantém a autoridade de SEO do link original via canonical, sem prejudicar o site de destino.",
  },
  {
    q: "Meus dados estão seguros? E a LGPD?",
    a: "Sim. Seguimos a LGPD: você tem controle total sobre seus dados, pode exportar ou excluir sua conta a qualquer momento pelo painel. Usamos cookies apenas com seu consentimento — veja detalhes em Privacidade.",
  },
  {
    q: "Posso mudar meu nome de usuário depois?",
    a: "Sim, você pode alterar seu @usuario nas configurações da conta. Lembre-se que o endereço público (forlink.app/seu-usuario) também mudará, então avise quem já tem o link antigo.",
  },
  {
    q: "Como cancelo a assinatura Pro?",
    a: "No painel, acesse 'Assinatura' e clique em cancelar. Você continua com os benefícios Pro até o fim do período já pago e depois volta automaticamente para o plano Free — sem perder seus links.",
  },
  {
    q: "Como funcionam as Campanhas PIX no ForLink?",
    a: "Você conecta sua própria conta Mercado Pago via OAuth (com 1 clique) e cria uma página de arrecadação em forlink.app/pix/seu-slug. Os pagamentos (PIX ou cartão) caem DIRETO na sua conta MP — o ForLink não intermedeia dinheiro. Cada colaborador aprovado aparece no mural com nome, valor e selo (Bronze, Prata, Ouro, Diamante ou Lenda) conforme o valor contribuído.",
  },
  {
    q: "Quais taxas incidem em uma campanha PIX?",
    a: "Duas taxas independentes: (1) taxa ForLink configurada pelo admin (atualmente 2% com mínimo de R$ 0,50 por transação) — você escolhe se ela é descontada do valor recebido ou repassada ao colaborador; (2) tarifa do Mercado Pago cobrada do recebedor, que gira em torno de 0,99% para PIX e ~4,98% para cartão de crédito à vista (varia conforme seu plano MP). Ambas as taxas aparecem detalhadas na tela de pagamento para o colaborador.",
  },
  {
    q: "Quem pode criar uma Campanha PIX?",
    a: "Qualquer usuário. No plano Free você pode manter 1 campanha ativa; no Pro é ilimitado. Basta ter uma conta Mercado Pago (pessoa física ou jurídica) para conectar.",
  },
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. A ForLink funciona 100% no navegador, em qualquer dispositivo. Você pode adicionar o site à tela inicial do celular para ter uma experiência parecida com a de um app.",
  },
];





function Home() {
  const [uname, setUname] = useState("");
  const navigate = useNavigate();

  const cleanUname = normalizeUsername(uname);
  const unameValid = cleanUname.length >= 3;

  const claim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unameValid) return;
    navigate({ to: "/auth", search: { username: cleanUname, mode: "signup" } });
  };


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
                {["Perfil público em forlink.app/seu-usuario", "Até 15 links e 3 categorias", "1 campanha ativa (Mercado Pago)", "Links privados só para você", "Sincronização em todo dispositivo"].map((f) => (
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
                {["Sem anúncios em todo o site", "Links e categorias ilimitados", "Campanhas ilimitadas no Mercado Pago", "Encurtador forlink.app/s/", "Verificação com selo", "Estatísticas detalhadas de cliques", "Suporte prioritário"].map((f) => (
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

      {/* PIX Campaigns module */}

      <section id="campanhas-pix" className="border-b bg-gradient-to-b from-background via-brand/[0.04] to-background">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-brand" />
                Módulo Campanhas PIX
              </div>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Receba doações e apoios via PIX <span className="text-brand">direto na sua conta</span>.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Conecte sua conta Mercado Pago em um clique e crie uma página de arrecadação personalizada em <span className="font-medium text-foreground">forlink.app/pix/sua-campanha</span>. Cada colaborador aparece no mural com selo por valor (Bronze até Lenda), e o dinheiro cai direto na sua conta MP — sem intermediação do ForLink.
              </p>

              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  ["PIX instantâneo com QR Code e Copia-e-Cola", QrCode],
                  ["Cartão de crédito, débito e Carteira Mercado Pago", Wallet],
                  ["Meta de arrecadação, valores sugeridos e mensagem opcional", Target],
                  ["Selos automáticos (Bronze · Prata · Ouro · Diamante · Lenda)", Sparkles],
                  ["Repasse da taxa ao apoiador (opcional) — você recebe integral", ShieldCheck],
                ].map(([txt, Icon]) => {
                  const I = Icon as typeof Heart;
                  return (
                    <li key={String(txt)} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                        <I className="h-3 w-3" />
                      </span>
                      <span className="text-muted-foreground"><span className="text-foreground">{String(txt)}</span></span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 rounded-lg border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Taxas transparentes:</strong> taxa ForLink de <strong>2% (mínimo R$ 0,50)</strong> por transação, mais a tarifa padrão do Mercado Pago cobrada do recebedor (~0,99% PIX / ~4,98% cartão). Tudo detalhado na tela de pagamento — o colaborador vê exatamente o que paga e quanto você recebe.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                    Criar minha campanha grátis <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#faq" className="inline-flex items-center gap-1.5 self-center text-sm text-muted-foreground hover:text-foreground">
                  Como funcionam as taxas <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Preview mock */}
            <div className="relative">
              <div className="absolute inset-x-4 -bottom-4 h-32 rounded-2xl bg-brand/10 blur-2xl" aria-hidden />
              <Card className="relative overflow-hidden p-0 shadow-lg">
                <div className="relative h-32 w-full bg-gradient-to-br from-brand to-brand/70">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.25),transparent_50%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                      Campanha ForLink
                    </span>
                    <h3 className="mt-1.5 font-display text-xl font-semibold text-white drop-shadow">
                      Ajude o Studio Aurora
                    </h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Arrecadado</div>
                      <div className="mt-0.5 font-display text-2xl font-semibold text-brand tabular-nums">R$ 3.480</div>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <div className="text-base font-semibold text-foreground">58%</div>
                      <div>da meta R$ 6.000</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: "58%" }} />
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {[
                      ["Marina S.", "Ouro", "R$ 100", "#eab308"],
                      ["Carlos T.", "Prata", "R$ 50", "#64748b"],
                      ["Apoiador anônimo", "Bronze", "R$ 20", "#a16207"],
                    ].map(([name, tier, val, color]) => (
                      <div key={name} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: color }}>
                          <Heart className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium">{name}</div>
                          <div className="text-[10px] text-muted-foreground">{tier}</div>
                        </div>
                        <span className="text-xs font-bold tabular-nums text-brand">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>




      {/* Top ad slot */}
      <div className="mx-auto max-w-6xl px-4">
        
        <AdSlot slot="top" label="Publicidade" />
      </div>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-brand" />
            Perguntas frequentes
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tudo o que você precisa saber</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Se ficar alguma dúvida, fale com a gente em <a href="mailto:contato@forlink.app" className="text-brand hover:underline">contato@forlink.app</a>.
          </p>
        </div>

        <Card className="p-2 sm:p-4">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b last:border-b-0">
                <AccordionTrigger className="px-3 text-left text-sm font-medium sm:text-base">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>


        <AdSlot slot="feed" label="Publicidade" />

        {/* Trust & contact strip */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-5">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <h3 className="mt-3 text-sm font-semibold">Segurança e LGPD</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Seus dados são criptografados e você controla o que é público. Exporte ou exclua sua conta quando quiser.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <Zap className="h-5 w-5 text-brand" />
            <h3 className="mt-3 text-sm font-semibold">Pagamento por PIX</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Assinatura Pro processada via Mercado Pago, com confirmação automática em segundos. Sem cartão obrigatório.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <Mail className="h-5 w-5 text-brand" />
            <h3 className="mt-3 text-sm font-semibold">Suporte humano</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Atendimento em português por e-mail. Assinantes Pro têm prioridade no suporte.
            </p>
          </div>
        </div>
      </section>


      <footer className="border-t bg-secondary/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ForLink · forlink.app</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/sobre" className="hover:text-foreground">Sobre</Link>
            <Link to="/guias" className="hover:text-foreground">Guias</Link>
            <Link to="/contato" className="hover:text-foreground">Contato</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
