import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, Copy, ExternalLink, Heart, CheckCircle2, ShieldCheck, Sparkles, Users, AlertTriangle, Loader2 } from "lucide-react";
import { createContribution, getContributionStatus, getCampaignPaymentContext } from "@/lib/pix.functions";
import { LogoWordmark } from "@/components/logo";
import { PixBadge, PIX_BADGE_META, type PixBadgeKey } from "@/components/pix-badges";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PixCardCheckout } from "@/components/pix-card-checkout";
// Marca "Mercado Pago" renderizada como badge de texto para evitar
// dependência de asset externo (URLs de CDN quebravam após deploy).


interface CampaignPub {
  id: string; user_id: string; slug: string; title: string;
  description: string | null; cover_url: string | null; accent_color: string;
  goal_cents: number; min_cents: number; suggested_amounts: number[];
  accepts_card: boolean; pass_fee_to_supporter: boolean; show_supporters: boolean;
  allow_message: boolean; ends_at: string | null; raised_cents: number;
  supporters_count: number;
}

interface Supporter {
  id: string; supporter_name: string | null; message: string | null;
  is_anonymous: boolean; amount_cents: number; badge_key: string | null; approved_at: string | null;
}

const BADGE_KEYS: PixBadgeKey[] = ["bronze", "silver", "gold", "diamond", "legend"];
const isBadgeKey = (k: string | null | undefined): k is PixBadgeKey =>
  !!k && (BADGE_KEYS as string[]).includes(k);

const brl = (c: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

export const Route = createFileRoute("/pix/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase.from("pix_campaigns")
      .select("id,user_id,slug,title,description,cover_url,accent_color,goal_cents,min_cents,suggested_amounts,accepts_card,pass_fee_to_supporter,show_supporters,allow_message,ends_at,raised_cents,supporters_count")
      .eq("slug", params.slug).eq("is_active", true).maybeSingle();
    if (!data) throw notFound();
    return { campaign: data as CampaignPub };
  },
  component: PublicPixPage,
  head: ({ loaderData }) => {
    const c = loaderData?.campaign;
    if (!c) return { meta: [{ title: "Campanha · ForLink" }] };
    const desc = (c.description ?? `Apoie ${c.title} via PIX no ForLink.`).slice(0, 155);
    return {
      meta: [
        { title: `${c.title} · Apoie via PIX · ForLink` },
        { name: "description", content: desc },
        { property: "og:title", content: c.title },
        { property: "og:description", content: desc.slice(0, 120) },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "ForLink" },
        { property: "og:locale", content: "pt_BR" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(c.cover_url ? [
          { property: "og:image", content: c.cover_url.startsWith("http") ? c.cover_url : `https://forlink.app${c.cover_url}` },
          { name: "twitter:image", content: c.cover_url.startsWith("http") ? c.cover_url : `https://forlink.app${c.cover_url}` },
        ] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Campanha não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">O link pode ter expirado ou a campanha foi desativada.</p>
      </div>
    </div>
  ),
});

function PublicPixPage() {
  const { campaign: c } = Route.useLoaderData();
  const pct = c.goal_cents > 0 ? Math.min(100, (c.raised_cents / c.goal_cents) * 100) : 0;

  const supportersQ = useQuery({
    queryKey: ["pix-supporters", c.id],
    enabled: c.show_supporters,
    queryFn: async () => {
      const { data } = await supabase.from("pix_contributions")
        .select("id,supporter_name,message,is_anonymous,amount_cents,badge_key,approved_at")
        .eq("campaign_id", c.id).eq("status", "approved")
        .order("approved_at", { ascending: false }).limit(50);
      return (data as Supporter[]) ?? [];
    },
    refetchInterval: 15000,
  });

  const accent = c.accent_color || "#2b7fff";

  return (
    <div className="min-h-screen bg-background">
      {/* Faixa colorida decorativa */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] opacity-[0.12]"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent} 0%, transparent 70%)` }}
      />

      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2"><LogoWordmark /></a>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden gap-1 text-[10px] sm:inline-flex">
              <ShieldCheck className="h-3 w-3" /> Pagamento seguro
            </Badge>
            <div className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
              <span className="text-[10px] text-muted-foreground">via</span>
              <span className="text-[11px] font-semibold tracking-tight text-foreground">Mercado Pago</span>
            </div>

          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card className="overflow-hidden border-0 shadow-xl ring-1 ring-border/60">
          <div className="relative h-44 w-full sm:h-64"
            style={{
              backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined,
              backgroundColor: accent,
              backgroundSize: "cover", backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/95 text-[10px] font-semibold uppercase tracking-wider text-foreground hover:bg-white">
                  Campanha ForLink
                </Badge>
                {c.ends_at && (
                  <Badge variant="secondary" className="bg-black/50 text-[10px] text-white backdrop-blur">
                    Encerra em {new Date(c.ends_at).toLocaleDateString("pt-BR")}
                  </Badge>
                )}
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white drop-shadow sm:text-4xl">
                {c.title}
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {c.description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">
                {c.description}
              </p>
            )}

            <div className="mt-7 rounded-2xl border bg-gradient-to-br from-muted/30 to-transparent p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Arrecadado</div>
                  <div className="mt-1 font-display text-3xl font-semibold tabular-nums sm:text-4xl" style={{ color: accent }}>
                    {brl(c.raised_cents)}
                  </div>
                  {c.goal_cents > 0 && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      de <strong className="text-foreground">{brl(c.goal_cents)}</strong> como meta
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right text-xs text-muted-foreground">
                  <div>
                    <div className="flex items-center justify-end gap-1 text-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-lg font-semibold tabular-nums">{c.supporters_count}</span>
                    </div>
                    <div>apoiadores</div>
                  </div>
                  {c.goal_cents > 0 && (
                    <div>
                      <div className="text-lg font-semibold text-foreground tabular-nums">{pct.toFixed(0)}%</div>
                      <div>da meta</div>
                    </div>
                  )}
                </div>
              </div>
              {c.goal_cents > 0 && (
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-background ring-1 ring-inset ring-border">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}dd)` }} />
                </div>
              )}
            </div>

            {/* Tiers de selos */}
            <div className="mt-6 rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selos por contribuição</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {BADGE_KEYS.map((k) => (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <PixBadge badgeKey={k} size={40} />
                    <div className="text-[10px] font-medium text-muted-foreground">{PIX_BADGE_META[k].label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <ContributionForm campaign={c} />
            </div>
          </div>
        </Card>

        {c.show_supporters && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Mural de apoiadores</h2>
              <span className="text-xs text-muted-foreground">
                {(supportersQ.data ?? []).length} confirmado{(supportersQ.data ?? []).length === 1 ? "" : "s"}
              </span>
            </div>
            {supportersQ.isLoading ? (
              <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (supportersQ.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <Heart className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">Seja o primeiro a apoiar esta campanha!</p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {(supportersQ.data ?? []).map((s) => {
                  const key = isBadgeKey(s.badge_key) ? s.badge_key : null;
                  const meta = key ? PIX_BADGE_META[key] : undefined;
                  const name = s.is_anonymous ? "Apoiador anônimo" : (s.supporter_name || "Apoiador");
                  return (
                    <div key={s.id} className="group flex items-start gap-3 rounded-xl border bg-card p-3 transition hover:shadow-md">
                      <div className="shrink-0">
                        {key ? <PixBadge badgeKey={key} size={44} />
                          : <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground"><Heart className="h-5 w-5" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold">{name}</span>
                          {meta && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{ background: `${meta.color}18`, color: meta.color }}>
                              {meta.label}
                            </span>
                          )}
                          <span className="ml-auto text-sm font-bold tabular-nums" style={{ color: accent }}>
                            {brl(s.amount_cents)}
                          </span>
                        </div>
                        {s.message && (
                          <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">"{s.message}"</p>
                        )}
                        {s.approved_at && (
                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            {new Date(s.approved_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <footer className="mt-12 flex flex-col items-center gap-2 pb-10 text-center text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pagamento processado com segurança pelo Mercado Pago — vai <strong className="text-foreground">direto para o criador</strong>.
          </div>
          <div>
            Página criada com <a href="/" className="font-medium text-brand hover:underline">ForLink</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

function ContributionForm({ campaign: c }: { campaign: CampaignPub }) {
  const qc = useQueryClient();
  const create = useServerFn(createContribution);
  const getStatus = useServerFn(getContributionStatus);
  const getCtx = useServerFn(getCampaignPaymentContext);

  const ctxQ = useQuery({
    queryKey: ["pix-campaign-ctx", c.slug],
    queryFn: () => getCtx({ data: { slug: c.slug } }),
    // Sempre carrega para exibir o detalhamento de taxas mesmo em campanhas PIX-only
    staleTime: 5 * 60_000,
  });

  const [amount, setAmount] = useState(c.suggested_amounts?.[1] ?? c.min_cents);
  const [amountInput, setAmountInput] = useState(((c.suggested_amounts?.[1] ?? c.min_cents) / 100).toFixed(2).replace(".", ","));
  const [activeMethod, setActiveMethod] = useState<"pix" | "card">("pix");
  const syncAmount = (raw: string) => {
    // permite dígitos, vírgula e ponto; converte para centavos
    const cleaned = raw.replace(/[^\d.,]/g, "");
    setAmountInput(cleaned);
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    if (!isNaN(num) && num > 0) setAmount(Math.round(num * 100));
    else if (cleaned === "") setAmount(0);
  };
  const pickSuggested = (v: number) => {
    setAmount(v);
    setAmountInput((v / 100).toFixed(2).replace(".", ","));
  };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ id: string; qr_code: string | null; qr_code_base64: string | null; ticket_url: string | null; amount_cents: number } | null>(null);
  const [approved, setApproved] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const feePct = Number(ctxQ.data?.fee_percent ?? 0);
  const minFeeCents = Number(ctxQ.data?.min_fee_cents ?? 0);
  const mpPixPct = Number(ctxQ.data?.mp_fee_pix_percent ?? 0);
  const mpCardPct = Number(ctxQ.data?.mp_fee_card_percent ?? 0);
  const mpCardFixed = Number(ctxQ.data?.mp_fee_card_fixed_cents ?? 0);
  const feeCents = amount > 0 ? Math.max(minFeeCents, Math.round((amount * feePct) / 100)) : 0;
  const passesFee = c.pass_fee_to_supporter;
  const mpPct = activeMethod === "card" ? mpCardPct : mpPixPct;
  const mpFixed = activeMethod === "card" ? mpCardFixed : 0;
  // Quando o criador repassa as taxas, ambas (ForLink + MP) são SOMADAS ao valor
  // pago pelo colaborador, de modo que o criador receba integralmente `amount`.
  // Como a tarifa MP incide sobre o valor cobrado (grossToMp), resolvemos:
  //   grossToMp = (amount + feeForLink + mpFixed) / (1 - mpPct/100)
  let finalAmount: number;
  let mpFeeCents: number;
  if (amount <= 0) {
    finalAmount = 0;
    mpFeeCents = 0;
  } else if (passesFee) {
    const denom = Math.max(0.01, 1 - mpPct / 100);
    const gross = Math.ceil((amount + feeCents + mpFixed) / denom);
    finalAmount = gross;
    mpFeeCents = Math.round((gross * mpPct) / 100) + mpFixed;
  } else {
    finalAmount = amount;
    mpFeeCents = Math.round((amount * mpPct) / 100) + mpFixed;
  }
  const netAmount = passesFee
    ? Math.max(0, finalAmount - feeCents - mpFeeCents)
    : Math.max(0, amount - feeCents - mpFeeCents);
  const mpFeeAddedToSupporter = passesFee ? Math.max(0, finalAmount - amount - feeCents) : 0;



  const submit = async () => {
    if (!email.includes("@")) return toast.error("E-mail inválido");
    if (amount < c.min_cents) return toast.error(`Valor mínimo ${brl(c.min_cents)}`);
    setCreating(true);
    setFailed(null);
    try {
      const r = await create({
        data: {
          campaignSlug: c.slug,
          amount_cents: amount,
          method: "pix",
          supporter_email: email,
          supporter_name: name || undefined,
          message: message || undefined,
          is_anonymous: anon,
        },
      });
      setResult(r);
      // Polling — confirma aprovação ou detecta rejeição/expiração
      const interval = setInterval(async () => {
        try {
          const s = await getStatus({ data: { id: r.id } });
          if (s.status === "approved") {
            setApproved(true);
            clearInterval(interval);
            qc.invalidateQueries({ queryKey: ["pix-supporters", c.id] });
            toast.success("Pagamento confirmado — muito obrigado!");
          } else if (["rejected", "cancelled", "expired", "refunded", "charged_back"].includes(s.status)) {
            const map: Record<string, string> = {
              rejected: "Pagamento rejeitado pelo Mercado Pago.",
              cancelled: "Pagamento cancelado.",
              expired: "O QR Code expirou. Gere um novo para continuar.",
              refunded: "Pagamento estornado.",
              charged_back: "Pagamento contestado.",
            };
            setFailed(map[s.status] ?? `Status ${s.status}`);
            clearInterval(interval);
            toast.error(map[s.status] ?? `Falha no pagamento (${s.status})`);
          }
        } catch { /* noop */ }
      }, 4000);
      setTimeout(() => clearInterval(interval), 15 * 60_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar cobrança");
    } finally {
      setCreating(false);
    }
  };

  const copyPix = async () => {
    if (result?.qr_code) {
      await navigator.clipboard.writeText(result.qr_code);
      toast.success("Código PIX copiado");
    }
  };

  if (approved) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="mt-3 font-display text-xl font-semibold">Pagamento confirmado!</h3>
        <p className="mt-1 text-sm text-muted-foreground">Muito obrigado pelo apoio de {brl(result!.amount_cents)}.</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-xl border p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5" style={{ color: c.accent_color }} />
            <h3 className="font-semibold">Pague {brl(result.amount_cents)} via PIX</h3>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mercado Pago</span>
        </div>

        {failed ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Não foi possível confirmar o pagamento</div>
              <div className="text-xs opacity-90">{failed}</div>
              <button type="button" onClick={() => { setResult(null); setFailed(null); }}
                className="mt-2 text-xs font-medium underline underline-offset-2">
                Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          <>
            {result.qr_code_base64 && (
              <div className="mt-4 grid place-items-center">
                <img src={`data:image/png;base64,${result.qr_code_base64}`} alt="QR Code PIX" className="h-56 w-56" />
              </div>
            )}
            {result.qr_code && (
              <div className="mt-4">
                <Label>PIX Copia e Cola</Label>
                <div className="mt-1 flex gap-2">
                  <Input value={result.qr_code} readOnly className="font-mono text-xs" />
                  <Button variant="outline" onClick={() => void copyPix()}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {result.ticket_url && (
              <a href={result.ticket_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver comprovante Mercado Pago
              </a>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Aguardando confirmação do pagamento — esta página atualiza sozinha em segundos após o PIX ser aprovado.
            </p>
          </>
        )}
      </div>
    );
  }


  return (
    <div className="rounded-xl border p-6">
      <h3 className="font-display text-lg font-semibold">Fazer contribuição</h3>

      <div className="mt-4 rounded-2xl border bg-gradient-to-br from-background to-muted/30 p-4">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Escolha um valor</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(c.suggested_amounts ?? []).map((v) => (
            <button key={v} type="button" onClick={() => pickSuggested(v)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${amount === v ? "border-transparent text-white shadow-sm" : "hover:bg-accent"}`}
              style={amount === v ? { backgroundColor: c.accent_color } : {}}>
              {brl(v)}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ou digite um valor</Label>
          <div className="mt-1.5 flex items-center rounded-xl border bg-background focus-within:ring-2 focus-within:ring-ring/40 transition">
            <span className="pl-3 pr-1 text-sm font-semibold text-muted-foreground">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => syncAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="0,00"
              className="w-full bg-transparent px-2 py-2.5 text-lg font-semibold outline-none tabular-nums"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Mínimo {brl(c.min_cents)}
          </p>
        </div>

        {/* Detalhamento transparente da taxa */}
        {amount > 0 && (
          <div className="mt-3 rounded-xl border bg-background/60 p-3 text-xs">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold text-foreground">Resumo da contribuição</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Taxa ForLink: {feePct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                {minFeeCents > 0 ? ` · mín. ${brl(minFeeCents)}` : ""}
              </span>
            </div>
            <dl className="space-y-1 tabular-nums">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sua contribuição</dt>
                <dd className="font-medium">{brl(amount)}</dd>
              </div>
              {feeCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Taxa ForLink {passesFee ? "(paga por você)" : "(descontada do criador)"}
                  </dt>
                  <dd className={passesFee ? "font-medium" : "text-muted-foreground"}>
                    {passesFee ? "+ " : "− "}{brl(feeCents)}
                  </dd>
                </div>
              )}
              <div className="mt-1.5 flex justify-between border-t pt-1.5">
                <dt className="font-semibold">Você paga</dt>
                <dd className="font-bold" style={{ color: c.accent_color }}>
                  {brl(finalAmount)}
                </dd>
              </div>
              {mpFeeCents > 0 && (
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <dt>
                    Tarifa Mercado Pago {activeMethod === "card"
                      ? `(~${mpCardPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% cartão)`
                      : `(~${mpPixPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% PIX)`}
                  </dt>
                  <dd>− {brl(mpFeeCents)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 text-[11px]">
                <dt className="font-medium text-muted-foreground">Recebido pelo criador (estimado)</dt>
                <dd className="font-semibold text-foreground">{brl(netAmount)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              {feeCents > 0 && (passesFee
                ? "A taxa ForLink é somada ao seu valor para que o criador receba integralmente o que você quis contribuir. "
                : "A taxa ForLink é descontada do valor recebido pelo criador — nada é adicionado ao que você paga. ")}
              A tarifa do Mercado Pago é cobrada diretamente do criador pelo processador de pagamento e pode variar conforme o plano/conta MP dele (valores exibidos são estimativas padrão para contas Brasil). O repasse é feito automaticamente à conta MP do criador, sem intermediação do ForLink.
            </p>
          </div>
        )}

      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Seu nome (opcional)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer aparecer no mural" />
        </div>
        <div>
          <Label>Seu e-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
        </div>
      </div>

      {c.allow_message && (
        <div className="mt-3">
          <Label>Mensagem (opcional)</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={280} placeholder="Deixe uma palavra de apoio" />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Switch id="anon" checked={anon} onCheckedChange={setAnon} />
        <Label htmlFor="anon" className="text-sm">Doar anonimamente</Label>
      </div>

      <div className="mt-5">
        <Tabs
          defaultValue="pix"
          className="w-full"
          onValueChange={(v) => setActiveMethod(v === "card" ? "card" : "pix")}
        >
          <TabsList className={`grid w-full ${c.accepts_card ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="pix">PIX (instantâneo)</TabsTrigger>
            {c.accepts_card && <TabsTrigger value="card">Cartão · Carteira MP</TabsTrigger>}
          </TabsList>


          <TabsContent value="pix" className="mt-4">
            <Button onClick={() => void submit()} disabled={creating || !email || amount < c.min_cents}
              className="w-full" style={{ backgroundColor: c.accent_color, color: "#fff" }}>
              {creating ? "Gerando PIX..." : `Contribuir com ${brl(finalAmount)} via PIX`}
            </Button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              QR Code e código Copia-e-Cola gerados na hora. Vai <strong>direto para o criador</strong>.
            </p>
          </TabsContent>

          {c.accepts_card && (
            <TabsContent value="card" className="mt-4">
              {ctxQ.isLoading ? (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Carregando checkout…</div>
              ) : (
                <PixCardCheckout
                  publicKey={ctxQ.data?.public_key ?? ""}
                  campaignSlug={c.slug}
                  amountCents={amount}
                  supporterName={name}
                  supporterEmail={email}
                  message={message}
                  isAnonymous={anon}
                  acceptsCard={c.accepts_card}
                  accent={c.accent_color}
                  onApproved={(cents) => {
                    setResult({ id: "card", qr_code: null, qr_code_base64: null, ticket_url: null, amount_cents: cents });
                    setApproved(true);
                    qc.invalidateQueries({ queryKey: ["pix-supporters", c.id] });
                  }}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
