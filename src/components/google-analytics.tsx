import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { usePlatformSetting } from "@/lib/use-platform-setting";
import { hasAnalyticsConsent, onConsentChange } from "@/lib/consent";
import { trackPageView } from "@/lib/analytics";

type AnalyticsSetting = { ga_measurement_id?: string };

export function GoogleAnalytics() {
  const { data } = usePlatformSetting<AnalyticsSetting>("analytics");
  const id = (data?.ga_measurement_id ?? "").trim();
  const router = useRouter();

  // Load the GA script once analytics consent is granted.
  useEffect(() => {
    if (!id) return;
    if (typeof document === "undefined") return;

    const load = () => {
      if (!hasAnalyticsConsent()) return;
      if (document.getElementById("ga-loader")) return;

      const s1 = document.createElement("script");
      s1.id = "ga-loader";
      s1.async = true;
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(s1);

      const s2 = document.createElement("script");
      s2.id = "ga-init";
      s2.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true,send_page_view:false});`;
      document.head.appendChild(s2);
    };

    load();
    const off = onConsentChange(load);
    return off;
  }, [id]);

  // Track SPA route changes as page views.
  useEffect(() => {
    if (!id) return;
    // Initial page view
    trackPageView(router.state.location.href);

    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      trackPageView(toLocation.href);
    });
    return unsub;
  }, [id, router]);

  return null;
}
