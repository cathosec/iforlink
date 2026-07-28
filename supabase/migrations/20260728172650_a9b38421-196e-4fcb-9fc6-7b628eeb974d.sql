
-- Helpers: gate Pro/Admin e escopo por dono
CREATE OR REPLACE FUNCTION public._analytics_require_pro()
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT (public.has_role(uid,'admin'::app_role) OR public.has_role(uid,'pro'::app_role)) THEN
    RAISE EXCEPTION 'forbidden: pro plan required';
  END IF;
END;
$$;

-- Timeseries: pageviews e visitantes únicos por bucket
CREATE OR REPLACE FUNCTION public.analytics_timeseries(
  _path text DEFAULT NULL,
  _since timestamptz DEFAULT now() - interval '7 days',
  _until timestamptz DEFAULT now(),
  _bucket text DEFAULT 'day' -- 'hour' | 'day'
) RETURNS TABLE(ts timestamptz, views bigint, visitors bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  page_owner uuid;
  trunc_unit text;
BEGIN
  PERFORM public._analytics_require_pro();
  is_admin := public.has_role(uid,'admin'::app_role);
  trunc_unit := CASE WHEN _bucket = 'hour' THEN 'hour' ELSE 'day' END;

  IF _path IS NOT NULL THEN
    SELECT owner_user_id INTO page_owner FROM public.analytics_pages WHERE path = _path LIMIT 1;
    IF NOT is_admin AND (page_owner IS NULL OR page_owner <> uid) THEN
      RAISE EXCEPTION 'forbidden: not page owner';
    END IF;
  END IF;

  RETURN QUERY
  SELECT date_trunc(trunc_unit, pv.ts) AS ts,
         COUNT(*)::bigint AS views,
         COUNT(DISTINCT s.visitor_id)::bigint AS visitors
  FROM public.analytics_pageviews pv
  JOIN public.analytics_sessions s ON s.id = pv.session_id
  LEFT JOIN public.analytics_pages p ON p.id = pv.page_id
  WHERE pv.ts >= _since AND pv.ts <= _until
    AND (_path IS NULL OR p.path = _path)
    AND (is_admin OR p.owner_user_id = uid)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

-- Top pages (do usuário; admin vê todas)
CREATE OR REPLACE FUNCTION public.analytics_top_pages(
  _since timestamptz DEFAULT now() - interval '7 days',
  _until timestamptz DEFAULT now(),
  _limit integer DEFAULT 20
) RETURNS TABLE(path text, title text, views bigint, visitors bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); is_admin boolean;
BEGIN
  PERFORM public._analytics_require_pro();
  is_admin := public.has_role(uid,'admin'::app_role);
  RETURN QUERY
  SELECT p.path, MAX(p.title) AS title,
         COUNT(*)::bigint AS views,
         COUNT(DISTINCT s.visitor_id)::bigint AS visitors
  FROM public.analytics_pageviews pv
  JOIN public.analytics_sessions s ON s.id = pv.session_id
  JOIN public.analytics_pages p ON p.id = pv.page_id
  WHERE pv.ts >= _since AND pv.ts <= _until
    AND (is_admin OR p.owner_user_id = uid)
  GROUP BY p.path
  ORDER BY views DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
END;
$$;

-- Divisão por dimensão de sessão (device_type / browser_family / os_family / country / referrer / utm_source / utm_medium / utm_campaign)
CREATE OR REPLACE FUNCTION public.analytics_breakdown(
  _dimension text,
  _path text DEFAULT NULL,
  _since timestamptz DEFAULT now() - interval '7 days',
  _until timestamptz DEFAULT now(),
  _limit integer DEFAULT 15
) RETURNS TABLE(bucket text, views bigint, visitors bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  page_owner uuid;
  col text;
BEGIN
  PERFORM public._analytics_require_pro();
  is_admin := public.has_role(uid,'admin'::app_role);
  IF _dimension NOT IN ('device_type','browser_family','os_family','country','referrer','utm_source','utm_medium','utm_campaign','lang') THEN
    RAISE EXCEPTION 'invalid dimension';
  END IF;
  col := format('s.%I', _dimension);

  IF _path IS NOT NULL THEN
    SELECT owner_user_id INTO page_owner FROM public.analytics_pages WHERE path = _path LIMIT 1;
    IF NOT is_admin AND (page_owner IS NULL OR page_owner <> uid) THEN
      RAISE EXCEPTION 'forbidden: not page owner';
    END IF;
  END IF;

  RETURN QUERY EXECUTE format($q$
    SELECT COALESCE(NULLIF(btrim(%s),''),'(unknown)') AS bucket,
           COUNT(*)::bigint AS views,
           COUNT(DISTINCT s.visitor_id)::bigint AS visitors
    FROM public.analytics_pageviews pv
    JOIN public.analytics_sessions s ON s.id = pv.session_id
    LEFT JOIN public.analytics_pages p ON p.id = pv.page_id
    WHERE pv.ts >= $1 AND pv.ts <= $2
      AND ($3 IS NULL OR p.path = $3)
      AND ($4 OR p.owner_user_id = $5)
    GROUP BY 1
    ORDER BY views DESC
    LIMIT $6
  $q$, col) USING _since, _until, _path, is_admin, uid, GREATEST(1, LEAST(_limit, 100));
END;
$$;

-- Top eventos personalizados
CREATE OR REPLACE FUNCTION public.analytics_top_events(
  _path text DEFAULT NULL,
  _since timestamptz DEFAULT now() - interval '7 days',
  _until timestamptz DEFAULT now(),
  _limit integer DEFAULT 20
) RETURNS TABLE(name text, total bigint, sessions bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  page_owner uuid;
BEGIN
  PERFORM public._analytics_require_pro();
  is_admin := public.has_role(uid,'admin'::app_role);
  IF _path IS NOT NULL THEN
    SELECT owner_user_id INTO page_owner FROM public.analytics_pages WHERE path = _path LIMIT 1;
    IF NOT is_admin AND (page_owner IS NULL OR page_owner <> uid) THEN
      RAISE EXCEPTION 'forbidden: not page owner';
    END IF;
  END IF;

  RETURN QUERY
  SELECT ce.name,
         COUNT(*)::bigint AS total,
         COUNT(DISTINCT ce.session_id)::bigint AS sessions
  FROM public.analytics_custom_events ce
  LEFT JOIN public.analytics_pages p ON p.id = ce.page_id
  WHERE ce.ts >= _since AND ce.ts <= _until
    AND (_path IS NULL OR p.path = _path)
    AND (is_admin OR p.owner_user_id = uid)
  GROUP BY ce.name
  ORDER BY total DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.analytics_timeseries(text, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_pages(timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_breakdown(text, text, timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_events(text, timestamptz, timestamptz, integer) TO authenticated;
