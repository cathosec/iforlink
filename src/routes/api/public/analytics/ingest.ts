/**
 * POST /api/public/analytics/ingest
 *
 * Ingest público do módulo Analytics próprio.
 *  - Aceita lote em JSON: { visitor, session, events[] }
 *  - Valida com Zod (limites de tamanho por campo e por lote)
 *  - Rate limit por IP: 60 batches / minuto
 *  - Escreve via RPC SECURITY DEFINER `analytics_ingest_batch`
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const eventSchema = z
  .object({
    kind: z.enum([
      "pageview", "click", "scroll", "idle", "tab_hidden", "tab_visible",
      "error", "mousemove", "custom",
    ]),
    ts: z.string().datetime().optional(),
    client_event_id: z.string().min(1).max(64),
    path: z.string().max(400).optional(),
    url: z.string().max(2048).optional(),
    title: z.string().max(300).optional(),
    duration_ms: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
    is_exit: z.boolean().optional(),
    name: z.string().max(80).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const schema = z
  .object({
    visitor: z
      .object({
        id: z.string().uuid().optional().nullable(),
        ua_hash: z.string().max(32).optional(),
      })
      .optional()
      .default({}),
    session: z
      .object({
        id: z.string().uuid().optional().nullable(),
        user_id: z.string().uuid().optional().nullable(),
        device_type: z.string().max(20).optional(),
        os_family: z.string().max(30).optional(),
        browser_family: z.string().max(30).optional(),
        lang: z.string().max(20).optional(),
        screen_w: z.number().int().min(0).max(30_000).optional(),
        screen_h: z.number().int().min(0).max(30_000).optional(),
        viewport_w: z.number().int().min(0).max(30_000).optional(),
        viewport_h: z.number().int().min(0).max(30_000).optional(),
        referrer: z.string().max(2048).optional(),
        utm_source: z.string().max(100).optional(),
        utm_medium: z.string().max(100).optional(),
        utm_campaign: z.string().max(100).optional(),
        utm_term: z.string().max(100).optional(),
        utm_content: z.string().max(100).optional(),
      })
      .optional()
      .default({}),
    events: z.array(eventSchema).min(1).max(60),
  })
  .strict();

/** Trunca IP para /24 IPv4 ou /48 IPv6. Nunca persiste o IP inteiro. */
function truncateIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (ip.includes(".")) {
    const p = ip.split(".");
    if (p.length !== 4) return null;
    return `${p[0]}.${p[1]}.${p[2]}.0`;
  }
  if (ip.includes(":")) {
    const p = ip.split(":");
    return `${p.slice(0, 3).join(":")}::`;
  }
  return null;
}

/** Mascara padrões óbvios (CPF, cartão, JWT, e-mail) em qualquer string. */
function mask(input: unknown): unknown {
  if (typeof input === "string") {
    let s = input;
    // CPF 000.000.000-00
    s = s.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[cpf]");
    // Cartão 13-19 dígitos
    s = s.replace(/\b(?:\d[ -]?){13,19}\b/g, "[card]");
    // CVV curto após "cvv"
    s = s.replace(/(cvv[^0-9]{0,5})\d{3,4}/gi, "$1[cvv]");
    // JWT (3 partes base64url)
    s = s.replace(/\beyJ[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+\b/g, "[jwt]");
    // Bearer tokens
    s = s.replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, "Bearer [token]");
    return s;
  }
  if (Array.isArray(input)) return input.map(mask);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = /password|cpf|card|cvv|token|secret/i.test(k) ? "[redacted]" : mask(v);
    }
    return out;
  }
  return input;
}

export const Route = createFileRoute("/api/public/analytics/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = schema.safeParse(raw);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "invalid_payload", issues: parsed.error.issues.slice(0, 3) }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Rate limit por IP: 60 batches/min. Fail-open se a RPC não existir.
          const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
          try {
            const rl = await supabaseAdmin.rpc("check_rate_limit" as never, {
              _bucket: "analytics_ingest",
              _subject: ip,
              _max: 60,
              _window_seconds: 60,
            } as never);
            if (rl.data === false) {
              return new Response(JSON.stringify({ error: "rate_limited" }), {
                status: 429,
                headers: { "Content-Type": "application/json" },
              });
            }
          } catch { /* fail-open */ }

          // Enriquecimento server-side
          const ipPrefix = truncateIp(ip);
          const country = getRequestHeader("cf-ipcountry") ?? undefined;
          const city = getRequestHeader("cf-ipcity") ?? undefined;

          const payload = {
            visitor: parsed.data.visitor,
            session: {
              ...parsed.data.session,
              ip_prefix: ipPrefix ?? undefined,
              country,
              city,
            },
            events: parsed.data.events.map((e) => ({
              ...e,
              ts: e.ts ?? new Date().toISOString(),
              props: e.props ? (mask(e.props) as Record<string, unknown>) : undefined,
              payload: e.payload ? (mask(e.payload) as Record<string, unknown>) : undefined,
            })),
          };

          const { data, error } = await supabaseAdmin.rpc(
            "analytics_ingest_batch" as never,
            { _payload: payload } as never,
          );
          if (error) {
            return new Response(JSON.stringify({ error: "ingest_failed", message: error.message }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify(data ?? { ok: true }), {
            status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "internal", message: err instanceof Error ? err.message : "unknown" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      // Alguns navegadores fazem OPTIONS antes do POST — respondemos 204 same-origin.
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
