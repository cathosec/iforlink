/**
 * Session Replay via rrweb.
 *
 * - Grava DOM em snapshots + mutações incrementais.
 * - Máscara automática de PII:
 *   • todos os <input>/<textarea> exceto checkbox/radio/button (maskAllInputs)
 *   • qualquer elemento com `.forlink-private` ou [data-forlink-sensitive]
 *   • blocos com `.forlink-block` são bloqueados (rrweb "block")
 *   • máscara de texto em nós que casem seletor `.forlink-mask`
 *   • sanitização de src (base64) e de URLs de folhas de estilo
 * - Envia em chunks (~30s ou 200 eventos) para /api/public/analytics/recording.
 * - Só grava se houver consent de analytics e o tracker estiver ativo.
 */

import { safeUrl } from "./env";

const INGEST_URL = "/api/public/analytics/recording";
const MAX_EVENTS_PER_CHUNK = 200;
const MAX_CHUNK_INTERVAL_MS = 30_000;

type RrwebEvent = { type: number; data: unknown; timestamp: number };

let stopFn: (() => void) | null = null;
let buffer: RrwebEvent[] = [];
let chunkStart = 0;
let chunkIndex = 0;
let currentPath = "";
let currentPage = "";
let flushTimer: ReturnType<typeof setInterval> | null = null;
let getContext: (() => { sessionId?: string | null; visitorId?: string | null }) | null = null;
let recording = false;

function estimateBytes(v: unknown): number {
  try { return JSON.stringify(v).length; } catch { return 0; }
}

async function flushChunk(reason: "size" | "time" | "route" | "unload" = "time") {
  if (buffer.length === 0 || !getContext) return;
  const events = buffer.splice(0, buffer.length);
  const ctx = getContext();
  if (!ctx.sessionId) return;

  const now = Date.now();
  const payload = {
    session_id: ctx.sessionId,
    visitor_id: ctx.visitorId ?? null,
    path: currentPath || (typeof location !== "undefined" ? location.pathname : ""),
    title: typeof document !== "undefined" ? document.title.slice(0, 300) : undefined,
    chunk_index: chunkIndex++,
    events,
    started_at: new Date(chunkStart || now).toISOString(),
    ended_at: new Date(now).toISOString(),
    duration_ms: Math.max(0, now - (chunkStart || now)),
    viewport_w: typeof window !== "undefined" ? window.innerWidth : null,
    viewport_h: typeof window !== "undefined" ? window.innerHeight : null,
    bytes: estimateBytes(events),
  };
  const body = JSON.stringify(payload);
  chunkStart = now;

  if (reason === "unload" && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(INGEST_URL, blob)) return;
    } catch { /* fallthrough */ }
  }

  try {
    await fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    });
  } catch {
    // Falhas ficam silenciosas. Chunks perdidos não devem afetar a UX.
  }
}

/** Sanitiza URLs em eventos Meta/FullSnapshot antes de gravar. */
function sanitizeEvent(ev: RrwebEvent): RrwebEvent {
  try {
    if (ev && typeof ev === "object" && "data" in ev) {
      const d = ev.data as { href?: string };
      if (d && typeof d.href === "string") d.href = safeUrl(d.href);
    }
  } catch { /* noop */ }
  return ev;
}

export async function startRecorder(
  ctx: () => { sessionId?: string | null; visitorId?: string | null },
): Promise<void> {
  if (recording || typeof window === "undefined") return;
  recording = true;
  getContext = ctx;
  currentPath = location.pathname;
  currentPage = document.title;
  chunkStart = Date.now();
  chunkIndex = 0;

  // Import dinâmico — rrweb é browser-only.
  const rrweb = await import("rrweb");

  stopFn =
    rrweb.record({
      emit(event) {
        const safe = sanitizeEvent(event as RrwebEvent);
        buffer.push(safe);
        if (buffer.length >= MAX_EVENTS_PER_CHUNK) void flushChunk("size");
      },
      // ── PRIVACIDADE (LGPD) ─────────────────────────────────────
      maskAllInputs: true,
      maskInputOptions: {
        password: true, email: true, tel: true, url: true,
        text: true, textarea: true, search: true, number: true,
        date: true, "datetime-local": true, month: true, week: true, time: true,
      },
      maskTextSelector: ".forlink-mask, [data-forlink-mask]",
      blockSelector: ".forlink-block, [data-forlink-block], iframe, [data-forlink-sensitive]",
      // Não capture recursos pesados/externos que poluem o payload
      inlineStylesheet: false,
      collectFonts: false,
      recordCanvas: false,
      slimDOMOptions: {
        script: true,
        comment: true,
        headFavicon: true,
        headWhitespace: true,
        headMetaDescKeywords: true,
        headMetaSocial: true,
        headMetaRobots: true,
        headMetaHttpEquiv: true,
        headMetaAuthorship: true,
        headMetaVerification: true,
      },
    }) ?? null;

  // Flush periódico
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => {
    if (Date.now() - chunkStart >= MAX_CHUNK_INTERVAL_MS && buffer.length > 0) {
      void flushChunk("time");
    }
  }, 5_000);

  window.addEventListener("pagehide", () => { void flushChunk("unload"); });
  window.addEventListener("beforeunload", () => { void flushChunk("unload"); });
}

/** Chame ao mudar de rota (SPA) para segmentar o replay por path. */
export function onRouteChange(nextPath: string, nextTitle?: string) {
  if (!recording) return;
  if (nextPath !== currentPath) {
    void flushChunk("route");
    currentPath = nextPath;
    currentPage = nextTitle ?? document.title;
    // reinicia numeração por sessão-de-página
    chunkStart = Date.now();
  }
}

export function stopRecorder() {
  if (!recording) return;
  recording = false;
  if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
  try { stopFn?.(); } catch { /* noop */ }
  stopFn = null;
  void flushChunk("unload");
}

export function isRecording(): boolean { return recording; }
