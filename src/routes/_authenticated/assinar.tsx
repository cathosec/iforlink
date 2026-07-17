import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createPixSubscription, getPixStatus } from "@/lib/mercadopago.functions";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, QrCode, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/assinar")({
  component: Assinar,
  head: () => ({ meta: [{ title: "Assinar Pro · ForLink" }] }),
});

type Interval = "month" | "quarter" | "year";
const brl = (c: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

function Assinar() {
  const cfgQ = useQuery({
    queryKey: ["mp-config"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "mercadopago").maybeSingle();
      return (data?.value ?? {}) as {
        enabled?: boolean;
        prices?: { month_cents?: number; quarter_cents?: number; year_cents?: number };
      };
    },
  });

  const create = useServerFn(createPixSubscription);
  const status = useServerFn(getPixStatus);
  const [pix, setPix] = useState<Awaited<ReturnType<typeof create>> | null>(null);
  const [loading, setLoading] = useState<Interval | null>(null);
  const [paid, setPaid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pix || paid) return;
    const iv = setInterval(async () => {
      try {
        const s = await status({ data: { paymentId: pix.id } });
        if (s.status === "approved") {
          setPaid(true);
          clearInterval(iv);
          setTimeout(() => navigate({ to: "/obrigado", search: { p: pix.id } }), 800);
        }
      } catch { /* noop */ }
    }, 4000);
    return () => clearInterval(iv);
  }, [pix, paid, status, navigate]);

  const start = async (interval: Interval) => {
    setLoading(interval);
    try {
      const res = await create({ data: { interval } });
      setPix(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar PIX");
    } finally {
      setLoading(null);
    }
  };

  const prices = cfgQ.data?.prices ?? {};
  const plans: { interval: Interval; label: string; cents: number; hint?: string }[] = [
    { interval: "month", label: "Mensal", cents: prices.month_cents ?? 0 },
    { interval: "quarter", label: "Trimestral", cents: prices.quarter_cents ?? 0, hint: "3 meses" },
    { interval: "year", label: "Anual", cents: prices.year_cents ?? 0, hint: "Economize" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-4xl tracking-tight">Assine o ForLink Pro</h1>
        <p className="mt-2 text-muted-foreground">Pagamento via PIX processado pelo Mercado Pago. Aprovação automática.</p>

        {!cfgQ.data?.enabled && (
          <Card className="mt-6 border-amber-500/40 bg-amber-500/5 p-5 text-sm">
            Pagamentos Mercado Pago ainda não foram ativados pelo administrador.
          </Card>
        )}

        {!pix ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {plans.map(p => (
              <Card key={p.interval} className="flex flex-col p-6">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.label}</div>
                  {p.hint && <Badge variant="secondary">{p.hint}</Badge>}
                </div>
                <div className="mt-3 text-3xl font-semibold">{brl(p.cents)}</div>
                <div className="text-xs text-muted-foreground">
                  {p.interval === "month" ? "por mês" : p.interval === "quarter" ? "por trimestre" : "por ano"}
                </div>
                <Button className="mt-6" disabled={!cfgQ.data?.enabled || loading !== null || p.cents <= 0}
                        onClick={() => start(p.interval)}>
                  {loading === p.interval ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar PIX"}
                </Button>
              </Card>
            ))}
          </div>
        ) : paid ? (
          <Card className="mt-8 flex flex-col items-center p-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h2 className="mt-4 font-display text-2xl">Pagamento confirmado!</h2>
            <p className="text-sm text-muted-foreground">Redirecionando…</p>
          </Card>
        ) : (
          <Card className="mt-8 p-6">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
              <div className="rounded-lg border bg-white p-4">
                {pix.qr_code_base64 ? (
                  <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code PIX" className="h-56 w-56" />
                ) : (
                  <div className="grid h-56 w-56 place-items-center text-muted-foreground"><QrCode className="h-10 w-10" /></div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Valor</div>
                  <div className="text-2xl font-semibold">{brl(pix.amount_cents)}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">PIX Copia e Cola</div>
                  <div className="flex gap-2">
                    <code className="line-clamp-1 flex-1 rounded-md border bg-muted p-2 text-xs">{pix.qr_code}</code>
                    <Button variant="outline" size="icon" onClick={() => {
                      navigator.clipboard.writeText(pix.qr_code ?? "");
                      toast.success("Código copiado");
                    }}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando confirmação do pagamento…
                </div>
                {pix.ticket_url && (
                  <a href={pix.ticket_url} target="_blank" rel="noreferrer" className="text-xs text-brand underline">
                    Abrir comprovante Mercado Pago
                  </a>
                )}
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
