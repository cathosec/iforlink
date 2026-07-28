-- Export: retorna sessões, pageviews, eventos e gravações vinculadas ao usuário logado.
CREATE OR REPLACE FUNCTION public.analytics_export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'user_id', uid,
    'sessions', COALESCE((
      SELECT jsonb_agg(to_jsonb(s.*))
      FROM public.analytics_sessions s
      WHERE s.user_id = uid
    ), '[]'::jsonb),
    'pageviews', COALESCE((
      SELECT jsonb_agg(to_jsonb(pv.*))
      FROM public.analytics_pageviews pv
      JOIN public.analytics_sessions s ON s.id = pv.session_id
      WHERE s.user_id = uid
    ), '[]'::jsonb),
    'events', COALESCE((
      SELECT jsonb_agg(to_jsonb(e.*))
      FROM public.analytics_events e
      JOIN public.analytics_sessions s ON s.id = e.session_id
      WHERE s.user_id = uid
    ), '[]'::jsonb),
    'custom_events', COALESCE((
      SELECT jsonb_agg(to_jsonb(c.*))
      FROM public.analytics_custom_events c
      JOIN public.analytics_sessions s ON s.id = c.session_id
      WHERE s.user_id = uid
    ), '[]'::jsonb),
    'recordings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'session_id', r.session_id,
        'path', r.path,
        'started_at', r.started_at,
        'ended_at', r.ended_at,
        'duration_ms', r.duration_ms,
        'events_count', r.events_count,
        'chunk_index', r.chunk_index
      ))
      FROM public.analytics_recordings r
      WHERE r.owner_user_id = uid OR r.session_id IN (
        SELECT id FROM public.analytics_sessions WHERE user_id = uid
      )
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_export_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_export_my_data() TO authenticated;

-- Delete: apaga todos os dados analíticos vinculados ao usuário logado.
CREATE OR REPLACE FUNCTION public.analytics_delete_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  del_sessions int := 0;
  del_recordings int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Apagamos gravações do usuário
  WITH d AS (
    DELETE FROM public.analytics_recordings
    WHERE owner_user_id = uid
       OR session_id IN (SELECT id FROM public.analytics_sessions WHERE user_id = uid)
    RETURNING 1
  ) SELECT count(*) INTO del_recordings FROM d;

  -- Sessions cascade removem pageviews/events/custom_events (FK ON DELETE CASCADE).
  -- Se não houver cascade, apagamos manualmente antes.
  DELETE FROM public.analytics_pageviews
    WHERE session_id IN (SELECT id FROM public.analytics_sessions WHERE user_id = uid);
  DELETE FROM public.analytics_events
    WHERE session_id IN (SELECT id FROM public.analytics_sessions WHERE user_id = uid);
  DELETE FROM public.analytics_custom_events
    WHERE session_id IN (SELECT id FROM public.analytics_sessions WHERE user_id = uid);

  WITH d AS (
    DELETE FROM public.analytics_sessions WHERE user_id = uid RETURNING 1
  ) SELECT count(*) INTO del_sessions FROM d;

  PERFORM public.log_event(
    'analytics.delete_my_data',
    jsonb_build_object('sessions', del_sessions, 'recordings', del_recordings),
    'info',
    'user',
    uid::text
  );

  RETURN jsonb_build_object(
    'deleted_sessions', del_sessions,
    'deleted_recordings', del_recordings
  );
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_delete_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_delete_my_data() TO authenticated;