/**
 * ForLink Analytics — API pública.
 *
 *   import { analytics } from "@/lib/analytics";
 *   analytics.track("Cadastro", { plano: "pro" });
 *
 * O tracker é inicializado uma vez em __root.tsx via <AnalyticsProvider />.
 * Se o consent LGPD não permitir analytics, todas as chamadas viram no-op.
 */

import { trackCustom } from "./tracker";

export const analytics = {
  /** Registra um evento custom. Não bloqueia a UI, apenas enfileira. */
  track(name: string, props: Record<string, unknown> = {}) {
    try { trackCustom(name, props); } catch { /* noop */ }
  },
};

export { AnalyticsProvider } from "./provider";
