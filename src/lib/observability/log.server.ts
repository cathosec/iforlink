/**
 * Observability helper — grava eventos estruturados em `event_log`.
 *
 * Uso a partir de server functions:
 *   await logEvent("payment.approved", { pixId, amountCents }, { targetType: "pix_payment", targetId: pixId });
 *
 * Falhas de log NÃO devem quebrar a operação principal — todo erro é engolido.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type EventLevel = "debug" | "info" | "warn" | "error";

export type LogEventOptions = {
  level?: EventLevel;
  targetType?: string | null;
  targetId?: string | null;
};

let _admin: ReturnType<typeof createClient<Database>> | null = null;
function admin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

export async function logEvent(
  type: string,
  payload: Record<string, unknown> = {},
  opts: LogEventOptions = {},
): Promise<void> {
  try {
    const client = admin();
    if (!client) return;
    await client.rpc("log_event" as never, {
      _type: type,
      _payload: payload as never,
      _level: (opts.level ?? "info") as never,
      _target_type: opts.targetType ?? null,
      _target_id: opts.targetId ?? null,
    } as never);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[logEvent] failed:", type, err);
  }
}
