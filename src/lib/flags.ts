import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlags = {
  signup_enabled: boolean;
  discovery_enabled: boolean;
  maintenance_mode: boolean;
  campaigns_enabled: boolean;
  campaigns_card_enabled: boolean;
  shortener_enabled: boolean;
  ads_enabled: boolean;
  pro_upgrade_enabled: boolean;
};

const DEFAULTS: FeatureFlags = {
  signup_enabled: true,
  discovery_enabled: true,
  maintenance_mode: false,
  campaigns_enabled: true,
  campaigns_card_enabled: true,
  shortener_enabled: true,
  ads_enabled: true,
  pro_upgrade_enabled: true,
};

export function useFeatureFlags() {
  const q = useQuery({
    queryKey: ["platform_setting", "features"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_setting", { _key: "features" });
      return (data ?? {}) as Partial<FeatureFlags>;
    },
  });
  return { ...DEFAULTS, ...(q.data ?? {}) } as FeatureFlags;
}

export function useFlag(key: keyof FeatureFlags): boolean {
  return useFeatureFlags()[key];
}
