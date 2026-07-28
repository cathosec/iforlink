-- ============================================================
-- Módulo Analytics — Fase 1
-- ============================================================

-- 1) analytics_visitors
CREATE TABLE public.analytics_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now(),
  ua_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_visitors TO authenticated;
GRANT ALL ON public.analytics_visitors TO service_role;
ALTER TABLE public.analytics_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read visitors" ON public.analytics_visitors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX analytics_visitors_last_seen_idx ON public.analytics_visitors(last_seen DESC);

-- 2) analytics_pages
CREATE TABLE public.analytics_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  title text,
  owner_user_id uuid,          -- resolvido do path (ex.: username → profiles.id)
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_pages TO authenticated;
GRANT ALL ON public.analytics_pages TO service_role;
ALTER TABLE public.analytics_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read pages" ON public.analytics_pages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX analytics_pages_owner_idx ON public.analytics_pages(owner_user_id);

-- 3) analytics_sessions
CREATE TABLE public.analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES public.analytics_visitors(id) ON DELETE CASCADE,
  user_id uuid,                -- auth.users.id se autenticado (sem FK)
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  last_seen timestamptz NOT NULL DEFAULT now(),
  device_type text,            -- 'mobile' | 'tablet' | 'desktop'
  os_family text,
  browser_family text,
  lang text,
  screen_w int,
  screen_h int,
  viewport_w int,
  viewport_h int,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  ip_prefix text,              -- /24 truncado, nunca IP completo
  country text,
  city text
);
GRANT SELECT ON public.analytics_sessions TO authenticated;
GRANT ALL ON public.analytics_sessions TO service_role;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read sessions" ON public.analytics_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX analytics_sessions_visitor_idx ON public.analytics_sessions(visitor_id);
CREATE INDEX analytics_sessions_started_idx ON public.analytics_sessions(started_at DESC);
CREATE INDEX analytics_sessions_last_seen_idx ON public.analytics_sessions(last_seen DESC);

-- 4) analytics_pageviews
CREATE TABLE public.analytics_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.analytics_pages(id) ON DELETE SET NULL,
  url text NOT NULL,
  path text NOT NULL,
  title text,
  ts timestamptz NOT NULL DEFAULT now(),
  duration_ms int NOT NULL DEFAULT 0,
  is_exit boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.analytics_pageviews TO authenticated;
GRANT ALL ON public.analytics_pageviews TO service_role;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read pageviews" ON public.analytics_pageviews
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX analytics_pageviews_session_idx ON public.analytics_pageviews(session_id);
CREATE INDEX analytics_pageviews_page_ts_idx ON public.analytics_pageviews(page_id, ts DESC);
CREATE INDEX analytics_pageviews_ts_idx ON public.analytics_pageviews(ts DESC);

-- 5) analytics_events (auto: click/scroll/idle/tab/error)
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.analytics_pages(id) ON DELETE SET NULL,
  type text NOT NULL,          -- click|scroll|idle|tab_hidden|tab_visible|error|mousemove
  ts timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_event_id text NOT NULL
);
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read events" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX analytics_events_client_uid_idx
  ON public.analytics_events(session_id, client_event_id);
CREATE INDEX analytics_events_session_ts_idx ON public.analytics_events(session_id, ts DESC);
CREATE INDEX analytics_events_type_ts_idx ON public.analytics_events(type, ts DESC);
CREATE INDEX analytics_events_page_ts_idx ON public.analytics_events(page_id, ts DESC);

-- 6) analytics_custom_events (analytics.track)
CREATE TABLE public.analytics_custom_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.analytics_pages(id) ON DELETE SET NULL,
  name text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_event_id text NOT NULL
);
GRANT SELECT ON public.analytics_custom_events TO authenticated;
GRANT ALL ON public.analytics_custom_events TO service_role;
ALTER TABLE public.analytics_custom_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read custom" ON public.analytics_custom_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX analytics_custom_client_uid_idx
  ON public.analytics_custom_events(session_id, client_event_id);
CREATE INDEX analytics_custom_name_ts_idx ON public.analytics_custom_events(name, ts DESC);
CREATE INDEX analytics_custom_session_idx ON public.analytics_custom_events(session_id);

-- ============================================================
-- RPCs de ingest (SECURITY DEFINER, chamadas apenas pelo servidor)
-- ============================================================

-- Upsert de página; resolve owner por username quando path começa por /:username
CREATE OR REPLACE FUNCTION public.analytics_upsert_page(_path text, _title text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  page_id uuid;
  owner uuid;
  first_seg text;
BEGIN
  IF _path IS NULL OR btrim(_path) = '' THEN
    RETURN NULL;
  END IF;

  -- primeiro segmento (ex.: /guthierres/foo → 'guthierres')
  first_seg := split_part(regexp_replace(_path, '^/+', ''), '/', 1);
  IF first_seg <> '' AND first_seg NOT IN (
    'auth','dashboard','admin','api','pix','precos','termos','privacidade',
    'faq','contato','sobre','discover','sitemap.xml','robots.txt','404','r'
  ) THEN
    SELECT id INTO owner FROM public.profiles WHERE username = first_seg LIMIT 1;
  END IF;

  INSERT INTO public.analytics_pages (path, title, owner_user_id)
  VALUES (_path, NULLIF(btrim(coalesce(_title,'')),''), owner)
  ON CONFLICT (path) DO UPDATE
    SET title = COALESCE(EXCLUDED.title, public.analytics_pages.title),
        last_seen = now(),
        owner_user_id = COALESCE(public.analytics_pages.owner_user_id, EXCLUDED.owner_user_id)
  RETURNING id INTO page_id;

  RETURN page_id;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_upsert_page(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_upsert_page(text, text) TO service_role;

-- Ingest completo de um lote (sessão + eventos)
CREATE OR REPLACE FUNCTION public.analytics_ingest_batch(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vsr jsonb := coalesce(_payload->'visitor', '{}'::jsonb);
  ssn jsonb := coalesce(_payload->'session', '{}'::jsonb);
  evs jsonb := coalesce(_payload->'events', '[]'::jsonb);
  vid uuid;
  sid uuid;
  ev jsonb;
  page_id uuid;
  ins_events int := 0;
  ins_pageviews int := 0;
  ins_custom int := 0;
BEGIN
  -- visitor: aceita id vindo do cliente (uuid), cria se inexistente
  vid := NULLIF(vsr->>'id','')::uuid;
  IF vid IS NULL THEN
    INSERT INTO public.analytics_visitors (ua_hash)
    VALUES (NULLIF(vsr->>'ua_hash',''))
    RETURNING id INTO vid;
  ELSE
    INSERT INTO public.analytics_visitors (id, ua_hash)
    VALUES (vid, NULLIF(vsr->>'ua_hash',''))
    ON CONFLICT (id) DO UPDATE SET last_seen = now();
  END IF;

  -- session: idem
  sid := NULLIF(ssn->>'id','')::uuid;
  IF sid IS NULL THEN
    INSERT INTO public.analytics_sessions (
      visitor_id, user_id, device_type, os_family, browser_family, lang,
      screen_w, screen_h, viewport_w, viewport_h, referrer,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      ip_prefix, country, city
    ) VALUES (
      vid,
      NULLIF(ssn->>'user_id','')::uuid,
      NULLIF(ssn->>'device_type',''),
      NULLIF(ssn->>'os_family',''),
      NULLIF(ssn->>'browser_family',''),
      NULLIF(ssn->>'lang',''),
      NULLIF(ssn->>'screen_w','')::int,
      NULLIF(ssn->>'screen_h','')::int,
      NULLIF(ssn->>'viewport_w','')::int,
      NULLIF(ssn->>'viewport_h','')::int,
      NULLIF(ssn->>'referrer',''),
      NULLIF(ssn->>'utm_source',''),
      NULLIF(ssn->>'utm_medium',''),
      NULLIF(ssn->>'utm_campaign',''),
      NULLIF(ssn->>'utm_term',''),
      NULLIF(ssn->>'utm_content',''),
      NULLIF(ssn->>'ip_prefix',''),
      NULLIF(ssn->>'country',''),
      NULLIF(ssn->>'city','')
    )
    RETURNING id INTO sid;
  ELSE
    INSERT INTO public.analytics_sessions (
      id, visitor_id, user_id, device_type, os_family, browser_family, lang,
      screen_w, screen_h, viewport_w, viewport_h, referrer,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      ip_prefix, country, city
    ) VALUES (
      sid, vid,
      NULLIF(ssn->>'user_id','')::uuid,
      NULLIF(ssn->>'device_type',''),
      NULLIF(ssn->>'os_family',''),
      NULLIF(ssn->>'browser_family',''),
      NULLIF(ssn->>'lang',''),
      NULLIF(ssn->>'screen_w','')::int,
      NULLIF(ssn->>'screen_h','')::int,
      NULLIF(ssn->>'viewport_w','')::int,
      NULLIF(ssn->>'viewport_h','')::int,
      NULLIF(ssn->>'referrer',''),
      NULLIF(ssn->>'utm_source',''),
      NULLIF(ssn->>'utm_medium',''),
      NULLIF(ssn->>'utm_campaign',''),
      NULLIF(ssn->>'utm_term',''),
      NULLIF(ssn->>'utm_content',''),
      NULLIF(ssn->>'ip_prefix',''),
      NULLIF(ssn->>'country',''),
      NULLIF(ssn->>'city','')
    )
    ON CONFLICT (id) DO UPDATE SET last_seen = now();
  END IF;

  -- processa cada evento
  FOR ev IN SELECT * FROM jsonb_array_elements(evs) LOOP
    page_id := NULL;
    IF (ev ? 'path') AND coalesce(ev->>'path','') <> '' THEN
      page_id := public.analytics_upsert_page(ev->>'path', ev->>'title');
    END IF;

    CASE ev->>'kind'
    WHEN 'pageview' THEN
      INSERT INTO public.analytics_pageviews (
        session_id, page_id, url, path, title, ts, duration_ms, is_exit
      ) VALUES (
        sid, page_id,
        coalesce(ev->>'url',''),
        coalesce(ev->>'path',''),
        NULLIF(ev->>'title',''),
        coalesce((ev->>'ts')::timestamptz, now()),
        coalesce((ev->>'duration_ms')::int, 0),
        coalesce((ev->>'is_exit')::boolean, false)
      );
      ins_pageviews := ins_pageviews + 1;

    WHEN 'custom' THEN
      INSERT INTO public.analytics_custom_events (
        session_id, page_id, name, ts, props, client_event_id
      ) VALUES (
        sid, page_id,
        coalesce(ev->>'name','unknown'),
        coalesce((ev->>'ts')::timestamptz, now()),
        coalesce(ev->'props','{}'::jsonb),
        coalesce(ev->>'client_event_id', gen_random_uuid()::text)
      )
      ON CONFLICT (session_id, client_event_id) DO NOTHING;
      ins_custom := ins_custom + 1;

    ELSE
      INSERT INTO public.analytics_events (
        session_id, page_id, type, ts, payload, client_event_id
      ) VALUES (
        sid, page_id,
        coalesce(ev->>'kind','event'),
        coalesce((ev->>'ts')::timestamptz, now()),
        coalesce(ev->'payload','{}'::jsonb),
        coalesce(ev->>'client_event_id', gen_random_uuid()::text)
      )
      ON CONFLICT (session_id, client_event_id) DO NOTHING;
      ins_events := ins_events + 1;
    END CASE;
  END LOOP;

  -- atualiza last_seen agregados
  UPDATE public.analytics_visitors SET last_seen = now() WHERE id = vid;
  UPDATE public.analytics_sessions SET last_seen = now() WHERE id = sid;

  RETURN jsonb_build_object(
    'visitor_id', vid,
    'session_id', sid,
    'events', ins_events,
    'pageviews', ins_pageviews,
    'custom', ins_custom
  );
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_ingest_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_ingest_batch(jsonb) TO service_role;

-- Sumário para o card do admin
CREATE OR REPLACE FUNCTION public.analytics_admin_summary(_hours int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(hours => greatest(1, coalesce(_hours,24)));
  visitors int;
  sessions int;
  pageviews int;
  events int;
  top_pages jsonb;
  online int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(DISTINCT visitor_id) INTO visitors FROM public.analytics_sessions
    WHERE started_at >= since;
  SELECT count(*) INTO sessions FROM public.analytics_sessions WHERE started_at >= since;
  SELECT count(*) INTO pageviews FROM public.analytics_pageviews WHERE ts >= since;
  SELECT count(*) INTO events FROM public.analytics_events WHERE ts >= since;
  SELECT count(DISTINCT id) INTO online FROM public.analytics_sessions
    WHERE last_seen >= now() - interval '30 seconds';

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO top_pages
  FROM (
    SELECT p.path, p.title, count(*)::int AS views
    FROM public.analytics_pageviews pv
    LEFT JOIN public.analytics_pages p ON p.id = pv.page_id
    WHERE pv.ts >= since AND p.path IS NOT NULL
    GROUP BY p.path, p.title
    ORDER BY views DESC
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'since', since,
    'visitors', visitors,
    'sessions', sessions,
    'pageviews', pageviews,
    'events', events,
    'online', online,
    'top_pages', top_pages
  );
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_admin_summary(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_admin_summary(int) TO authenticated;