import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  acceptAll,
  getConsent,
  rejectNonEssential,
  setConsent,
} from "@/lib/consent";

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [ads, setAds] = useState(true);

  useEffect(() => {
    // Only show on client, after mount, when no decision recorded.
    const t = setTimeout(() => {
      if (!getConsent()) setOpen(true);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  const accept = () => {
    acceptAll();
    setOpen(false);
  };
  const reject = () => {
    rejectNonEssential();
    setOpen(false);
  };
  const save = () => {
    setConsent({ analytics, ads });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto max-w-3xl rounded-xl border bg-card p-4 shadow-2xl ring-1 ring-black/5 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
            <Cookie className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Sua privacidade importa
              </h2>
              <button
                aria-label="Fechar"
                onClick={reject}
                className="rounded p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Usamos cookies essenciais para operar a ForLink e, com sua
              autorização, cookies de análise e publicidade para melhorar a
              experiência. Você pode alterar sua preferência a qualquer
              momento. Saiba mais na{" "}
              <Link to="/privacidade" className="underline hover:text-foreground">
                Política de Privacidade
              </Link>{" "}
              e nos{" "}
              <Link to="/termos" className="underline hover:text-foreground">
                Termos de Uso
              </Link>
              .
            </p>

            {customize && (
              <div className="mt-4 space-y-2 rounded-md border bg-background/60 p-3">
                <Row
                  label="Essenciais"
                  desc="Necessários para autenticação e funcionamento do site."
                  disabled
                  checked
                />
                <Row
                  label="Análise"
                  desc="Métricas anônimas de uso para melhorar o produto."
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <Row
                  label="Publicidade"
                  desc="Anúncios personalizados de parceiros. Sem consentimento, nenhum anúncio é exibido."
                  checked={ads}
                  onChange={setAds}
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {!customize && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomize(true)}
                >
                  Personalizar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={reject}>
                Somente essenciais
              </Button>
              {customize ? (
                <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={save}>
                  Salvar escolhas
                </Button>
              ) : (
                <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={accept}>
                  Aceitar todos
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label className="text-xs font-semibold text-foreground">{label}</Label>
        <p className="text-[11px] leading-snug text-muted-foreground">{desc}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
