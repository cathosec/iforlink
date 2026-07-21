import { useEffect } from "react";
import { usePlatformSetting } from "@/lib/use-platform-setting";

type AnalyticsSetting = { ga_measurement_id?: string };

export function GoogleAnalytics() {
  const { data } = usePlatformSetting<AnalyticsSetting>("analytics");
  const id = (data?.ga_measurement_id ?? "").trim();

  useEffect(() => {
    if (!id) return;
    if (typeof document === "undefined") return;
    if (document.getElementById("ga-loader")) return;

    const s1 = document.createElement("script");
    s1.id = "ga-loader";
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s1);

    const s2 = document.createElement("script");
    s2.id = "ga-init";
    s2.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`;
    document.head.appendChild(s2);
  }, [id]);

  return null;
}
