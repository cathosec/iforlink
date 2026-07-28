// Chave pública VAPID — segura para expor no browser (é a metade pública do par ECDSA).
export const VAPID_PUBLIC_KEY =
  "BE3iKlv7weqZ43hDh5vTNfoO9HIsAzEG_UXE1pYALpSYk_-cLxRiv6IgCJzeq9LGhmY4yKenO359wxJVX3AO0uw";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
