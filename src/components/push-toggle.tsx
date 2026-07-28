import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  pushSupported,
  getExistingSubscription,
  subscribePush,
  unsubscribePush,
  subscriptionToJSON,
  isIOS,
  isStandalone,
} from "@/lib/push/client";
import {
  savePushSubscription,
  deletePushSubscription,
  sendTestPushToMe,
} from "@/lib/push.functions";

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);

  const save = useServerFn(savePushSubscription);
  const del = useServerFn(deletePushSubscription);
  const test = useServerFn(sendTestPushToMe);

  useEffect(() => {
    (async () => {
      const s = pushSupported();
      setSupported(s);
      if (isIOS() && !isStandalone()) setNeedsInstall(true);
      if (!s) return;
      const sub = await getExistingSubscription();
      setSubscribed(!!sub);
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const sub = await subscribePush();
      const j = subscriptionToJSON(sub);
      await save({ data: { ...j, userAgent: navigator.userAgent } });
      setSubscribed(true);
      await test({ data: {} }).catch(() => null);
      toast.success("Notificações ativadas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ativar");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await unsubscribePush();
      if (sub) await del({ data: { endpoint: sub.endpoint } }).catch(() => null);
      setSubscribed(false);
      toast.success("Notificações desativadas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desativar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand/10 p-2 text-brand">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Notificações push</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Receba alertas em tempo real quando alguém contribuir em suas campanhas — mesmo com o app fechado.
          </p>

          {needsInstall && (
            <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              No iOS, é preciso <strong>instalar o ForLink</strong> na Tela de Início antes de ativar notificações
              (toque em Compartilhar → Adicionar à Tela de Início).
            </p>
          )}
          {!supported && !needsInstall && (
            <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              Este navegador não suporta notificações push.
            </p>
          )}

          <div className="mt-4">
            {subscribed ? (
              <Button variant="outline" onClick={disable} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellOff className="mr-2 h-4 w-4" />}
                Desativar notificações
              </Button>
            ) : (
              <Button
                onClick={enable}
                disabled={busy || !supported || needsInstall}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                Ativar notificações
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
