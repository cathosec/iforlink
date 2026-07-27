import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { QrCode, Copy, ExternalLink, Award, Medal, Trophy, Gem, Crown, Heart, CheckCircle2 } from "lucide-react";
import { createContribution, getContributionStatus } from "@/lib/pix.functions";
import { LogoWordmark } from "@/components/logo";

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

const BADGE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  bronze: Medal, silver: Award, gold: Trophy, diamond: Gem, legend: Crown,
};
const BADGE_LABEL: Record<string, { label: string; color: string }> = {
  bronze: { label: "Bronze", color: "#a16207" },
  silver: { label: "Prata", color: "#64748b" },
  gold: { label: "Ouro", color: "#eab308" },
  diamond: { label: "Diamante", color: "#38bdf8" },
  legend: { label: "Lenda", color: "#a855f7" },
};

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2"><LogoWordmark /></a>
          <Badge variant="secondary" className="text-[10px]">Pagamento seguro · Mercado Pago</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card className="overflow-hidden">
          <div className="h-40 w-full sm:h-56"
            style={{
              backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined,
              backgroundColor: c.accent_color,
              backgroundSize: "cover", backgroundPosition: "center",
            }}
          />
          <div className="p-6 sm:p-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
            {c.description && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{c.description}</p>
            )}

            <div className="mt-6">
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: c.accent_color }} />
              </div>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <div>
                  <span className="font-display text-2xl font-semibold tabular-nums" style={{ color: c.accent_color }}>
                    {brl(c.raised_cents)}
                  </span>
                  <span className="ml-2 text-muted-foreground">arrecadados de {brl(c.goal_cents)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <Heart className="mr-1 inline h-3.5 w-3.5" />
                  {c.supporters_count} apoiador{c.supporters_count === 1 ? "" : "es"}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <ContributionForm campaign={c} />
            </div>
          </div>
        </Card>

        {c.show_supporters && (
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Apoiadores recentes
            </h2>
            {supportersQ.isLoading ? (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : (supportersQ.data ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Seja o primeiro a apoiar!
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {(supportersQ.data ?? []).map((s) => {
                  const Icon = s.badge_key ? BADGE_ICON[s.badge_key] : Heart;
                  const badge = s.badge_key ? BADGE_LABEL[s.badge_key] : undefined;
                  const name = s.is_anonymous ? "Apoiador anônimo" : (s.supporter_name || "Apoiador");
                  return (
                    <div key={s.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                        style={{ backgroundColor: `${badge?.color ?? "#94a3b8"}20`, color: badge?.color ?? "#64748b" }}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{name}</span>
                          {badge && (
                            <Badge variant="secondary" className="text-[10px]" style={{ color: badge.color }}>
                              {badge.label}
                            </Badge>
                          )}
                          <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">
                            {brl(s.amount_cents)}
                          </span>
                        </div>
                        {s.message && (
                          <p className="mt-1 text-xs italic text-muted-foreground">"{s.message}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 pb-8 text-center text-[11px] text-muted-foreground">
          Página criada com <a href="/" className="underline">ForLink</a> · Pagamentos processados pelo Mercado Pago
        </footer>
      </main>
    </div>
  );
}

function ContributionForm({ campaign: c }: { campaign: CampaignPub }) {
  const qc = useQueryClient();
  const create = useServerFn(createContribution);
  const getStatus = useServerFn(getContributionStatus);

  const [amount, setAmount] = useState(c.suggested_amounts?.[1] ?? c.min_cents);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ id: string; qr_code: string | null; qr_code_base64: string | null; ticket_url: string | null; amount_cents: number } | null>(null);
  const [approved, setApproved] = useState(false);

  const finalAmount = useMemo(() => {
    if (!c.pass_fee_to_supporter) return amount;
    return amount; // taxa exibida separadamente; server soma
  }, [amount, c.pass_fee_to_supporter]);

  const submit = async () => {
    if (!email.includes("@")) return toast.error("E-mail inválido");
    if (amount < c.min_cents) return toast.error(`Valor mínimo ${brl(c.min_cents)}`);
    setCreating(true);
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
      // Polling
      const interval = setInterval(async () => {
        try {
          const s = await getStatus({ data: { id: r.id } });
          if (s.status === "approved") {
            setApproved(true);
            clearInterval(interval);
            qc.invalidateQueries({ queryKey: ["pix-supporters", c.id] });
            toast.success("Pagamento confirmado — muito obrigado!");
          }
        } catch { /* noop */ }
      }, 4000);
      setTimeout(() => clearInterval(interval), 15 * 60_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
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
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5" style={{ color: c.accent_color }} />
          <h3 className="font-semibold">Pague {brl(result.amount_cents)} via PIX</h3>
        </div>
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
        <p className="mt-4 text-xs text-muted-foreground">
          Aguardando confirmação do pagamento... esta página atualiza automaticamente quando o PIX for aprovado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-6">
      <h3 className="font-display text-lg font-semibold">Fazer contribuição</h3>

      <div className="mt-4">
        <Label>Escolha um valor</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(c.suggested_amounts ?? []).map((v) => (
            <button key={v} type="button" onClick={() => setAmount(v)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${amount === v ? "border-transparent text-white" : "hover:bg-accent"}`}
              style={amount === v ? { backgroundColor: c.accent_color } : {}}>
              {brl(v)}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label>Ou digite um valor (R$)</Label>
          <Input type="number" min={c.min_cents / 100} step="0.01" value={(amount / 100).toFixed(2)}
            onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100))} />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Mínimo {brl(c.min_cents)}{c.pass_fee_to_supporter ? " · a taxa do gateway é somada ao valor final" : ""}
          </p>
        </div>
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

      <Button onClick={() => void submit()} disabled={creating || !email || amount < c.min_cents}
        className="mt-5 w-full" style={{ backgroundColor: c.accent_color, color: "#fff" }}>
        {creating ? "Gerando PIX..." : `Contribuir com ${brl(finalAmount)}`}
      </Button>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        O pagamento é processado com segurança pelo Mercado Pago e vai <strong>direto para o criador da campanha</strong>.
      </p>
    </div>
  );
}
