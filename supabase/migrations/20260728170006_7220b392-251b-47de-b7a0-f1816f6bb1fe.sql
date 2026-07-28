
-- Índice para acelerar leituras de heatmap (páginas + eventos de coordenada)
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_type_ts
  ON public.analytics_events (page_id, type, ts DESC);

-- ─────────────────────────────────────────────────────────────────
-- RPC: heatmap por página
-- Regras:
--  * admin  → acesso a qualquer path
--  * pro    → acesso apenas às páginas em que é owner
--  * free   → bloqueado
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_heatmap(
  _path text,
  _since timestamptz DEFAULT (now() - interval '7 days'),
  _until timestamptz DEFAULT now(),
  _limit int DEFAULT 5000
)
RETURNS TABLE (
  kind text,
  x int,
  y int,
  vw int,
  vh int,
  ts timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  is_pro boolean;
  page_owner uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  is_admin := public.has_role(uid, 'admin'::app_role);
  is_pro   := public.has_role(uid, 'pro'::app_role);

  IF NOT is_admin AND NOT is_pro THEN
    RAISE EXCEPTION 'forbidden: pro plan required';
  END IF;

  SELECT owner_user_id INTO page_owner
  FROM public.analytics_pages
  WHERE path = _path
  LIMIT 1;

  IF NOT is_admin AND (page_owner IS NULL OR page_owner <> uid) THEN
    RAISE EXCEPTION 'forbidden: not page owner';
  END IF;

  RETURN QUERY
  SELECT
    e.type::text                                                AS kind,
    COALESCE(NULLIF(e.payload->>'x','')::int, 0)                AS x,
    COALESCE(NULLIF(e.payload->>'y','')::int, 0)                AS y,
    COALESCE(NULLIF(e.payload->>'vw','')::int, 0)               AS vw,
    COALESCE(NULLIF(e.payload->>'vh','')::int, 0)               AS vh,
    e.ts
  FROM public.analytics_events e
  JOIN public.analytics_pages  p ON p.id = e.page_id
  WHERE p.path = _path
    AND e.type IN ('click','mousemove')
    AND e.ts >= _since
    AND e.ts <= _until
    AND e.payload ? 'x'
    AND e.payload ? 'y'
  ORDER BY e.ts DESC
  LIMIT GREATEST(1, LEAST(_limit, 20000));
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_heatmap(text, timestamptz, timestamptz, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_heatmap(text, timestamptz, timestamptz, int) TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- RPC: páginas visíveis para o usuário (usada no seletor do dashboard)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_my_pages(_limit int DEFAULT 100)
RETURNS TABLE (
  path text,
  title text,
  owner_user_id uuid,
  views_count bigint,
  last_seen timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  is_pro boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  is_admin := public.has_role(uid, 'admin'::app_role);
  is_pro   := public.has_role(uid, 'pro'::app_role);

  IF NOT is_admin AND NOT is_pro THEN
    RAISE EXCEPTION 'forbidden: pro plan required';
  END IF;

  RETURN QUERY
  SELECT
    p.path,
    p.title,
    p.owner_user_id,
    (SELECT COUNT(*) FROM public.analytics_pageviews pv WHERE pv.page_id = p.id)::bigint,
    p.last_seen
  FROM public.analytics_pages p
  WHERE is_admin OR p.owner_user_id = uid
  ORDER BY p.last_seen DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(_limit, 500));
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_my_pages(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_my_pages(int) TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- RPC: resumo agregado por página (visitas, cliques, scroll médio…)
-- Mesmo controle de acesso que analytics_heatmap.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_page_summary(
  _path text,
  _since timestamptz DEFAULT (now() - interval '7 days'),
  _until timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  is_pro boolean;
  page_owner uuid;
  page_id_v uuid;
  views_total bigint;
  visitors_total bigint;
  clicks_total bigint;
  moves_total bigint;
  avg_duration numeric;
  scroll_dist jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  is_admin := public.has_role(uid, 'admin'::app_role);
  is_pro   := public.has_role(uid, 'pro'::app_role);
  IF NOT is_admin AND NOT is_pro THEN RAISE EXCEPTION 'forbidden: pro plan required'; END IF;

  SELECT id, owner_user_id INTO page_id_v, page_owner
  FROM public.analytics_pages WHERE path = _path LIMIT 1;

  IF NOT is_admin AND (page_owner IS NULL OR page_owner <> uid) THEN
    RAISE EXCEPTION 'forbidden: not page owner';
  END IF;

  IF page_id_v IS NULL THEN
    RETURN jsonb_build_object('views',0,'visitors',0,'clicks',0,'moves',0,'avg_duration_ms',0,'scroll',jsonb_build_object());
  END IF;

  SELECT COUNT(*), AVG(NULLIF(duration_ms,0))
    INTO views_total, avg_duration
  FROM public.analytics_pageviews
  WHERE page_id = page_id_v AND ts >= _since AND ts <= _until;

  SELECT COUNT(DISTINCT s.visitor_id)
    INTO visitors_total
  FROM public.analytics_pageviews pv
  JOIN public.analytics_sessions  s ON s.id = pv.session_id
  WHERE pv.page_id = page_id_v AND pv.ts >= _since AND pv.ts <= _until;

  SELECT COUNT(*) FILTER (WHERE type = 'click'),
         COUNT(*) FILTER (WHERE type = 'mousemove')
    INTO clicks_total, moves_total
  FROM public.analytics_events
  WHERE page_id = page_id_v AND ts >= _since AND ts <= _until;

  SELECT jsonb_object_agg(depth::text, cnt) INTO scroll_dist FROM (
    SELECT (payload->>'depth')::int AS depth, COUNT(*)::int AS cnt
    FROM public.analytics_events
    WHERE page_id = page_id_v AND type='scroll'
      AND ts >= _since AND ts <= _until
      AND payload ? 'depth'
    GROUP BY (payload->>'depth')::int
  ) s;

  RETURN jsonb_build_object(
    'views', COALESCE(views_total,0),
    'visitors', COALESCE(visitors_total,0),
    'clicks', COALESCE(clicks_total,0),
    'moves', COALESCE(moves_total,0),
    'avg_duration_ms', COALESCE(ROUND(avg_duration)::int, 0),
    'scroll', COALESCE(scroll_dist, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_page_summary(text, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_page_summary(text, timestamptz, timestamptz) TO authenticated;
