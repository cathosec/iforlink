
CREATE OR REPLACE FUNCTION public.get_public_setting(_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT value FROM public.platform_settings
  WHERE key = _key AND _key IN ('ads','announcement','analytics')
  LIMIT 1;
$function$;

INSERT INTO public.platform_settings (key, value, description)
VALUES ('analytics', '{"ga_measurement_id":""}'::jsonb, 'Google Analytics')
ON CONFLICT (key) DO NOTHING;
