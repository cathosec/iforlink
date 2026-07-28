/**
 * Reprodutor de sessão via rrweb-player.
 *
 * - Busca todos os chunks via RPC `analytics_get_recording`.
 * - Concatena `events` em ordem (chunk_index, timestamp).
 * - Instancia rrweb-player em um container e desmonta ao trocar de sessão.
 * - Requer que o CSS do rrweb-player esteja carregado (importado neste arquivo).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - rrweb-player CSS não possui tipos
import "rrweb-player/dist/style.css";

type ChunkRow = {
  chunk_index: number;
  events: unknown[];
  started_at: string;
  ended_at: string;
  path: string;
};

export function SessionPlayer({ sessionId }: { sessionId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<unknown>(null);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "empty" }
    | { kind: "error"; message: string }
    | { kind: "ready" }
  >({ kind: "loading" });

  // Fetch dos chunks
  const [events, setEvents] = useState<unknown[] | null>(null);

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    setEvents(null);

    (async () => {
      const { data, error } = await supabase.rpc("analytics_get_recording" as never, {
        _session_id: sessionId,
      } as never);
      if (!alive) return;
      if (error) { setState({ kind: "error", message: error.message }); return; }
      const rows = (data ?? []) as unknown as ChunkRow[];
      const flat: unknown[] = [];
      for (const r of rows) {
        for (const ev of r.events ?? []) flat.push(ev);
      }
      if (flat.length < 2) { setState({ kind: "empty" }); return; }
      setEvents(flat);
    })();

    return () => { alive = false; };
  }, [sessionId]);

  // Instancia o player quando events e container estão prontos
  useEffect(() => {
    if (!events || !containerRef.current) return;
    let disposed = false;

    (async () => {
      // Limpa qualquer player anterior
      containerRef.current!.innerHTML = "";
      try {
        const mod = await import("rrweb-player");
        const Player = (mod.default ?? mod) as unknown as new (opts: Record<string, unknown>) => unknown;
        if (disposed) return;

        const width = Math.min(containerRef.current!.clientWidth || 900, 1280);
        // rrweb-player calcula altura respeitando a proporção do viewport gravado
        playerRef.current = new Player({
          target: containerRef.current!,
          props: {
            events,
            width,
            height: Math.round(width * 9 / 16),
            autoPlay: false,
            speedOption: [1, 2, 4, 8],
            showController: true,
            skipInactive: true,
          },
        });
        setState({ kind: "ready" });
      } catch (err) {
        setState({ kind: "error", message: err instanceof Error ? err.message : "player_failed" });
      }
    })();

    return () => {
      disposed = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
      playerRef.current = null;
    };
  }, [events]);

  return (
    <div className="w-full">
      {state.kind === "loading" && (
        <div className="grid aspect-video w-full place-items-center rounded-xl border bg-muted/30 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando gravação…</span>
        </div>
      )}
      {state.kind === "empty" && (
        <div className="grid aspect-video w-full place-items-center rounded-xl border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          Esta sessão não tem eventos suficientes para reprodução.
        </div>
      )}
      {state.kind === "error" && (
        <div className="grid aspect-video w-full place-items-center rounded-xl border bg-destructive/10 p-4 text-center text-xs text-destructive">
          {state.message}
        </div>
      )}
      <div
        ref={containerRef}
        className="mx-auto max-w-full overflow-hidden rounded-xl border bg-background"
        style={{ display: state.kind === "ready" ? "block" : "none" }}
      />
    </div>
  );
}

/** Formata "há X min" simplificado em pt-BR. */
export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `há ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} d`;
}

/** Formata duração em mm:ss. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type { ChunkRow };
export const __memoPlaceholder = useMemo;
