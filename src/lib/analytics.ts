// Lightweight Google Analytics (gtag) helpers.
// All calls are safe to invoke even when GA hasn't loaded — they no-op.

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  // Ensure the queue exists so calls made before the GA script loads
  // are replayed once gtag.js initializes.
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === "function") {
    window.gtag(...args);
  } else {
    window.dataLayer.push(args);
  }
}

export function trackPageView(path: string, title?: string) {
  gtag("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    page_title: title ?? (typeof document !== "undefined" ? document.title : undefined),
  });
}

export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
) {
  gtag("event", name, params);
}
