/**
 * Helpers do lado do navegador para inscrever/desinscrever Push.
 * Registra o service worker apenas em produção (evita quebrar preview do Lovable).
 */
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "./vapid-public";

const SW_URL = "/sw.js";

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  );
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  if (isPreviewHost() || window.self !== window.top) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_URL);
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;
  return (await reg.pushManager.getSubscription()) ?? null;
}

export async function subscribePush(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error("Este navegador não suporta notificações push.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permissão de notificação negada.");
  const reg = await registerServiceWorker();
  if (!reg) throw new Error("Service worker indisponível neste ambiente.");
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

export async function unsubscribePush(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  await sub.unsubscribe().catch(() => {});
  return sub;
}

export function subscriptionToJSON(sub: PushSubscription) {
  const j = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: (j.keys as { p256dh?: string } | undefined)?.p256dh ?? "",
    auth: (j.keys as { auth?: string } | undefined)?.auth ?? "",
  };
}
