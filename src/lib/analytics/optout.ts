/**
 * Opt-out granular do Analytics (adicional ao consent LGPD).
 * O usuário pode desativar coleta mesmo com consent geral aceito.
 */

const OPTOUT_KEY = "forlink_a_optout";
const listeners = new Set<() => void>();

export function isAnalyticsOptedOut(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(OPTOUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAnalyticsOptOut(next: boolean) {
  try {
    if (next) localStorage.setItem(OPTOUT_KEY, "1");
    else localStorage.removeItem(OPTOUT_KEY);
    listeners.forEach((l) => {
      try { l(); } catch { /* noop */ }
    });
  } catch { /* noop */ }
}

export function onOptOutChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
