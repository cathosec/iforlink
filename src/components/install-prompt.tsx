import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share2, Plus, Wand2 } from "lucide-react";
import { isIOS, isAndroid, isStandalone } from "@/lib/push/client";

// Link do iCloud do atalho "Enviar para ForLink".
// TODO: substituir pelo link real depois de criar o atalho no app Atalhos e compartilhar via iCloud.
// Enquanto for null, o botão abre um modal com instruções em vez de tentar instalar.
const IOS_SHORTCUT_ICLOUD_URL: string | null = null;

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "forlink:pwa-install-dismissed-at";
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 14; // 14 dias

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_TTL;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || wasRecentlyDismissed()) return;

    const p = isIOS() ? "ios" : isAndroid() ? "android" : "other";
    setPlatform(p);

    // iOS não dispara beforeinstallprompt — mostramos instruções manuais
    if (p === "ios") {
      const t = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(t);
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] mx-auto flex max-w-md justify-center px-4 print:hidden">
      <div className="pointer-events-auto w-full rounded-2xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-start gap-3">
          <img src="/pwa/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Instalar ForLink</div>
            {platform === "ios" ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Toque em <Share2 className="mx-0.5 inline h-3.5 w-3.5 align-[-2px]" /> Compartilhar e depois em{" "}
                <Plus className="mx-0.5 inline h-3.5 w-3.5 align-[-2px]" /> <strong>Adicionar à Tela de Início</strong>.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Adicione à tela inicial para acesso rápido e notificações de novas contribuições.
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {platform !== "ios" && (
                <Button size="sm" onClick={install} className="bg-brand text-brand-foreground hover:bg-brand/90">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Instalar
                </Button>
              )}
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
