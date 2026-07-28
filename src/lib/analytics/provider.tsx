/**
 * Hook único que:
 *  1. Aguarda consent de analytics (LGPD).
 *  2. Sobe o tracker + o gravador rrweb (session replay).
 *  3. Assina o TanStack Router para emitir pageviews em cada navegação.
 *  4. Amarra o user_id da sessão autenticada.
 */

import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { hasAnalyticsConsent, onConsentChange } from "@/lib/consent";
import { isAnalyticsOptedOut, onOptOutChange } from "./optout";
import { useAuth } from "@/lib/auth-context";
import { startTracker, trackPageView, setUserId } from "./tracker";
import { onRouteChange, startRecorder, stopRecorder } from "./recorder";


// Helper para expor o session_id/visitor_id do tracker.
// O tracker gerencia esses IDs em storage — lemos direto dele.
function getRecorderContext(): { sessionId?: string | null; visitorId?: string | null } {
  try {
    const s = JSON.parse(sessionStorage.getItem("forlink_a_s") || "null") as { id?: string } | null;
    const v = localStorage.getItem("forlink_a_v");
    return { sessionId: s?.id ?? null, visitorId: v };
  } catch {
    return { sessionId: null, visitorId: null };
  }
}

export function AnalyticsProvider() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();

  // Inicializa/desliga conforme consent + opt-out do usuário
  useEffect(() => {
    const canTrack = () => hasAnalyticsConsent() && !isAnalyticsOptedOut();
    let active = canTrack();
    if (active) {
      startTracker(user?.id ?? null);
      setTimeout(() => { void startRecorder(getRecorderContext); }, 800);
    }
    const sync = () => {
      const now = canTrack();
      if (now && !active) {
        active = true;
        startTracker(user?.id ?? null);
        setTimeout(() => { void startRecorder(getRecorderContext); }, 800);
      } else if (!now && active) {
        active = false;
        stopRecorder();
      }
    };
    const offConsent = onConsentChange(sync);
    const offOpt = onOptOutChange(sync);
    return () => { offConsent(); offOpt(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Atualiza user_id quando login/logout acontece
  useEffect(() => { setUserId(user?.id ?? null); }, [user?.id]);

  // Pageview + segmentação de replay em cada navegação
  useEffect(() => {
    if (!hasAnalyticsConsent() || isAnalyticsOptedOut()) return;
    const raf = requestAnimationFrame(() => {
      trackPageView(pathname, document.title);
      onRouteChange(pathname, document.title);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, router]);


  return null;
}
