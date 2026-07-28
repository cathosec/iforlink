import { useEffect, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { processCardPayment, getContributionStatus } from "@/lib/pix.functions";

interface Props {
  publicKey: string;
  campaignSlug: string;
  amountCents: number;
  supporterName?: string;
  supporterEmail: string;
  message?: string;
  isAnonymous?: boolean;
  acceptsCard: boolean;
  accent: string;
  onApproved: (amountCents: number) => void;
}

// Init SDK apenas uma vez por public_key (com locale pt-BR)
let currentKey: string | null = null;
function ensureInit(pk: string) {
  if (currentKey === pk) return;
  currentKey = pk;
  initMercadoPago(pk, { locale: "pt-BR" });
}

export function PixCardCheckout({
  publicKey, campaignSlug, amountCents, supporterName, supporterEmail,
  message, isAnonymous, acceptsCard, accent, onApproved,
}: Props) {
  const process = useServerFn(processCardPayment);
  const getStatus = useServerFn(getContributionStatus);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<{ id: string; detail: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    ensureInit(publicKey);
    setReady(true);
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        O criador desta campanha ainda não habilitou cartão/carteira. Use PIX acima.
      </div>
    );
  }
  if (!acceptsCard) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Cartão e carteira desativados nesta campanha.
      </div>
    );
  }
  if (!supporterEmail?.includes("@")) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        Informe seu e-mail acima para prosseguir com cartão ou carteira Mercado Pago.
      </div>
    );
  }

  if (pending) {
    return (
      <div className="rounded-xl border p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: accent }} />
          <h3 className="font-semibold">Confirmando pagamento…</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending.detail || "Aguardando confirmação do Mercado Pago."}
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Não foi possível processar o pagamento</div>
            <div className="mt-0.5 text-xs opacity-90">{failed}</div>
            <button type="button" onClick={() => setFailed(null)}
              className="mt-2 text-xs font-medium underline underline-offset-2">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando checkout seguro do Mercado Pago…
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <Payment
        key={`${campaignSlug}-${amountCents}`}
        initialization={{
          amount: amountCents / 100,
          payer: { email: supporterEmail },
        }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            mercadoPago: ["wallet_purchase"],
            maxInstallments: 12,
          },
          visual: {
            style: { theme: "default" },
            hidePaymentButton: false,
          },
        }}
        onSubmit={async ({ formData, selectedPaymentMethod }) => {
          try {
            const brick = formData as unknown as {
              token?: string;
              issuer_id?: string;
              payment_method_id: string;
              installments?: number;
              payer?: { email?: string; identification?: { type?: string; number?: string } };
            };
            const r = await process({
              data: {
                campaignSlug,
                amount_cents: amountCents,
                supporter_name: supporterName || undefined,
                supporter_email: supporterEmail,
                message: message || undefined,
                is_anonymous: !!isAnonymous,
                brick: {
                  token: brick.token,
                  issuer_id: brick.issuer_id,
                  payment_method_id: brick.payment_method_id,
                  payment_type_id: selectedPaymentMethod,
                  installments: brick.installments,
                  payer: brick.payer,
                },
              },
            });

            if (r.status === "approved") {
              onApproved(r.amount_cents);
              toast.success("Pagamento aprovado — obrigado!");
              return;
            }
            if (["rejected", "cancelled"].includes(r.status)) {
              const detailMap: Record<string, string> = {
                cc_rejected_insufficient_amount: "Saldo insuficiente.",
                cc_rejected_bad_filled_security_code: "CVV inválido.",
                cc_rejected_bad_filled_date: "Data de validade inválida.",
                cc_rejected_bad_filled_other: "Dados do cartão inválidos.",
                cc_rejected_high_risk: "Pagamento rejeitado por risco. Tente outro método.",
                cc_rejected_call_for_authorize: "Autorize o pagamento com seu banco.",
                cc_rejected_card_disabled: "Cartão desativado — contate seu banco.",
              };
              throw new Error(detailMap[r.status_detail] ?? `Pagamento não aprovado (${r.status_detail || r.status}).`);
            }
            // pending / in_process — inicia polling
            setPending({ id: r.id, detail: "Aguardando confirmação do Mercado Pago…" });
            const iv = setInterval(async () => {
              try {
                const s = await getStatus({ data: { id: r.id } });
                if (s.status === "approved") {
                  clearInterval(iv);
                  setPending(null);
                  onApproved(s.amount_cents);
                  toast.success("Pagamento aprovado!");
                } else if (["rejected", "cancelled", "expired"].includes(s.status)) {
                  clearInterval(iv);
                  setPending(null);
                  setFailed("Pagamento não aprovado pelo Mercado Pago.");
                }
              } catch { /* noop */ }
            }, 4000);
            setTimeout(() => clearInterval(iv), 10 * 60_000);
          } catch (err) {
            setFailed(err instanceof Error ? err.message : "Falha ao processar");
            throw err;
          }
        }}
        onError={(err) => {
          console.error("[Brick] error", err);
          toast.error("Erro no formulário de pagamento");
        }}
      />
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        Dados do cartão criptografados e processados pelo Mercado Pago (PCI-DSS). Nunca passam pelos servidores do ForLink.
      </div>
    </div>
  );
}
