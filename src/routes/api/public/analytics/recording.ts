/**
 * POST /api/public/analytics/recording
 *
 * Recebe um chunk de gravação rrweb e grava via RPC SECURITY DEFINER
 * `analytics_ingest_recording_chunk`. Rate-limit por IP.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { readMaybeGzip } from "./-_body";

// Cada evento rrweb é opaco — validamos apenas o shape mínimo.
const rrwebEventSchema = z
  .object({
    type: z.number().int().min(0).max(10),
    timestamp: z.number().int().min(0),
    data: z.unknown(),
  })
  .passthrough();

const schema = z
  .object({
    session_id: z.string().uuid(),
    visitor_id: z.string().uuid().nullable().optional(),
    path: z.string().min(1).max(400),
    title: z.string().max(300).optional(),
    chunk_index: z.number().int().min(0).max(100_000),
    events: z.array(rrwebEventSchema).min(1).max(1_000),
    started_at: z.string().datetime(),
    ended_at: z.string().datetime(),
    duration_ms: z.number().int().min(0).max(24 * 60 * 60 * 1000),
    viewport_w: z.number().int().min(0).max(30_000).nullable().optional(),
    viewport_h: z.number().int().min(0).max(30_000).nullable().optional(),
    bytes: z.number().int().min(0).max(10 * 1024 * 1024).optional(),
  })
  .strict();

export const Route = createFileRoute("/api/public/analytics/recording")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await readMaybeGzip(request, 4 * 1024 * 1024);
          if (raw == null) {
            return new Response(JSON.stringify({ error: "payload_too_large" }), {
              status: 413, headers: { "Content-Type": "application/json" },
            });
          }
          let parsedJson: unknown = null;
          try { parsedJson = JSON.parse(raw); } catch { parsedJson = null; }
          const parsed = schema.safeParse(parsedJson);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "invalid_payload", issues: parsed.error.issues.slice(0, 3) }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Rate limit — 30 chunks/min por IP
          const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
          try {
            const rl = await supabaseAdmin.rpc("check_rate_limit" as never, {
              _bucket: "analytics_recording",
              _subject: ip,
              _max: 30,
              _window_seconds: 60,
            } as never);
            if (rl.data === false) {
              return new Response(JSON.stringify({ error: "rate_limited" }), {
                status: 429, headers: { "Content-Type": "application/json" },
              });
            }
          } catch { /* fail-open */ }

          const { data, error } = await supabaseAdmin.rpc(
            "analytics_ingest_recording_chunk" as never,
            { _payload: parsed.data } as never,
          );
          if (error) {
            return new Response(JSON.stringify({ error: "ingest_failed", message: error.message }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ id: data ?? null }), {
            status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "internal", message: err instanceof Error ? err.message : "unknown" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
