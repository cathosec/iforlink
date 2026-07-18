import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePlatformSetting<T = Record<string, unknown>>(key: string) {
  return useQuery({
    queryKey: ["platform_setting", key],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Uses a SECURITY DEFINER RPC that only exposes whitelisted public keys
      // ('ads', 'announcement'). Sensitive keys (pricing, mercadopago, limits,
      // features, security) remain admin-only via RLS.
      const { data } = await supabase.rpc("get_public_setting", { _key: key });
      return (data ?? null) as T | null;
    },
  });
}

// Backwards-compat alias used by ad-slot import
export { usePlatformSetting as n };
