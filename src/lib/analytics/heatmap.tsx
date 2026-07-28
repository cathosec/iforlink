/**
 * Heatmap renderer — canvas 2D com "blobs" radiais.
 *
 * Entrada: pontos {x, y, vw, vh, kind}. Cada ponto é normalizado para 0-1
 * usando o viewport onde foi capturado e depois desenhado na dimensão alvo.
 * Cliques têm peso maior que movimentos.
 */

import { useEffect, useMemo, useRef } from "react";

export type HeatmapPoint = {
  kind: "click" | "mousemove" | string;
  x: number;
  y: number;
  vw: number;
  vh: number;
};

type Props = {
  points: HeatmapPoint[];
  width?: number;
  aspect?: number; // altura = width / aspect
  showClicks?: boolean;
  showMoves?: boolean;
};

/**
 * Desenha um "blob" radial com fade. Usado para acumular densidade.
 */
function drawBlob(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number, alpha: number,
) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Aplica colormap (frio→quente) usando o alpha acumulado como intensidade.
 * Feito uma única vez depois de todos os pontos.
 */
function applyColormap(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    // Intensidade 0..1
    const t = Math.min(1, a / 255);
    // 5 paradas: azul → ciano → verde → amarelo → vermelho
    let r = 0, g = 0, b = 0;
    if (t < 0.25) {
      const k = t / 0.25;
      r = 0; g = Math.round(180 * k); b = 255;
    } else if (t < 0.5) {
      const k = (t - 0.25) / 0.25;
      r = 0; g = 180 + Math.round(75 * k); b = Math.round(255 * (1 - k));
    } else if (t < 0.75) {
      const k = (t - 0.5) / 0.25;
      r = Math.round(255 * k); g = 255; b = 0;
    } else {
      const k = (t - 0.75) / 0.25;
      r = 255; g = Math.round(255 * (1 - k)); b = 0;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
    d[i + 3] = Math.round(180 * t + 50); // deixa mais visível
  }
  ctx.putImageData(img, 0, 0);
}

export function Heatmap({
  points,
  width = 1200,
  aspect = 16 / 9,
  showClicks = true,
  showMoves = true,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const height = Math.round(width / aspect);

  const filtered = useMemo(
    () =>
      points.filter((p) => {
        if (p.vw <= 0 || p.vh <= 0) return false;
        if (p.kind === "click" && !showClicks) return false;
        if (p.kind === "mousemove" && !showMoves) return false;
        return true;
      }),
    [points, showClicks, showMoves],
  );

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = width * dpr;
    cv.height = height * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (filtered.length === 0) return;

    // Camada de densidade (alpha acumulado)
    ctx.globalCompositeOperation = "source-over";
    for (const p of filtered) {
      const nx = (p.x / p.vw) * width;
      const ny = (p.y / p.vh) * height;
      const isClick = p.kind === "click";
      drawBlob(ctx, nx, ny, isClick ? 30 : 20, isClick ? 0.35 : 0.08);
    }

    applyColormap(ctx, width * dpr, height * dpr);
  }, [filtered, width, height]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border bg-slate-950">
      <canvas
        ref={ref}
        style={{ width: "100%", height: "auto", aspectRatio: `${aspect}` }}
        aria-label="Mapa de calor"
      />
      {filtered.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-white/70">
          Sem eventos no período selecionado.
        </div>
      )}
    </div>
  );
}
