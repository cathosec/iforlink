import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/obrigado")({
  component: Obrigado,
  validateSearch: (s: Record<string, unknown>) => ({ p: typeof s.p === "string" ? s.p : "" }),
  head: () => ({ meta: [{ title: "Assinatura confirmada · ForLink" }] }),
});

const brl = (c: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

function Obrigado() {
  const { p } = Route.useSearch();
  const { refresh } = useAuth();

  const q = useQuery({
    queryKey: ["thanks", p],
    queryFn: async () => {
      if (!p) return null;
      const { data: pix } = await supabase.from("pix_payments").select("*").eq("id", p).maybeSingle();
      if (!pix?.subscription_id) return { pix, sub: null };
      const { data: sub } = await supabase.from("subscriptions").select("*").eq("id", pix.subscription_id).maybeSingle();
      return { pix, sub };
    },
    refetchInterval: (query) => (query.state.data?.sub ? false : 2000),
  });

  useEffect(() => { refresh(); }, [q.data?.sub, refresh]);

  const sub = q.data?.sub;
  const pix = q.data?.pix;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="mt-4 font-display text-4xl tracking-tight">Assinatura confirmada!</h1>
          <p className="mt-2 text-muted-foreground">Obrigado por apoiar o ForLink. Você agora é <strong>Pro</strong>.</p>
        </div>

        <Card className="mt-8 p-6">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <div className="font-semibold">ForLink Pro</div>
            <Badge className="ml-auto" variant="secondary">Ativa</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Valor</div>
              <div className="font-medium">{pix ? brl(pix.amount_cents) : "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Ciclo</div>
              <div className="font-medium capitalize">{pix?.interval === "month" ? "Mensal" : pix?.interval === "quarter" ? "Trimestral" : pix?.interval === "year" ? "Anual" : "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Início</div>
              <div className="font-medium">{sub?.current_period_start ? new Date(sub.current_period_start).toLocaleDateString("pt-BR") : "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Próximo vencimento</div>
              <div className="font-medium">{sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : "—"}</div>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex justify-center gap-3">
          <Link to="/dashboard"><Button>Ir para o painel</Button></Link>
        </div>
      </main>
    </div>
  );
}
