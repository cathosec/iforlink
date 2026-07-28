
-- ============================================================
-- ETAPA 2: Views públicas com colunas seguras
-- ============================================================

CREATE OR REPLACE VIEW public.v_campaign_public
WITH (security_invoker = on) AS
SELECT
  c.id,
  c.slug,
  c.title,
  c.description,
  c.cover_url,
  c.accent_color,
  c.min_cents,
  c.suggested_amounts,
  c.accepts_card,
  c.pass_fee_to_supporter,
  c.show_supporters,
  c.show_progress,
  c.allow_message,
  c.ends_at,
  -- goal/raised/supporters só são úteis quando o criador optou por mostrar progresso
  CASE WHEN c.show_progress THEN c.goal_cents ELSE NULL END AS goal_cents,
  CASE WHEN c.show_progress THEN c.raised_cents ELSE NULL END AS raised_cents,
  CASE WHEN c.show_progress THEN c.supporters_count ELSE NULL END AS supporters_count,
  c.is_active,
  c.created_at,
  c.updated_at
FROM public.pix_campaigns c
WHERE c.is_active = true;

GRANT SELECT ON public.v_campaign_public TO anon, authenticated;


CREATE OR REPLACE VIEW public.v_profile_public
WITH (security_invoker = on) AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.is_verified,
  p.views_count,
  p.created_at
FROM public.profiles p;

GRANT SELECT ON public.v_profile_public TO anon, authenticated;


CREATE OR REPLACE VIEW public.v_link_public
WITH (security_invoker = on) AS
SELECT
  l.id,
  l.category_id,
  l.title,
  l.description,
  l.url,
  l.favicon_url,
  l.clicks_count,
  l.display_order,
  cat.name    AS category_name,
  cat.icon    AS category_icon,
  cat.display_order AS category_order,
  cat.user_id AS profile_id
FROM public.links l
JOIN public.user_categories cat ON cat.id = l.category_id
WHERE l.is_visible = true
  AND cat.is_visible = true
  AND cat.is_public  = true;

GRANT SELECT ON public.v_link_public TO anon, authenticated;


-- ============================================================
-- ETAPA 3: event_log + RPC log_event
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_log (
  id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type         text NOT NULL,
  level        text NOT NULL DEFAULT 'info' CHECK (level IN ('debug','info','warn','error')),
  actor_id     uuid,
  target_type  text,
  target_id    text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_log_type_created_idx
  ON public.event_log (type, created_at DESC);
CREATE INDEX IF NOT EXISTS event_log_created_idx
  ON public.event_log (created_at DESC);
CREATE INDEX IF NOT EXISTS event_log_target_idx
  ON public.event_log (target_type, target_id);

GRANT SELECT ON public.event_log TO authenticated;
GRANT ALL   ON public.event_log TO service_role;

ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read events" ON public.event_log;
CREATE POLICY "Admins read events"
  ON public.event_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Nenhuma policy de INSERT/UPDATE/DELETE — escrita apenas via RPC/service_role.

CREATE OR REPLACE FUNCTION public.log_event(
  _type text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _level text DEFAULT 'info',
  _target_type text DEFAULT NULL,
  _target_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF _type IS NULL OR btrim(_type) = '' THEN
    RAISE EXCEPTION 'event type is required';
  END IF;
  IF length(_type) > 80 THEN
    RAISE EXCEPTION 'event type too long';
  END IF;
  IF _level NOT IN ('debug','info','warn','error') THEN
    _level := 'info';
  END IF;

  INSERT INTO public.event_log (type, level, actor_id, target_type, target_id, payload)
  VALUES (
    _type,
    _level,
    auth.uid(),
    NULLIF(btrim(coalesce(_target_type,'')),''),
    NULLIF(btrim(coalesce(_target_id,'')),''),
    coalesce(_payload, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_event(text, jsonb, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_event(text, jsonb, text, text, text) TO authenticated, service_role;
