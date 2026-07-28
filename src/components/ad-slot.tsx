import { useEffect, useRef, useState } from "react";
import { usePlatformSetting } from "@/lib/use-platform-setting";
import { useFlag } from "@/lib/flags";
import { hasAdsConsent, onConsentChange } from "@/lib/consent";


type AdConfig = {
  enabled?: boolean;
  top?: { enabled?: boolean; code?: string };
  feed?: { enabled?: boolean; code?: string; every?: number };
  profile?: { enabled?: boolean; code?: string };
  mobile_sticky?: { enabled?: boolean; code?: string };
};

type SlotName = "top" | "feed" | "profile" | "mobile_sticky";

/** Renders raw HTML+JS ad code from platform settings. Only after LGPD consent. */
export function AdSlot({
  slot,
  className,
  label = "Publicidade",
}: {
  slot: SlotName;
  className?: string;
  label?: string;
}) {
  const { data } = usePlatformSetting<AdConfig>("ads");
  const adsFlag = useFlag("ads_enabled");
  const ref = useRef<HTMLDivElement | null>(null);
  const [consent, setConsent] = useState<boolean>(false);

  useEffect(() => {
    setConsent(hasAdsConsent());
    return onConsentChange(() => setConsent(hasAdsConsent()));
  }, []);

  const cfg = data?.[slot];
  const globalOn = data?.enabled !== false && adsFlag;
  const enabled = globalOn && cfg?.enabled && (cfg?.code ?? "").trim().length > 0;


  useEffect(() => {
    if (!enabled || !consent || !ref.current) return;
    const container = ref.current;
    container.innerHTML = cfg!.code!;
    // Re-execute any <script> tags injected via innerHTML.
    container.querySelectorAll("script").forEach((oldScript) => {
      const s = document.createElement("script");
      for (const attr of Array.from(oldScript.attributes)) {
        s.setAttribute(attr.name, attr.value);
      }
      s.text = oldScript.textContent ?? "";
      oldScript.parentNode?.replaceChild(s, oldScript);
    });
  }, [enabled, consent, cfg?.code]);

  if (!enabled) return null;
  if (!consent) return null;

  const wrapperCls =
    slot === "mobile_sticky"
      ? `fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden ${className ?? ""}`
      : `my-6 w-full ${className ?? ""}`;

  return (
    <aside
      className={wrapperCls}
      aria-label={label}
      role="complementary"
      data-ad-slot={slot}
    >
      <div className="mx-auto max-w-6xl px-3 py-2">
        <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div
          ref={ref}
          className="mx-auto mt-1 flex min-h-[60px] w-full items-center justify-center overflow-hidden text-center [&_iframe]:max-w-full [&_ins]:max-w-full"
        />
      </div>
    </aside>
  );
}
