/**
 * Hook único que:
 *  1. Aguarda consent de analytics (LGPD).
 *  2. Sobe o tracker.
 *  3. Assina o TanStack Router para emitir pageviews em cada navegação.
 *  4. Amarra o user_id da sessão autenticada.
 */

import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { hasAnalyticsConsent, onConsentChange } from "@/lib/consent";
import { useAuth } from "@/lib/auth-context";
import { startTracker, trackPageView, setUserId } from "./tracker";

export function AnalyticsProvider() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();

  // Inicializa/desliga conforme consent
  useEffect(() => {
    let active = hasAnalyticsConsent();
    if (active) startTracker(user?.id ?? null);
    const off = onConsentChange(() => {
      const now = hasAnalyticsConsent();
      if (now && !active) {
        active = true;
        startTracker(user?.id ?? null);
      }
    });
    return () => off();
    // user?.id é aplicado abaixo via setUserId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza user_id quando login/logout acontece
  useEffect(() => { setUserId(user?.id ?? null); }, [user?.id]);

  // Pageview em cada navegação
  useEffect(() => {
    if (!hasAnalyticsConsent()) return;
    // pega título depois do commit
    const raf = requestAnimationFrame(() => trackPageView(pathname, document.title));
    return () => cancelAnimationFrame(raf);
    // router usada apenas para satisfazer o linter — pathname já é reativo
  }, [pathname, router]);

  return null;
}
