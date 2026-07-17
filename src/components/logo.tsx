import { cn } from "@/lib/utils";

export function LogoMark({ className, tone = "color" }: { className?: string; tone?: "color" | "white" }) {
  const src = tone === "white" ? "/brand/mark-white.svg" : "/brand/mark-color.svg";
  return <img src={src} alt="Belink" className={cn("h-7 w-7", className)} />;
}

export function LogoWordmark({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  // tone=light → for light backgrounds (dark text); tone=dark → for dark backgrounds (white text)
  const src = tone === "dark" ? "/brand/wordmark-dark.svg" : "/brand/wordmark-light.svg";
  return <img src={src} alt="Belink" className={cn("h-6 w-auto", className)} />;
}
