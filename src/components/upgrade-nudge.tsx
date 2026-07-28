import { Link } from "@tanstack/react-router";
import { Sparkles, X, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useFlag } from "@/lib/flags";
import { supabase } from "@/integrations/supabase/client";

export type UpgradeContext =
  | "links_limit"
  | "categories_limit"
  | "campaigns_limit"
  | "shortener"
  | "analytics"
  | "custom_theme"
  | "generic";

const COPY: Record<UpgradeContext, { title: string; body: string; cta: string }> = {
  links_limit: {
    title: "Você atingiu o limite Free",
    body: "O plano Free permite até 15 links. Assine o Pro e cadastre links ilimitados, organize em categorias sem restrição e destaque seu perfil.",
    cta: "Fazer upgrade para Pro",
  },
  categories_limit: {
    title: "Limite de categorias atingido",
    body: "O plano Free permite até 3 categorias. Com o Pro você organiza tudo sem restrição.",
    cta: "Fazer upgrade para Pro",
  },
  campaigns_limit: {
    title: "Uma campanha ativa no Free",
    body: "Assine o Pro para criar quantas campanhas quiser, com taxa reduzida do ForLink em cada contribuição.",
    cta: "Assinar Pro",
  },
  shortener: {
    title: "Encurtador é um recurso Pro",
    body: "Crie links curtos com contagem de cliques ilimitada. Disponível apenas em contas Pro.",
    cta: "Assinar Pro",
  },
  analytics: {
    title: "Analytics avançado é Pro",
    body: "Veja gráficos detalhados de visitas e cliques por link, categoria e origem.",
    cta: "Assinar Pro",
  },
  custom_theme: {
    title: "Personalização premium",
    body: "Escolha temas exclusivos e domínio próprio para seu perfil no Pro.",
    cta: "Assinar Pro",
  },
  generic: {
    title: "Desbloqueie tudo com o Pro",
    body: "Links, categorias e campanhas ilimitados, encurtador, analytics avançado e taxa reduzida.",
    cta: "Fazer upgrade para Pro",
  },
};

function logCtaClick(context: UpgradeContext, source: string) {
  try {
    void supabase.rpc("log_event", {
      _type: "upgrade_cta_click",
      _payload: { context, source } as never,
      _level: "info",
      _target_type: "monetization",
      _target_id: context,
    } as never);
  } catch { /* noop */ }
}

/**
 * Banner discreto para mostrar dentro de listas/áreas quando o usuário está
 * chegando no limite ou já atingiu. Respeita a flag `pro_upgrade_enabled`.
 */
export function UpgradeBanner({
  context, source = "banner", className = "", dismissible = false, onDismiss,
}: {
  context: UpgradeContext;
  source?: string;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  const enabled = useFlag("pro_upgrade_enabled");
  if (!enabled) return null;
  const c = COPY[context];
  return (
    <div className={`relative overflow-hidden rounded-xl border border-brand/25 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-4 shadow-sm ${className}`}>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dispensar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand/70 text-white shadow-md shadow-brand/25">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{c.title}</div>
          <div className="text-xs text-muted-foreground">{c.body}</div>
        </div>
        <Link
          to="/precos"
          onClick={() => logCtaClick(context, source)}
          className="shrink-0"
        >
          <Button size="sm" className="rounded-full bg-gradient-to-r from-brand to-brand/80 text-brand-foreground shadow-md shadow-brand/20 hover:opacity-95">
            <Zap className="mr-1.5 h-3.5 w-3.5" /> {c.cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Modal exibido quando o usuário tenta uma ação bloqueada pelo plano Free.
 * Substitui o `toast.error` opaco por uma explicação + CTA de upgrade.
 */
export function UpgradeDialog({
  open, onOpenChange, context, source = "modal",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context: UpgradeContext;
  source?: string;
}) {
  const enabled = useFlag("pro_upgrade_enabled");
  const c = COPY[context];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand/70 text-white shadow-lg shadow-brand/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-display text-xl">{c.title}</DialogTitle>
          <DialogDescription className="text-center">{c.body}</DialogDescription>
        </DialogHeader>

        <ul className="mt-2 space-y-1.5 rounded-lg bg-muted/40 p-3 text-xs">
          <li className="flex items-center gap-2">✅ Links, categorias e campanhas <strong>ilimitados</strong></li>
          <li className="flex items-center gap-2">✅ Encurtador de links com métricas</li>
          <li className="flex items-center gap-2">✅ Taxa reduzida nas contribuições PIX/cartão</li>
          <li className="flex items-center gap-2">✅ Prioridade no suporte</li>
        </ul>

        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
          {enabled ? (
            <Link
              to="/precos"
              onClick={() => { logCtaClick(context, source); onOpenChange(false); }}
              className="w-full"
            >
              <Button className="w-full bg-gradient-to-r from-brand to-brand/80 text-brand-foreground shadow-md shadow-brand/20 hover:opacity-95">
                <Zap className="mr-2 h-4 w-4" /> {c.cta}
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button className="w-full" disabled>Upgrades temporariamente desativados</Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">Agora não</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
