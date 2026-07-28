/**
 * Hook único que:
 *  1. Aguarda consent de analytics (LGPD).
 *  2. Sobe o tracker de pageviews/eventos.
 *  3. Assina o TanStack Router para emitir pageviews em cada navegação.
 *  4. Amarra o user_id da sessão autenticada.
 */

import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { hasAnalyticsConsent, onConsentChange } from "@/lib/consent";
import { isAnalyticsOptedOut, onOptOutChange } from "./optout";
import { useAuth } from "@/lib/auth-context";
import { startTracker, trackPageView, setUserId } from "./tracker";

export function AnalyticsProvider() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();

  // Inicializa/desliga conforme consent + opt-out do usuário
  useEffect(() => {
    const canTrack = () => hasAnalyticsConsent() && !isAnalyticsOptedOut();
    let active = canTrack();
    if (active) startTracker(user?.id ?? null);
    const sync = () => {
      const now = canTrack();
      if (now && !active) {
        active = true;
        startTracker(user?.id ?? null);
      } else if (!now && active) {
        active = false;
      }
    };
    const offConsent = onConsentChange(sync);
    const offOpt = onOptOutChange(sync);
    return () => { offConsent(); offOpt(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza user_id quando login/logout acontece
  useEffect(() => { setUserId(user?.id ?? null); }, [user?.id]);

  // Pageview em cada navegação
  useEffect(() => {
    if (!hasAnalyticsConsent() || isAnalyticsOptedOut()) return;
    const raf = requestAnimationFrame(() => {
      trackPageView(pathname, document.title);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, router]);

  return null;
}
