/**
 * Fila de envio em lote para o endpoint /api/public/analytics/ingest.
 * - Flush a cada 5s OU quando atingir 30 eventos.
 * - beforeunload/pagehide usa navigator.sendBeacon para não bloquear.
 * - Dedup por client_event_id no server (RPC analytics_ingest_batch).
 */

const INGEST_URL = "/api/public/analytics/ingest";
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH = 30;

export type AnalyticsEvent = {
  kind: "pageview" | "click" | "scroll" | "idle" | "tab_hidden" | "tab_visible" | "error" | "mousemove" | "custom";
  ts: string;                    // ISO
  client_event_id: string;
  path?: string;
  url?: string;
  title?: string;
  duration_ms?: number;
  is_exit?: boolean;
  name?: string;                 // custom
  props?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type IngestSession = {
  id?: string | null;
  user_id?: string | null;
  device_type?: string;
  os_family?: string;
  browser_family?: string;
  lang?: string;
  screen_w?: number;
  screen_h?: number;
  viewport_w?: number;
  viewport_h?: number;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

export type IngestVisitor = { id?: string | null; ua_hash?: string };

type BatchPayload = { visitor: IngestVisitor; session: IngestSession; events: AnalyticsEvent[] };

let queue: AnalyticsEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let getContext: (() => { visitor: IngestVisitor; session: IngestSession }) | null = null;
let onIds: ((ids: { visitor_id?: string; session_id?: string }) => void) | null = null;
let flushing = false;

export function initTransport(
  contextFn: () => { visitor: IngestVisitor; session: IngestSession },
  onIdsUpdate: (ids: { visitor_id?: string; session_id?: string }) => void,
) {
  getContext = contextFn;
  onIds = onIdsUpdate;
  if (timer) clearInterval(timer);
  timer = setInterval(() => { void flush(); }, FLUSH_INTERVAL_MS);

  if (typeof window !== "undefined") {
    // Enviar tudo antes de sair
    const beacon = () => { void flush({ useBeacon: true }); };
    window.addEventListener("pagehide", beacon);
    window.addEventListener("beforeunload", beacon);
  }
}

export function enqueue(ev: AnalyticsEvent) {
  queue.push(ev);
  if (queue.length >= MAX_BATCH) {
    void flush();
  }
}

export async function flush(opts: { useBeacon?: boolean } = {}): Promise<void> {
  if (flushing || !getContext) return;
  if (queue.length === 0) return;

  const batch = queue.splice(0, queue.length);
  const ctx = getContext();
  const payload: BatchPayload = { visitor: ctx.visitor, session: ctx.session, events: batch };
  const body = JSON.stringify(payload);

  // sendBeacon é fire-and-forget e sobrevive à navegação
  if (opts.useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(INGEST_URL, blob);
      if (ok) return;
    } catch { /* cai no fetch abaixo */ }
  }

  flushing = true;
  try {
    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    });
    if (!res.ok) {
      // devolve para reprocessar (fica no cap de 200 para não crescer indefinidamente)
      queue = [...batch.slice(-200), ...queue];
      return;
    }
    const data = (await res.json().catch(() => null)) as
      | { visitor_id?: string; session_id?: string }
      | null;
    if (data && onIds) onIds(data);
  } catch {
    queue = [...batch.slice(-200), ...queue];
  } finally {
    flushing = false;
  }
}
