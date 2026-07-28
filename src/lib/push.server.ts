/**
 * Server-only: envia push messages usando @block65/webcrypto-web-push (Cloudflare Workers).
 */
import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
};

export type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@forlink.app";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys ausentes (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
  }
  return { publicKey, privateKey, subject };
}

export async function sendPushToSubscription(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<{ ok: boolean; status: number; gone: boolean }> {
  const vapid = getVapid();
  const subscription: PushSubscription = {
    endpoint: sub.endpoint,
    expirationTime: null,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  const built = await buildPushPayload(
    { data: payload as unknown as Record<string, unknown>, options: { ttl: 60 * 60 * 24, urgency: "normal" } },
    subscription,
    vapid,
  );
  const res = await fetch(sub.endpoint, {
    method: built.method,
    headers: built.headers as Record<string, string>,
    body: built.body,
  });
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}

export async function sendPushToMany(
  subs: StoredSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; goneEndpoints: string[] }> {
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        const r = await sendPushToSubscription(s, payload);
        if (r.ok) sent++;
        else failed++;
        if (r.gone) gone.push(s.endpoint);
      } catch {
        failed++;
      }
    }),
  );
  return { sent, failed, goneEndpoints: gone };
}
