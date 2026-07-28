/**
 * ForLink Analytics — API pública + compat com helpers antigos do Google Analytics.
 *
 *   import { analytics } from "@/lib/analytics";
 *   analytics.track("Cadastro", { plano: "pro" });
 *
 * O tracker próprio é inicializado uma vez em __root.tsx via <AnalyticsProvider />.
 */

import { trackCustom } from "./tracker";

// ─── Google Analytics (gtag) — compat ────────────────────────────
type GtagFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}
function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === "function") window.gtag(...args);
  else window.dataLayer.push(args);
}

/** Pageview do Google Analytics (mantido para o componente GoogleAnalytics). */
export function trackPageView(path: string, title?: string) {
  gtag("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    page_title: title ?? (typeof document !== "undefined" ? document.title : undefined),
  });
}

/** Evento do Google Analytics + espelho no analytics interno. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  gtag("event", name, params);
  try { trackCustom(name, params); } catch { /* noop */ }
}

// ─── Analytics interno (ForLink) ─────────────────────────────────
export const analytics = {
  track(name: string, props: Record<string, unknown> = {}) {
    try { trackCustom(name, props); } catch { /* noop */ }
  },
};

export { AnalyticsProvider } from "./provider";
