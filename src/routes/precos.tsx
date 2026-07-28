import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  QrCode,
  ArrowRight,
  Info,
  Scissors,
  Heart,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdSlot } from "@/components/ad-slot";

type Interval = "month" | "quarter" | "year";

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((c ?? 0) / 100);

export const Route = createFileRoute("/precos")({
  component: Precos,
  head: () => {
    const title = "Preços ForLink — Plano Free grátis e Pro via PIX a partir de R$ 9,90/mês";
    const description =
      "Compare o plano Free e o Pro da ForLink. Bio link, agregador de links, campanhas via Mercado Pago, encurtador e estatísticas. Assine via PIX em segundos.";
    const url = "https://forlink.app/precos";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "https://forlink.app/brand/og-image.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: "https://forlink.app/brand/og-image.png" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

const FEATURES: {
  group: string;
  items: { name: string; hint?: string; free: boolean | string; pro: boolean | string }[];
}[] = [
  {
    group: "Perfil e links",
    items: [
      { name: "Perfil público em forlink.app/seu-usuario", free: true, pro: true },
      { name: "Links no perfil", free: "Até 15", pro: "Ilimitados" },
      { name: "Categorias organizadas por ícone", free: "Até 3", pro: "Ilimitadas" },
      { name: "Reordenar links (drag & drop)", free: true, pro: true },
      { name: "Links privados só para você", free: true, pro: true },
      { name: "Favicon automático + prévia de URL", free: true, pro: true },
    ],
  },
  {
    group: "Campanhas (Mercado Pago)",
    items: [
      { name: "Campanhas ativas em /pix/slug", free: "1 campanha", pro: "Ilimitadas" },
      { name: "PIX + Cartão + Carteira Mercado Pago", free: true, pro: true },
      { name: "Repasse da taxa ao apoiador (opcional)", free: true, pro: true },
      { name: "Mural de apoiadores com selos por valor", free: true, pro: true },
      { name: "Meta de arrecadação e barra de progresso", free: true, pro: true },
      { name: "Taxa ForLink por transação", free: "Padrão", pro: "Reduzida (em breve)" },
    ],
  },
  {
    group: "Encurtador de links",
    items: [
      { name: "Encurtador forlink.app/s/codigo", free: false, pro: true },
      { name: "Preserva SEO do link original (canonical + 301)", free: false, pro: true },
      { name: "Estatísticas de cliques por link curto", free: false, pro: true },
    ],
  },
  {
    group: "Marca, SEO e mais",
    items: [
      { name: "Sem anúncios em todo o site", free: false, pro: true },
      { name: "Selo de verificação", free: false, pro: true },
      { name: "Estatísticas detalhadas de cliques", free: "Básicas", pro: "Avançadas" },
      { name: "Suporte", free: "Comunidade", pro: "Prioritário" },
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Como funciona o pagamento?",
    a: "A assinatura Pro é cobrada via PIX pelo Mercado Pago, com opção mensal, trimestral ou anual. O QR Code é gerado na hora e a confirmação é automática — o Pro é liberado assim que o pagamento é aprovado.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Você cancela pelo painel em Assinatura e continua com todos os benefícios Pro até o fim do período já pago. Depois disso, sua conta volta automaticamente para o plano Free — sem perder nenhum link ou campanha.",
  },
  {
    q: "O dinheiro das minhas campanhas passa pela ForLink?",
    a: "Não. A ForLink apenas gera o QR Code e o link — o dinheiro cai direto na sua conta Mercado Pago. Cobramos uma taxa de plataforma por transação (configurada pelo super admin), que você pode escolher descontar da doação ou repassar ao apoiador.",
  },
  {
    q: "Preciso de cartão para começar?",
    a: "Não. O plano Free é gratuito para sempre, sem cartão. Para o Pro, o pagamento é 100% via PIX, sem cadastro de cartão.",
  },
  {
    q: "E se eu já sou Free e quiser fazer upgrade depois?",
    a: "Basta clicar em Assinar Pro no painel a qualquer momento. Nada é perdido — seus links, categorias e campanhas continuam iguais e ganham os benefícios do Pro imediatamente.",
  },
  {
    q: "Vocês emitem recibo/nota?",
    a: "Sim. Todo pagamento aprovado gera comprovante do Mercado Pago no e-mail cadastrado. Precisa de nota fiscal para empresa? Fale com a gente pelo /contato.",
  },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-brand" />;
  if (v === false) return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  return <span className="text-xs text-muted-foreground">{v}</span>;
}

function Precos() {
  const [interval, setInterval] = useState<Interval>("month");

  const cfgQ = useQuery({
    queryKey: ["mp-config-public"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pricing_public");
      if (error) throw error;
      return (data ?? {}) as {
        enabled?: boolean;
        prices?: { month_cents?: number; quarter_cents?: number; year_cents?: number };
      };
    },
    staleTime: 60_000,
  });

  const prices = cfgQ.data?.prices ?? {};
  const monthC = prices.month_cents ?? 990;
  const quarterC = prices.quarter_cents ?? 2670;
  const yearC = prices.year_cents ?? 9900;

  const selected = interval === "month" ? monthC : interval === "quarter" ? quarterC : yearC;

  // Preço equivalente por mês para comparação honesta
  const perMonthEq = useMemo(() => {
    if (interval === "month") return monthC;
    if (interval === "quarter") return Math.round(quarterC / 3);
    return Math.round(yearC / 12);
  }, [interval, monthC, quarterC, yearC]);

  const savings = useMemo(() => {
    if (interval === "month" || monthC === 0) return 0;
    const total12 = monthC * (interval === "quarter" ? 3 : 12);
    const paid = interval === "quarter" ? quarterC : yearC;
    const pct = Math.round(((total12 - paid) / total12) * 100);
    return pct > 0 ? pct : 0;
  }, [interval, monthC, quarterC, yearC]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "ForLink Pro",
    description: "Assinatura Pro da ForLink: bio link, campanhas ilimitadas, encurtador e sem anúncios.",
    brand: { "@type": "Brand", name: "ForLink" },
    offers: [
      { "@type": "Offer", name: "Mensal", price: (monthC / 100).toFixed(2), priceCurrency: "BRL", availability: "https://schema.org/InStock", url: "https://forlink.app/precos" },
      { "@type": "Offer", name: "Trimestral", price: (quarterC / 100).toFixed(2), priceCurrency: "BRL", availability: "https://schema.org/InStock", url: "https://forlink.app/precos" },
      { "@type": "Offer", name: "Anual", price: (yearC / 100).toFixed(2), priceCurrency: "BRL", availability: "https://schema.org/InStock", url: "https://forlink.app/precos" },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* HERO */}
      <section className="border-b bg-gradient-to-b from-brand/[0.05] via-background to-background">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Preços simples, sem pegadinhas
          </span>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Comece grátis. <span className="text-brand">Cresça no Pro.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Um plano gratuito para sempre e um Pro pago via PIX, sem cartão obrigatório. Cancele quando quiser — nada de contrato.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex rounded-full border bg-card p-1 text-sm">
            {(
              [
                { k: "month", label: "Mensal" },
                { k: "quarter", label: "Trimestral" },
                { k: "year", label: "Anual" },
              ] as { k: Interval; label: string }[]
            ).map((opt) => (
              <button
                key={opt.k}
                onClick={() => setInterval(opt.k)}
                className={`relative rounded-full px-4 py-1.5 font-medium transition ${
                  interval === opt.k ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
                {opt.k === "year" && (
                  <span className="ml-1 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                    Melhor
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="border-b">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 md:grid-cols-2">
          {/* Free */}
          <Card className="flex flex-col p-6">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-semibold">Free</h2>
              <span className="text-xs text-muted-foreground">para sempre</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tight">R$ 0</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Tudo o que você precisa para começar seu bio link.</p>

            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Perfil público em forlink.app/seu-usuario",
                "Até 15 links e 3 categorias",
                "1 campanha ativa no Mercado Pago",
                "Links privados só para você",
                "Reordenar links com drag & drop",
                "Sincronização em todo dispositivo",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Link to="/auth">
                <Button variant="outline" className="w-full">Criar conta grátis</Button>
              </Link>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Sem cartão. Anúncios discretos ajudam a manter o serviço no ar.
              </p>
            </div>
          </Card>

          {/* Pro */}
          <Card className="relative flex flex-col overflow-hidden border-brand/30 bg-gradient-to-b from-brand/[0.06] to-transparent p-6">
            <div className="absolute right-4 top-4">
              <Badge className="bg-brand text-brand-foreground hover:bg-brand">Mais popular</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-semibold">Pro</h2>
              <span className="text-xs text-muted-foreground">via PIX</span>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tight">{brl(perMonthEq)}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {interval === "month" && <>Cobrado mensalmente</>}
              {interval === "quarter" && <>Cobrado {brl(quarterC)} a cada 3 meses{savings > 0 && <> · economize {savings}%</>}</>}
              {interval === "year" && <>Cobrado {brl(yearC)} por ano{savings > 0 && <> · economize {savings}%</>}</>}
            </div>

            <ul className="mt-6 space-y-2 text-sm">
              {[
                ["Sem anúncios em todo o site", Zap],
                ["Links e categorias ilimitados", Check],
                ["Campanhas ilimitadas no Mercado Pago", Heart],
                ["Encurtador forlink.app/s/", Scissors],
                ["Selo de verificação", ShieldCheck],
                ["Estatísticas avançadas de cliques", BarChart3],
                ["Suporte prioritário", Sparkles],
              ].map(([txt, Icon]) => {
                const I = Icon as typeof Check;
                return (
                  <li key={String(txt)} className="flex items-start gap-2">
                    <I className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <span>{String(txt)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto pt-6">
              <Link to="/assinar">
                <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                  Assinar Pro por {brl(selected)} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                <QrCode className="h-3 w-3" /> Pagamento via PIX · confirmação automática · cancele quando quiser
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* AD SLOT (mostra só para Free em outras páginas — na página de preços fica discreto) */}
      <div className="mx-auto max-w-5xl px-4">
        <AdSlot slot="feed" className="my-4" />
      </div>

      {/* COMPARISON TABLE */}
      <section className="border-b bg-secondary/20">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Compare os planos</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tudo o que você recebe em cada plano, lado a lado.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="p-4 font-medium text-muted-foreground">Recurso</th>
                  <th className="w-32 p-4 text-center font-medium text-muted-foreground">Free</th>
                  <th className="w-32 p-4 text-center font-medium text-brand">Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((g) => (
                  <>
                    <tr key={g.group} className="bg-secondary/20">
                      <td colSpan={3} className="p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {g.group}
                      </td>
                    </tr>
                    {g.items.map((it) => (
                      <tr key={it.name} className="border-t">
                        <td className="p-4">
                          <span className="font-medium">{it.name}</span>
                          {it.hint && <span className="ml-1 text-xs text-muted-foreground">· {it.hint}</span>}
                        </td>
                        <td className="p-4 text-center"><Cell v={it.free} /></td>
                        <td className="p-4 text-center"><Cell v={it.pro} /></td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-lg border bg-background p-4 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>
              Os valores exibidos podem ser ajustados a qualquer momento pelo super admin. Assinantes ativos mantêm o preço até o fim do período contratado.
            </span>
          </div>
        </div>
      </section>

      <AddonsSection />



      {/* FAQ */}
      <section className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Perguntas frequentes</h2>
          <div className="mt-8 divide-y rounded-xl border bg-card">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-5 open:bg-secondary/20">
                <summary className="cursor-pointer list-none text-sm font-medium">
                  <span className="mr-2 text-brand">›</span>{f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pronto para começar?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Crie sua conta grátis em menos de 30 segundos ou já assine o Pro via PIX e libere tudo agora.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" variant="outline">Criar conta grátis</Button>
            </Link>
            <Link to="/assinar">
              <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                Assinar Pro <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Complementos (Fase 4 Monetização)
// ============================================================================
type AddonCatalogItem = { key: string; label: string; price_cents: number; description: string };

function AddonsSection() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  useMemo(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id } : null));
  }, []);

  const catalogQ = useQuery({
    queryKey: ["addons-catalog"],
    queryFn: async (): Promise<AddonCatalogItem[]> => {
      const { data } = await supabase.rpc("get_public_setting", { _key: "addons" });
      const items = (data as { items?: AddonCatalogItem[] } | null)?.items ?? [];
      return items;
    },
  });

  const myAddonsQ = useQuery({
    queryKey: ["my-addons", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_addons")
        .select("addon,status").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const request = async (item: AddonCatalogItem) => {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    const { error } = await supabase.from("user_addons").insert({
      user_id: user.id, addon: item.key, price_cents: item.price_cents, status: "requested",
    } as never);
    if (error) {
      alert(error.message);
      return;
    }
    void myAddonsQ.refetch();
    alert("Solicitação enviada! Entraremos em contato para ativar.");
  };

  const items = catalogQ.data ?? [];
  if (items.length === 0) return null;

  const mine = new Map((myAddonsQ.data ?? []).map((r) => [r.addon, r.status]));

  return (
    <section className="border-b bg-secondary/20">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-3">Complementos opcionais</Badge>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Add-ons para escalar mais</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Contrate apenas o que precisar. Solicite pelo painel e nossa equipe ativa em até 1 dia útil.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => {
            const status = mine.get(it.key);
            const isActive = status === "active";
            const isPending = status === "requested";
            return (
              <Card key={it.key} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold">{it.label}</h3>
                    <Sparkles className="h-4 w-4 text-brand" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{it.description}</p>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold">{brl(it.price_cents)}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">por mês</div>
                  </div>
                  <Button
                    size="sm"
                    disabled={isActive || isPending}
                    variant={isActive ? "secondary" : "outline"}
                    onClick={() => void request(it)}
                  >
                    {isActive ? "Ativo" : isPending ? "Solicitado" : "Solicitar"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
