import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  pushSupported,
  isStandalone,
  getExistingSubscription,
  subscribePush,
  subscriptionToJSON,
} from "@/lib/push/client";
import { savePushSubscription } from "@/lib/push.functions";

const SEEN_KEY = "forlink:push-reminder-seen-at";
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < SNOOZE_MS;
  } catch {
    return false;
  }
}

export function PushReminder() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(savePushSubscription);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStandalone()) return;
    if (!pushSupported()) return;
    if (recentlyDismissed()) return;
    if (Notification.permission !== "default") return;

    (async () => {
      const existing = await getExistingSubscription();
      if (existing) return;
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    })();
  }, []);

  function dismiss() {
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* noop */ }
    setVisible(false);
  }

  async function enable() {
    setBusy(true);
    try {
      const sub = await subscribePush();
      const j = subscriptionToJSON(sub);
      await save({ data: { ...j, userAgent: navigator.userAgent } });
      toast.success("Notificações ativadas");
      dismiss();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ativar");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] mx-auto flex max-w-md justify-center px-4 print:hidden">
      <div className="pointer-events-auto w-full rounded-2xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-brand/10 p-2 text-brand">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Ativar notificações?</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Receba avisos quando alguém contribuir com suas campanhas ou interagir com seu perfil.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={enable}
                disabled={busy}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {busy ? "Ativando..." : "Ativar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>Agora não</Button>
            </div>
          </div>
          <button
            aria-label="Fechar"
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
