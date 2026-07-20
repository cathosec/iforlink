import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Calendar, CreditCard, CheckCircle2, Clock3, ArrowUpRight, ShieldCheck, Receipt,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/assinatura")({
  component: SubscriptionPage,
  head: () => ({ meta: [{ title: "Assinatura · ForLink" }, { name: "robots", content: "noindex,nofollow" }] }),
});

const brl = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((c ?? 0) / 100);

const intervalLabel = (i?: string | null) =>
  i === "month" ? "Mensal" : i === "quarter" ? "Trimestral" : i === "year" ? "Anual" : (i ?? "—");

function SubscriptionPage() {
  const { user, role } = useAuth();

  const subQ = useQuery({
    queryKey: ["assinatura-active", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const historyQ = useQuery({
    queryKey: ["assinatura-hist", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const pixQ = useQuery({
    queryKey: ["assinatura-pix", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pix_payments")
        .select("id,status,amount_cents,billing_interval:interval,mp_payment_id,created_at,paid_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const sub = subQ.data;
  const end = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const start = sub?.current_period_start ? new Date(sub.current_period_start) : null;
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000)) : null;
  const totalDays = end && start ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000)) : null;
  const usedPct = end && start && totalDays
    ? Math.min(100, Math.max(0, Math.round(((Date.now() - start.getTime()) / (end.getTime() - start.getTime())) * 100)))
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Assinatura</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie seu plano, veja detalhes do período atual e o histórico de pagamentos.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard"><Button variant="outline" size="sm">Voltar ao painel</Button></Link>
            <Link to="/assinar">
              <Button size="sm">
                {role === "pro" ? "Renovar / trocar plano" : "Assinar Pro"}
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Plano atual */}
        <Card className="mt-6 overflow-hidden">
          <div className="border-b bg-gradient-to-r from-brand-soft/60 to-transparent px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</div>
                  <div className="text-xl font-semibold">
                    {role === "pro" ? "ForLink Pro" : role === "admin" ? "Administrador" : "ForLink Free"}
                  </div>
                </div>
              </div>
              {sub ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Ativa
                </Badge>
              ) : role === "admin" ? (
                <Badge variant="secondary"><ShieldCheck className="mr-1 h-3 w-3" /> Sem cobrança</Badge>
              ) : (
                <Badge variant="outline">Sem assinatura ativa</Badge>
              )}
            </div>
          </div>

          {sub ? (
            <div className="grid gap-6 p-6 md:grid-cols-3">
              <Stat icon={<CreditCard className="h-4 w-4" />} label="Valor" value={brl(sub.amount_cents)} hint={`Cobrança ${intervalLabel(sub.interval).toLowerCase()}`} />
              <Stat icon={<Calendar className="h-4 w-4" />} label="Próxima renovação" value={end ? end.toLocaleDateString("pt-BR") : "—"} hint={daysLeft !== null ? `em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}` : undefined} />
              <Stat icon={<Clock3 className="h-4 w-4" />} label="Gateway" value={String(sub.gateway ?? "—")} hint={sub.external_id ? `ID ${String(sub.external_id).slice(0, 12)}…` : undefined} />

              {usedPct !== null && (
                <div className="md:col-span-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{start?.toLocaleDateString("pt-BR")}</span>
                    <span>{usedPct}% do período usado</span>
                    <span>{end?.toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-brand to-brand/70" style={{ width: `${usedPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              {role === "admin"
                ? "Sua conta de administrador tem todos os recursos Pro liberados, sem necessidade de assinatura."
                : "Você ainda não possui uma assinatura ativa. Faça upgrade para o Pro e desbloqueie recursos ilimitados."}
            </div>
          )}
        </Card>

        {/* Benefícios Pro */}
        {role !== "pro" && role !== "admin" && (
          <Card className="mt-6 border-brand/30 bg-brand-soft/40 p-6">
            <h2 className="text-lg font-semibold">Por que fazer upgrade?</h2>
            <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              {[
                "Links e categorias ilimitados",
                "Encurtador de URLs próprio",
                "Perfil sem anúncios",
                "Insights e métricas avançadas",
                "Suporte prioritário por e-mail",
                "Selo Pro no perfil público",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Link to="/assinar"><Button>Ver planos</Button></Link>
            </div>
          </Card>
        )}

        {/* Histórico de pagamentos PIX */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Histórico de pagamentos</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Todos os PIX gerados nesta conta. Pagamentos aprovados ativam o Pro automaticamente.
          </p>

          <Card className="mt-3 overflow-hidden">
            {pixQ.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
            ) : (pixQ.data ?? []).length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Nenhum pagamento registrado.</div>
            ) : (
              <ul className="divide-y">
                {pixQ.data!.map((p: any) => {
                  const status = String(p.status ?? "pending");
                  const tone =
                    status === "approved"
                      ? "bg-emerald-500/15 text-emerald-700"
                      : status === "pending"
                      ? "bg-amber-500/15 text-amber-700"
                      : "bg-rose-500/15 text-rose-700";
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div>
                        <div className="font-medium">
                          {brl(p.amount_cents)} · {intervalLabel(p.billing_interval)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("pt-BR")}
                          {p.mp_payment_id ? ` · MP ${p.mp_payment_id}` : ""}
                        </div>
                      </div>
                      <Badge className={tone + " hover:" + tone}>
                        {status === "approved" ? "Aprovado" : status === "pending" ? "Aguardando" : status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Histórico de assinaturas */}
        {(historyQ.data ?? []).length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Assinaturas anteriores</h2>
            <Card className="mt-3 overflow-hidden">
              <ul className="divide-y">
                {historyQ.data!.map((s: any) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <div className="font-medium">
                        {intervalLabel(s.interval)} · {brl(s.amount_cents)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString("pt-BR") : "—"}
                        {" → "}
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("pt-BR") : "—"}
                      </div>
                    </div>
                    <Badge variant={s.status === "active" ? "default" : "outline"} className="capitalize">
                      {s.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        <Separator className="my-10" />
        <p className="text-center text-xs text-muted-foreground">
          Dúvidas sobre cobrança? Fale conosco pelo e-mail de suporte.
        </p>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
