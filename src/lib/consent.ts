// LGPD consent helpers — stored in localStorage on the browser only.
export type ConsentState = {
  essential: true;
  analytics: boolean;
  ads: boolean;
  ts: number;
  v: number;
};

const KEY = "forlink_consent_v1";
const EVT = "forlink:consent";

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function setConsent(patch: Partial<Omit<ConsentState, "essential" | "ts" | "v">>) {
  if (typeof window === "undefined") return;
  const cur = getConsent();
  const next: ConsentState = {
    essential: true,
    analytics: patch.analytics ?? cur?.analytics ?? false,
    ads: patch.ads ?? cur?.ads ?? false,
    ts: Date.now(),
    v: 1,
  };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function acceptAll() {
  setConsent({ analytics: true, ads: true });
}
export function rejectNonEssential() {
  setConsent({ analytics: false, ads: false });
}

export function hasAdsConsent(): boolean {
  return !!getConsent()?.ads;
}
export function hasAnalyticsConsent(): boolean {
  return !!getConsent()?.analytics;
}

export function onConsentChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
