
CREATE TABLE public.analytics_recordings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  visitor_id uuid,
  page_id uuid,
  path text NOT NULL,
  chunk_index integer NOT NULL,
  events jsonb NOT NULL,
  events_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_ms integer NOT NULL DEFAULT 0,
  viewport_w integer,
  viewport_h integer,
  bytes integer NOT NULL DEFAULT 0,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.analytics_recordings TO authenticated;
GRANT ALL ON public.analytics_recordings TO service_role;

ALTER TABLE public.analytics_recordings ENABLE ROW LEVEL SECURITY;

-- Somente leitura via RPCs SECURITY DEFINER. Bloqueia todos os writes diretos.
CREATE POLICY "recordings_no_direct_access"
  ON public.analytics_recordings FOR ALL
  TO authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX idx_analytics_recordings_session ON public.analytics_recordings (session_id, chunk_index);
CREATE INDEX idx_analytics_recordings_owner ON public.analytics_recordings (owner_user_id, started_at DESC);
CREATE INDEX idx_analytics_recordings_page ON public.analytics_recordings (page_id, started_at DESC);
CREATE INDEX idx_analytics_recordings_path ON public.analytics_recordings (path, started_at DESC);

-- Ingestão de um chunk. Chamada pelo endpoint público (service role).
CREATE OR REPLACE FUNCTION public.analytics_ingest_recording_chunk(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ssn_id uuid;
  vsr_id uuid;
  pth text;
  ttl text;
  page_uuid uuid;
  chunk_idx int;
  evs jsonb;
  ev_count int;
  started timestamptz;
  ended timestamptz;
  dur int;
  vw int;
  vh int;
  bts int;
  owner uuid;
  new_id uuid;
BEGIN
  ssn_id := NULLIF(_payload->>'session_id','')::uuid;
  vsr_id := NULLIF(_payload->>'visitor_id','')::uuid;
  pth := coalesce(_payload->>'path','');
  ttl := NULLIF(_payload->>'title','');
  chunk_idx := coalesce((_payload->>'chunk_index')::int, 0);
  evs := coalesce(_payload->'events', '[]'::jsonb);
  ev_count := coalesce(jsonb_array_length(evs), 0);
  started := coalesce((_payload->>'started_at')::timestamptz, now());
  ended := coalesce((_payload->>'ended_at')::timestamptz, now());
  dur := GREATEST(0, coalesce((_payload->>'duration_ms')::int, 0));
  vw := NULLIF(_payload->>'viewport_w','')::int;
  vh := NULLIF(_payload->>'viewport_h','')::int;
  bts := coalesce((_payload->>'bytes')::int, 0);

  IF ssn_id IS NULL OR pth = '' OR ev_count = 0 THEN
    RAISE EXCEPTION 'invalid recording payload';
  END IF;

  -- Upsert da página para descobrir dono e page_id
  page_uuid := public.analytics_upsert_page(pth, ttl);
  SELECT owner_user_id INTO owner FROM public.analytics_pages WHERE id = page_uuid;

  INSERT INTO public.analytics_recordings (
    session_id, visitor_id, page_id, path, chunk_index, events, events_count,
    started_at, ended_at, duration_ms, viewport_w, viewport_h, bytes, owner_user_id
  ) VALUES (
    ssn_id, vsr_id, page_uuid, pth, chunk_idx, evs, ev_count,
    started, ended, dur, vw, vh, bts, owner
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Lista as sessões gravadas visíveis para o usuário atual.
CREATE OR REPLACE FUNCTION public.analytics_list_recordings(
  _path text DEFAULT NULL,
  _since timestamptz DEFAULT now() - interval '7 days',
  _limit int DEFAULT 50
)
RETURNS TABLE(
  session_id uuid,
  path text,
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms bigint,
  events_count bigint,
  chunks bigint,
  viewport_w int,
  viewport_h int
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  is_pro boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  is_admin := public.has_role(uid, 'admin'::app_role);
  is_pro   := public.has_role(uid, 'pro'::app_role);
  IF NOT is_admin AND NOT is_pro THEN
    RAISE EXCEPTION 'forbidden: pro plan required';
  END IF;

  RETURN QUERY
  SELECT
    r.session_id,
    r.path,
    MAX(p.title) AS title,
    MIN(r.started_at) AS started_at,
    MAX(r.ended_at) AS ended_at,
    SUM(r.duration_ms)::bigint AS duration_ms,
    SUM(r.events_count)::bigint AS events_count,
    COUNT(*)::bigint AS chunks,
    MAX(r.viewport_w) AS viewport_w,
    MAX(r.viewport_h) AS viewport_h
  FROM public.analytics_recordings r
  LEFT JOIN public.analytics_pages p ON p.id = r.page_id
  WHERE r.started_at >= _since
    AND (_path IS NULL OR r.path = _path)
    AND (is_admin OR r.owner_user_id = uid)
  GROUP BY r.session_id, r.path
  ORDER BY started_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
END;
$$;

-- Retorna todos os chunks (em ordem) de uma sessão gravada.
CREATE OR REPLACE FUNCTION public.analytics_get_recording(_session_id uuid)
RETURNS TABLE(
  chunk_index int,
  events jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  path text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  is_pro boolean;
  owner uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  is_admin := public.has_role(uid, 'admin'::app_role);
  is_pro   := public.has_role(uid, 'pro'::app_role);
  IF NOT is_admin AND NOT is_pro THEN
    RAISE EXCEPTION 'forbidden: pro plan required';
  END IF;

  SELECT MAX(r.owner_user_id) INTO owner
  FROM public.analytics_recordings r
  WHERE r.session_id = _session_id;

  IF NOT is_admin AND (owner IS NULL OR owner <> uid) THEN
    RAISE EXCEPTION 'forbidden: not recording owner';
  END IF;

  RETURN QUERY
  SELECT r.chunk_index, r.events, r.started_at, r.ended_at, r.path
  FROM public.analytics_recordings r
  WHERE r.session_id = _session_id
  ORDER BY r.chunk_index ASC, r.started_at ASC;
END;
$$;
