/**
 * Temas visuais para a página pública do perfil (/@usuario).
 * Cada tema sobrescreve variáveis CSS já usadas pelo Tailwind
 * (via `@theme inline` em src/styles.css), então basta aplicar `style` no
 * wrapper da página para o tema inteiro trocar de aparência.
 *
 * Para adicionar um tema novo: inclua uma entrada em PROFILE_THEMES
 * e (opcionalmente) atualize o array PROFILE_THEME_LIST para exibi-lo
 * no seletor do painel.
 */

export type ProfileThemeId =
  | "default"
  | "dark-minimalist"
  | "glassmorphism"
  | "cyberpunk"
  | "pastel-soft"
  | "clean-light";

export interface ProfileThemeMeta {
  id: ProfileThemeId;
  label: string;
  description: string;
  /** Amostras usadas no seletor: [fundo, card, texto, accent]. */
  swatch: [string, string, string, string];
  /** Só usuários Pro/Admin podem selecionar? Todos os temas custom são Pro. */
  proOnly: boolean;
}

interface ProfileThemeTokens {
  /** Variáveis CSS aplicadas no wrapper — cobrem tudo que a página consome. */
  vars: Record<string, string>;
  /** Classes utilitárias adicionais (font-family, animações, etc.). */
  className?: string;
  /** Estilo do <body> / fundo da página (gradiente, imagem, etc.). */
  background?: string;
  /** Fonte aplicada no wrapper. */
  fontFamily?: string;
  /** Ajustes locais em CSS puro escopados via `:where(.forlink-theme)`. */
  extraCss?: string;
}

export interface ProfileTheme extends ProfileThemeMeta, ProfileThemeTokens {}

/** Tema padrão — mantém a identidade "deep blue" do ForLink. */
const defaultTheme: ProfileTheme = {
  id: "default",
  label: "ForLink (padrão)",
  description: "Tema oficial em azul profundo, ideal para começar.",
  swatch: ["#f7f8fc", "#ffffff", "#111827", "#2a3fb8"],
  proOnly: false,
  vars: {},
};

const darkMinimalist: ProfileTheme = {
  id: "dark-minimalist",
  label: "Dark Minimalist",
  description: "Fundo quase preto, cards cinza escuro e brilho sutil no hover.",
  swatch: ["#0d0d0d", "#171717", "#f5f5f5", "#22d3ee"],
  proOnly: true,
  background: "#0d0d0d",
  vars: {
    "--background": "oklch(0.14 0 0)",
    "--foreground": "oklch(0.97 0 0)",
    "--card": "oklch(0.18 0 0)",
    "--card-foreground": "oklch(0.97 0 0)",
    "--popover": "oklch(0.18 0 0)",
    "--popover-foreground": "oklch(0.97 0 0)",
    "--primary": "oklch(0.85 0.14 200)",
    "--primary-foreground": "oklch(0.14 0 0)",
    "--secondary": "oklch(0.22 0 0)",
    "--secondary-foreground": "oklch(0.97 0 0)",
    "--muted": "oklch(0.22 0 0)",
    "--muted-foreground": "oklch(0.72 0 0)",
    "--accent": "oklch(0.24 0.02 220)",
    "--accent-foreground": "oklch(0.97 0 0)",
    "--border": "oklch(1 0 0 / 8%)",
    "--input": "oklch(1 0 0 / 10%)",
    "--ring": "oklch(0.85 0.14 200)",
    "--brand": "oklch(0.85 0.14 200)",
    "--brand-foreground": "oklch(0.14 0 0)",
    "--brand-soft": "oklch(0.22 0.05 220)",
    "--radius": "0.5rem",
  },
  extraCss: `
    .forlink-theme [data-cat-id] { transition: box-shadow .3s ease, border-color .3s ease, transform .2s ease; }
    .forlink-theme [data-cat-id]:hover { box-shadow: 0 0 0 1px oklch(0.85 0.14 200 / .35), 0 0 24px oklch(0.85 0.14 200 / .15); }
  `,
};

const glassmorphism: ProfileTheme = {
  id: "glassmorphism",
  label: "Glassmorphism",
  description: "Gradiente vibrante ao fundo com cards translúcidos e desfocados.",
  swatch: ["#1e1b4b", "#ffffff20", "#f8fafc", "#a78bfa"],
  proOnly: true,
  background:
    "radial-gradient(1200px 800px at 10% -10%, #7c3aed 0%, transparent 60%), radial-gradient(1000px 700px at 100% 20%, #0ea5e9 0%, transparent 55%), linear-gradient(160deg, #0b1024 0%, #1e1b4b 60%, #4c1d95 100%)",
  vars: {
    "--background": "oklch(0.20 0.06 285)",
    "--foreground": "oklch(0.98 0.01 250)",
    "--card": "oklch(1 0 0 / 0.08)",
    "--card-foreground": "oklch(0.98 0.01 250)",
    "--popover": "oklch(0.22 0.06 285)",
    "--popover-foreground": "oklch(0.98 0.01 250)",
    "--primary": "oklch(0.82 0.14 300)",
    "--primary-foreground": "oklch(0.18 0.06 285)",
    "--secondary": "oklch(1 0 0 / 0.06)",
    "--secondary-foreground": "oklch(0.98 0.01 250)",
    "--muted": "oklch(1 0 0 / 0.08)",
    "--muted-foreground": "oklch(0.85 0.03 260)",
    "--accent": "oklch(1 0 0 / 0.10)",
    "--accent-foreground": "oklch(0.98 0.01 250)",
    "--border": "oklch(1 0 0 / 0.18)",
    "--input": "oklch(1 0 0 / 0.14)",
    "--ring": "oklch(0.82 0.14 300)",
    "--brand": "oklch(0.82 0.14 300)",
    "--brand-foreground": "oklch(0.18 0.06 285)",
    "--brand-soft": "oklch(1 0 0 / 0.12)",
    "--radius": "1rem",
  },
  extraCss: `
    .forlink-theme [data-cat-id],
    .forlink-theme .glass-card {
      backdrop-filter: blur(18px) saturate(150%);
      background: color-mix(in oklab, white 8%, transparent);
      border: 1px solid color-mix(in oklab, white 20%, transparent);
    }
  `,
};

const cyberpunk: ProfileTheme = {
  id: "cyberpunk",
  label: "Cyberpunk Neon",
  description: "Preto absoluto, neon rosa/verde e vibração retrô-futurista.",
  swatch: ["#050014", "#0b0320", "#e0f2fe", "#ff2bd6"],
  proOnly: true,
  background:
    "radial-gradient(600px 400px at 20% 0%, #ff2bd633 0%, transparent 60%), radial-gradient(500px 400px at 100% 100%, #22ee9a33 0%, transparent 60%), #050014",
  fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  vars: {
    "--background": "oklch(0.10 0.05 290)",
    "--foreground": "oklch(0.97 0.02 200)",
    "--card": "oklch(0.14 0.06 290)",
    "--card-foreground": "oklch(0.97 0.02 200)",
    "--popover": "oklch(0.14 0.06 290)",
    "--popover-foreground": "oklch(0.97 0.02 200)",
    "--primary": "oklch(0.78 0.28 340)",
    "--primary-foreground": "oklch(0.10 0.05 290)",
    "--secondary": "oklch(0.18 0.08 290)",
    "--secondary-foreground": "oklch(0.97 0.02 200)",
    "--muted": "oklch(0.18 0.08 290)",
    "--muted-foreground": "oklch(0.82 0.10 200)",
    "--accent": "oklch(0.20 0.10 290)",
    "--accent-foreground": "oklch(0.97 0.02 200)",
    "--border": "oklch(0.78 0.28 340 / 0.35)",
    "--input": "oklch(0.78 0.28 340 / 0.25)",
    "--ring": "oklch(0.78 0.28 340)",
    "--brand": "oklch(0.85 0.24 155)",
    "--brand-foreground": "oklch(0.10 0.05 290)",
    "--brand-soft": "oklch(0.24 0.12 290)",
    "--radius": "0.25rem",
  },
  extraCss: `
    .forlink-theme h1, .forlink-theme h2, .forlink-theme h3 {
      text-shadow: 0 0 12px color-mix(in oklab, oklch(0.78 0.28 340) 55%, transparent);
    }
    .forlink-theme [data-cat-id] {
      border-color: color-mix(in oklab, oklch(0.85 0.24 155) 45%, transparent);
      box-shadow: 0 0 0 1px color-mix(in oklab, oklch(0.85 0.24 155) 25%, transparent),
                  0 0 20px color-mix(in oklab, oklch(0.85 0.24 155) 15%, transparent);
    }
    .forlink-theme [data-cat-id]:hover {
      border-color: oklch(0.78 0.28 340 / .85);
      box-shadow: 0 0 0 1px oklch(0.78 0.28 340 / .6), 0 0 32px oklch(0.78 0.28 340 / .35);
    }
  `,
};

const pastelSoft: ProfileTheme = {
  id: "pastel-soft",
  label: "Pastel Soft",
  description: "Paleta em lavanda e rosa claro, cantos redondos e sombra suave.",
  swatch: ["#fdf2f8", "#ffffff", "#3f3352", "#a78bfa"],
  proOnly: true,
  background: "linear-gradient(160deg, #fdf2f8 0%, #ede9fe 60%, #e0f2fe 100%)",
  vars: {
    "--background": "oklch(0.98 0.02 340)",
    "--foreground": "oklch(0.30 0.05 300)",
    "--card": "oklch(1 0 0)",
    "--card-foreground": "oklch(0.30 0.05 300)",
    "--popover": "oklch(1 0 0)",
    "--popover-foreground": "oklch(0.30 0.05 300)",
    "--primary": "oklch(0.72 0.15 300)",
    "--primary-foreground": "oklch(0.99 0 0)",
    "--secondary": "oklch(0.96 0.03 320)",
    "--secondary-foreground": "oklch(0.35 0.05 300)",
    "--muted": "oklch(0.96 0.03 320)",
    "--muted-foreground": "oklch(0.55 0.05 300)",
    "--accent": "oklch(0.95 0.05 340)",
    "--accent-foreground": "oklch(0.35 0.05 300)",
    "--border": "oklch(0.90 0.03 320)",
    "--input": "oklch(0.92 0.03 320)",
    "--ring": "oklch(0.72 0.15 300)",
    "--brand": "oklch(0.72 0.15 300)",
    "--brand-foreground": "oklch(0.99 0 0)",
    "--brand-soft": "oklch(0.93 0.06 320)",
    "--radius": "1.25rem",
  },
  extraCss: `
    .forlink-theme [data-cat-id] {
      box-shadow: 0 10px 30px -18px oklch(0.55 0.15 320 / 0.35);
    }
  `,
};

const cleanLight: ProfileTheme = {
  id: "clean-light",
  label: "Clean Light",
  description: "Branco neutro, cards com sombra fina e tipografia nítida.",
  swatch: ["#f9fafb", "#ffffff", "#0f172a", "#2563eb"],
  proOnly: true,
  background: "#f9fafb",
  vars: {
    "--background": "oklch(0.985 0.002 250)",
    "--foreground": "oklch(0.20 0.03 260)",
    "--card": "oklch(1 0 0)",
    "--card-foreground": "oklch(0.20 0.03 260)",
    "--popover": "oklch(1 0 0)",
    "--popover-foreground": "oklch(0.20 0.03 260)",
    "--primary": "oklch(0.55 0.18 260)",
    "--primary-foreground": "oklch(0.99 0 0)",
    "--secondary": "oklch(0.965 0.005 250)",
    "--secondary-foreground": "oklch(0.22 0.03 260)",
    "--muted": "oklch(0.965 0.005 250)",
    "--muted-foreground": "oklch(0.48 0.02 260)",
    "--accent": "oklch(0.955 0.01 260)",
    "--accent-foreground": "oklch(0.22 0.03 260)",
    "--border": "oklch(0.92 0.005 250)",
    "--input": "oklch(0.92 0.005 250)",
    "--ring": "oklch(0.55 0.18 260)",
    "--brand": "oklch(0.55 0.18 260)",
    "--brand-foreground": "oklch(0.99 0 0)",
    "--brand-soft": "oklch(0.94 0.04 260)",
    "--radius": "0.75rem",
  },
  extraCss: `
    .forlink-theme [data-cat-id] {
      box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 4px 12px -6px rgba(15,23,42,.08);
    }
  `,
};

export const PROFILE_THEMES: Record<ProfileThemeId, ProfileTheme> = {
  default: defaultTheme,
  "dark-minimalist": darkMinimalist,
  glassmorphism,
  cyberpunk,
  "pastel-soft": pastelSoft,
  "clean-light": cleanLight,
};

export const PROFILE_THEME_LIST: ProfileTheme[] = [
  defaultTheme,
  cleanLight,
  darkMinimalist,
  glassmorphism,
  cyberpunk,
  pastelSoft,
];

export function resolveProfileTheme(id: string | null | undefined): ProfileTheme {
  if (!id) return defaultTheme;
  return PROFILE_THEMES[id as ProfileThemeId] ?? defaultTheme;
}
