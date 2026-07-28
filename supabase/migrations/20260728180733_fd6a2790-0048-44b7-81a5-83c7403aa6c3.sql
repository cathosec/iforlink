
DROP FUNCTION IF EXISTS public.analytics_ingest_recording_chunk(jsonb);
DROP FUNCTION IF EXISTS public.analytics_list_recordings(text, timestamptz, integer);
DROP FUNCTION IF EXISTS public.analytics_get_recording(uuid);
DROP TABLE IF EXISTS public.analytics_recordings CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_delete_my_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  del_sessions int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  WITH d AS (
    DELETE FROM public.analytics_sessions WHERE user_id = uid RETURNING 1
  ) SELECT COUNT(*) INTO del_sessions FROM d;

  RETURN jsonb_build_object('deleted_sessions', del_sessions);
END;
$function$;

CREATE OR REPLACE FUNCTION public.analytics_export_my_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'user_id', uid,
    'sessions', COALESCE((
      SELECT jsonb_agg(to_jsonb(s.*))
      FROM public.analytics_sessions s WHERE s.user_id = uid
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
      SELECT jsonb_agg(to_jsonb(ce.*))
      FROM public.analytics_custom_events ce
      JOIN public.analytics_sessions s ON s.id = ce.session_id
      WHERE s.user_id = uid
    ), '[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ops_summary(_hours integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  since timestamptz;
  webhooks jsonb;
  events jsonb;
  pending_subs int;
  pending_contribs int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  since := now() - make_interval(hours => GREATEST(_hours, 1));

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'processed', COUNT(*) FILTER (WHERE status = 'processed'),
    'received', COUNT(*) FILTER (WHERE status = 'received'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'by_type', COALESCE((
      SELECT jsonb_object_agg(event_type, c)
      FROM (
        SELECT event_type, COUNT(*)::int AS c
        FROM public.webhook_events
        WHERE received_at >= since
        GROUP BY event_type
        ORDER BY c DESC
        LIMIT 10
      ) s
    ), '{}'::jsonb)
  )
  INTO webhooks
  FROM public.webhook_events
  WHERE received_at >= since;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'errors', COUNT(*) FILTER (WHERE level = 'error'),
    'warns', COUNT(*) FILTER (WHERE level = 'warn'),
    'by_type', COALESCE((
      SELECT jsonb_object_agg(type, c)
      FROM (
        SELECT type, COUNT(*)::int AS c
        FROM public.event_log
        WHERE created_at >= since
        GROUP BY type
        ORDER BY c DESC
        LIMIT 10
      ) s
    ), '{}'::jsonb)
  )
  INTO events
  FROM public.event_log
  WHERE created_at >= since;

  SELECT COUNT(*) INTO pending_subs
  FROM public.pix_payments
  WHERE status IN ('pending','in_process')
    AND paid_at IS NULL
    AND created_at < now() - interval '5 minutes';

  SELECT COUNT(*) INTO pending_contribs
  FROM public.pix_contributions
  WHERE status IN ('pending','in_process')
    AND created_at < now() - interval '5 minutes';

  RETURN jsonb_build_object(
    'since', since,
    'webhooks', webhooks,
    'events', events,
    'pending_subscriptions', pending_subs,
    'pending_contributions', pending_contribs
  );
END;
$function$;
