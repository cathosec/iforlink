import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePlatformSetting<T = Record<string, unknown>>(key: string) {
  return useQuery({
    queryKey: ["platform_setting", key],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return (data?.value ?? null) as T | null;
    },
  });
}
