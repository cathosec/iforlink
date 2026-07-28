/**
 * Coletor principal do ForLink Analytics.
 * - Gera visitor_id (localStorage) e session_id (sessionStorage, TTL 30min).
 * - Pageviews, cliques (throttle), scroll (marcos), idle, mudança de aba, erro global.
 * - Delega envio ao transport (batch 5s / 30 evts).
 */

import { readClientEnv, readUtms, safeUrl } from "./env";
import { scrubProps, scrubText, isSensitiveElement } from "./scrub";
import {
  enqueue,
  flush,
  initTransport,
  type AnalyticsEvent,
  type IngestSession,
  type IngestVisitor,
} from "./transport";


const VISITOR_KEY = "forlink_a_v";
const SESSION_KEY = "forlink_a_s";
const SESSION_TTL_MS = 30 * 60 * 1000;

type StoredSession = { id: string; expires: number };

let visitor: IngestVisitor = {};
let session: IngestSession = {};
let currentPath = "";
let currentPathStartedAt = 0;
let started = false;

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readVisitor(): string {
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    if (raw) return raw;
    const id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch { return uuid(); }
}

function readSession(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as StoredSession;
      if (s.expires > Date.now()) return s.id;
    }
    const id = uuid();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, expires: Date.now() + SESSION_TTL_MS }));
    return id;
  } catch { return uuid(); }
}

function touchSession() {
  try {
    const id = session.id ?? readSession();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, expires: Date.now() + SESSION_TTL_MS }));
  } catch { /* noop */ }
}

function ev(kind: AnalyticsEvent["kind"], extra: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    kind,
    ts: new Date().toISOString(),
    client_event_id: uuid(),
    path: currentPath || (typeof location !== "undefined" ? location.pathname : ""),
    ...extra,
  };
}

/** Throttle simples baseado em timestamp. */
function throttle<T extends (...args: never[]) => void>(fn: T, wait: number): T {
  let last = 0;
  return ((...args: never[]) => {
    const now = Date.now();
    if (now - last >= wait) { last = now; fn(...args); }
  }) as T;
}

/** Debounce simples. */
function debounce<T extends (...args: never[]) => void>(fn: T, wait: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: never[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  }) as T;
}

export function startTracker(userId?: string | null) {
  if (started || typeof window === "undefined") return;
  started = true;

  const envInfo = readClientEnv();
  visitor = { id: readVisitor(), ua_hash: envInfo?.ua_hash };
  session = {
    id: readSession(),
    user_id: userId ?? null,
    device_type: envInfo?.device_type,
    os_family: envInfo?.os_family,
    browser_family: envInfo?.browser_family,
    lang: envInfo?.lang,
    screen_w: envInfo?.screen_w,
    screen_h: envInfo?.screen_h,
    viewport_w: envInfo?.viewport_w,
    viewport_h: envInfo?.viewport_h,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
    ...readUtms(),
  };

  initTransport(
    () => ({ visitor, session }),
    (ids) => {
      if (ids.visitor_id) visitor.id = ids.visitor_id;
      if (ids.session_id) session.id = ids.session_id;
    },
  );

  // ─── Cliques (throttle 100ms) ────────────────────────────────
  const onClick = throttle((e: MouseEvent) => {
    touchSession();
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName?.toLowerCase();
    if (isSensitiveElement(t)) return;
    const rawTxt = (t?.textContent || "").trim().slice(0, 60);
    enqueue(ev("click", {
      payload: {
        x: e.clientX, y: e.clientY,
        vw: window.innerWidth, vh: window.innerHeight,
        tag, id: t?.id ? scrubText(t.id, 40) : undefined,
        cls: t?.className && typeof t.className === "string" ? scrubText(t.className, 80) : undefined,
        txt: rawTxt ? scrubText(rawTxt, 60) : undefined,
      },
    }));
  }, 100);
  window.addEventListener("click", onClick, { capture: true, passive: true });


  // ─── Scroll (marcos 25/50/75/100%) ───────────────────────────
  const seenScroll = new Set<number>();
  const onScroll = throttle(() => {
    touchSession();
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    const pct = Math.round((window.scrollY / max) * 100);
    for (const mark of [25, 50, 75, 100]) {
      if (pct >= mark && !seenScroll.has(mark)) {
        seenScroll.add(mark);
        enqueue(ev("scroll", { payload: { depth: mark } }));
      }
    }
  }, 250);
  window.addEventListener("scroll", onScroll, { passive: true });

  // ─── Movimento do mouse (amostrado p/ heatmap) ───────────────
  // Estratégia: throttle 100ms + 1-em-5 amostragem + teto 200 por pageview.
  // Isso mantém <2 evts/s em uso ativo e evita inflar o payload.
  let moveCount = 0;
  let moveSampleTick = 0;
  const onMove = throttle((e: MouseEvent) => {
    moveSampleTick++;
    if (moveSampleTick % 5 !== 0) return;
    if (moveCount >= 200) return;
    // Ignora movimentos dentro de campos sensíveis
    const t = e.target as HTMLElement | null;
    if (t?.closest('input[type="password"], input[type="email"], [data-forlink-sensitive]')) return;
    moveCount++;
    enqueue(ev("mousemove", {
      payload: { x: e.clientX, y: e.clientY, vw: window.innerWidth, vh: window.innerHeight },
    }));
  }, 100);
  window.addEventListener("mousemove", onMove, { passive: true });
  // Reset do teto quando o usuário navega
  const resetMoveOnNav = () => { moveCount = 0; moveSampleTick = 0; };
  window.addEventListener("popstate", resetMoveOnNav);
  // navegação SPA — o provider chama trackPageView; expose via closure não é trivial,
  // então resetamos também ao voltar de tab_hidden -> visible.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) resetMoveOnNav(); });

  // ─── Idle > 30s ──────────────────────────────────────────────
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const resetIdle = debounce(() => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => enqueue(ev("idle", { payload: { after_ms: 30_000 } })), 30_000);
  }, 200);
  ["mousemove", "keydown", "touchstart", "scroll"].forEach((t) =>
    window.addEventListener(t, resetIdle, { passive: true }),
  );
  resetIdle();

  // ─── Mudança de aba ──────────────────────────────────────────
  document.addEventListener("visibilitychange", () => {
    enqueue(ev(document.hidden ? "tab_hidden" : "tab_visible"));
    if (document.hidden) void flush({ useBeacon: true });
  });

  // ─── Erros globais ───────────────────────────────────────────
  window.addEventListener("error", (e) => {
    enqueue(ev("error", { payload: { message: String(e.message).slice(0, 300), src: String(e.filename || "").slice(0, 200) } }));
  });
  window.addEventListener("unhandledrejection", (e) => {
    enqueue(ev("error", { payload: { message: `unhandled: ${String((e as PromiseRejectionEvent).reason).slice(0, 300)}` } }));
  });

  // Redimensionamento — atualiza viewport na próxima flush
  const onResize = debounce(() => {
    session.viewport_w = window.innerWidth;
    session.viewport_h = window.innerHeight;
  }, 250);
  window.addEventListener("resize", onResize);
}

export function trackPageView(path: string, title?: string) {
  if (!started) return;
  // fecha o pageview anterior com duração
  if (currentPath && currentPathStartedAt) {
    const dur = Date.now() - currentPathStartedAt;
    enqueue(ev("pageview", {
      path: currentPath,
      url: typeof location !== "undefined" ? safeUrl(location.href) : undefined,
      title: currentPath === path ? title : undefined,
      duration_ms: Math.max(0, dur),
      is_exit: false,
    }));
  }
  currentPath = path;
  currentPathStartedAt = Date.now();
  enqueue(ev("pageview", {
    path,
    url: typeof location !== "undefined" ? safeUrl(location.href) : undefined,
    title: title ?? (typeof document !== "undefined" ? document.title : undefined),
    duration_ms: 0,
    is_exit: false,
  }));
  touchSession();
}

export function setUserId(userId?: string | null) {
  session.user_id = userId ?? null;
}

export function trackCustom(name: string, props: Record<string, unknown> = {}) {
  if (!started) return;
  const safeProps = (scrubProps(props) as Record<string, unknown>) || {};
  enqueue(ev("custom", { name: scrubText(name, 60), props: safeProps }));
}


export { flush };
