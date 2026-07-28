// Detecção leve de dispositivo/navegador/OS. Sem libs externas.
// Roda apenas no navegador; retorna null em SSR.

export type ClientEnv = {
  device_type: "mobile" | "tablet" | "desktop";
  os_family: string;
  browser_family: string;
  lang: string;
  screen_w: number;
  screen_h: number;
  viewport_w: number;
  viewport_h: number;
  ua_hash: string;
};

/** Hash não criptográfico (djb2) — só para agrupar visitantes com mesmo UA. */
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function detectDevice(ua: string): ClientEnv["device_type"] {
  if (/iPad|Tablet|PlayBook|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  return "desktop";
}

function detectOS(ua: string): string {
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Other";
}

export function readClientEnv(): ClientEnv | null {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent || "";
  return {
    device_type: detectDevice(ua),
    os_family: detectOS(ua),
    browser_family: detectBrowser(ua),
    lang: navigator.language || "",
    screen_w: window.screen?.width ?? 0,
    screen_h: window.screen?.height ?? 0,
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    ua_hash: hashString(ua),
  };
}

export function readUtms(): Record<string, string | undefined> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const pick = (k: string) => p.get(k) || undefined;
  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_term: pick("utm_term"),
    utm_content: pick("utm_content"),
  };
}

/** Sanitiza uma URL removendo querystring com dados sensíveis conhecidos. */
export function safeUrl(href: string): string {
  try {
    const u = new URL(href);
    for (const k of ["token", "access_token", "code", "state", "email", "password"]) {
      u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return href;
  }
}
