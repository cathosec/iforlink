// Selos SVG dos apoiadores do módulo PIX.
// Cinco tipos: bronze, silver, gold, diamond, legend (usa a marca ForLink).
import type { CSSProperties } from "react";

export type PixBadgeKey = "bronze" | "silver" | "gold" | "diamond" | "legend";

interface Props {
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const wrap = (size: number) => ({ width: size, height: size, display: "inline-block" as const });

/* ─── Bronze ─── */
export function BronzeBadge({ size = 40, className, style, title = "Bronze" }: Props) {
  return (
    <svg viewBox="0 0 64 64" style={{ ...wrap(size), ...style }} className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="pb-bronze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5c088" />
          <stop offset="50%" stopColor="#c88852" />
          <stop offset="100%" stopColor="#7a4a24" />
        </linearGradient>
      </defs>
      <path d="M22 4h20l6 12-16 20L16 16z" fill="#a16207" opacity=".9" />
      <circle cx="32" cy="40" r="18" fill="url(#pb-bronze)" stroke="#7a4a24" strokeWidth="1.5" />
      <circle cx="32" cy="40" r="13" fill="none" stroke="#fff6" strokeWidth="1" />
      <path d="M32 30l3 6 6 .8-4.4 4.2 1 6L32 44l-5.6 3 1-6-4.4-4.2 6-.8z" fill="#fff" />
    </svg>
  );
}

/* ─── Silver ─── */
export function SilverBadge({ size = 40, className, style, title = "Prata" }: Props) {
  return (
    <svg viewBox="0 0 64 64" style={{ ...wrap(size), ...style }} className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="pb-silver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path d="M14 6h16l4 14-10 12-14-18z" fill="#94a3b8" />
      <path d="M50 6H34l-4 14 10 12 14-18z" fill="#64748b" />
      <circle cx="32" cy="40" r="18" fill="url(#pb-silver)" stroke="#475569" strokeWidth="1.5" />
      <circle cx="32" cy="40" r="13" fill="none" stroke="#fff8" strokeWidth="1" />
      <path d="M32 30l3.4 6.9 7.6.9-5.5 5.2 1.3 7.5L32 46.9l-6.8 3.6 1.3-7.5L21 37.8l7.6-.9z" fill="#fff" />
    </svg>
  );
}

/* ─── Gold ─── */
export function GoldBadge({ size = 40, className, style, title = "Ouro" }: Props) {
  return (
    <svg viewBox="0 0 64 64" style={{ ...wrap(size), ...style }} className={className} role="img" aria-label={title}>
      <defs>
        <radialGradient id="pb-gold" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff5c2" />
          <stop offset="55%" stopColor="#f6c344" />
          <stop offset="100%" stopColor="#8a5a00" />
        </radialGradient>
      </defs>
      <path d="M12 8l10 14-10 6z" fill="#d97706" />
      <path d="M52 8L42 22l10 6z" fill="#b45309" />
      <path d="M20 6h24l6 16H14z" fill="#f59e0b" />
      <circle cx="32" cy="40" r="20" fill="url(#pb-gold)" stroke="#8a5a00" strokeWidth="2" />
      <circle cx="32" cy="40" r="14.5" fill="none" stroke="#fffa" strokeWidth="1" />
      <path d="M32 28l4 8.3 9.2 1.1-6.7 6.3 1.6 9L32 48.4l-8.1 4.3 1.6-9-6.7-6.3 9.2-1.1z" fill="#fff" />
    </svg>
  );
}

/* ─── Diamond ─── */
export function DiamondBadge({ size = 40, className, style, title = "Diamante" }: Props) {
  return (
    <svg viewBox="0 0 64 64" style={{ ...wrap(size), ...style }} className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="pb-diamond" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="45%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <path d="M32 4l14 12-14 44L18 16z" fill="url(#pb-diamond)" stroke="#075985" strokeWidth="1.4" />
      <path d="M32 4l14 12H18z" fill="#bae6fd" opacity=".9" />
      <path d="M32 4L18 16l14 6 14-6z" fill="none" stroke="#0369a1" strokeWidth="1" />
      <path d="M32 22v38" stroke="#0369a1" strokeWidth="1" opacity=".6" />
      <path d="M24 12l8 10 8-10" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".8" />
    </svg>
  );
}

/* ─── Legend (marca ForLink) ─── */
export function ForLinkLegendBadge({ size = 44, className, style, title = "Lenda ForLink" }: Props) {
  return (
    <svg viewBox="0 0 64 64" style={{ ...wrap(size), ...style }} className={className} role="img" aria-label={title}>
      <defs>
        <radialGradient id="pb-legend-bg" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="60%" stopColor="#2b7fff" />
          <stop offset="100%" stopColor="#0b3b8a" />
        </radialGradient>
        <linearGradient id="pb-legend-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Estrela em raios */}
      <g fill="url(#pb-legend-ring)" opacity=".85">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="31" y="1" width="2" height="8" rx="1" transform={`rotate(${i * 30} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="24" fill="url(#pb-legend-ring)" />
      <circle cx="32" cy="32" r="21" fill="url(#pb-legend-bg)" />
      {/* Marca ForLink — dois "L" espelhados simplificados */}
      <g transform="translate(14 14) scale(0.072)">
        <path d="M214.23 312.43c-36.1 0-90.15 0-126.28-.28a21 21 0 0 1-13-5.24c-21.81-21.28-43.26-43-64.72-64.75-13.48-13.63-13.69-23.59-.07-37.36C48.22 166.36 86.59 128.28 124.82 90c30-30 59.89-60.13 89.63-90l66.63 67.09c-16.39 16.25-33.3 33-50.14 49.76-33.13 33.06-66.11 66.39-99.45 99.2-5.55 5.49-6 8.67 0 14.54 26 25.3 57.12 56.22 82.74 81.84" fill="#ffffff" />
        <path d="M221.4 134.94s84 0 121.2.28a20.69 20.69 0 0 1 12.79 5.45c22.12 21.49 43.79 43.43 65.56 65.27 12.68 12.76 13 22.33.24 35.22Q366.92 296.09 312 350.61c-29.63 29.66-59.4 59.16-88.83 89-5.55 5.66-9.12 6.18-14.85.28-17-17.48-34.45-34.67-51.89-51.82-4.61-4.51-5.2-7.94 0-12.93 17.93-17.48 35.47-35.33 53-53.15l13.21-13.21q37.53-37.14 74.85-74.39c10.48-10.49 10.48-11.15 0-21.46-23.62-23.71-52.43-54.3-76.13-78" fill="#ffffff" />
      </g>
    </svg>
  );
}

export const PIX_BADGE_META: Record<PixBadgeKey, { label: string; color: string }> = {
  bronze: { label: "Bronze", color: "#a16207" },
  silver: { label: "Prata", color: "#64748b" },
  gold: { label: "Ouro", color: "#eab308" },
  diamond: { label: "Diamante", color: "#0ea5e9" },
  legend: { label: "Lenda ForLink", color: "#2b7fff" },
};

export function PixBadge({ badgeKey, size = 40, className, style }: { badgeKey: PixBadgeKey } & Props) {
  const Cmp =
    badgeKey === "bronze" ? BronzeBadge :
    badgeKey === "silver" ? SilverBadge :
    badgeKey === "gold" ? GoldBadge :
    badgeKey === "diamond" ? DiamondBadge :
    ForLinkLegendBadge;
  return <Cmp size={size} className={className} style={style} title={PIX_BADGE_META[badgeKey]?.label} />;
}
