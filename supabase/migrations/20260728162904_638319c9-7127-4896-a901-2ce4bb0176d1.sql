CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket text NOT NULL,
  subject text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, subject)
);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Ninguém tem acesso direto; tudo passa pela função abaixo.
CREATE POLICY "Admins read rate_limits" ON public.rate_limits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket text,
  _subject text,
  _max integer,
  _window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.rate_limits%ROWTYPE;
  window_dur interval;
BEGIN
  IF _bucket IS NULL OR _subject IS NULL OR _max <= 0 OR _window_seconds <= 0 THEN
    RETURN true;
  END IF;
  window_dur := make_interval(secs => _window_seconds);

  INSERT INTO public.rate_limits (bucket, subject, count, window_start, updated_at)
  VALUES (_bucket, _subject, 1, now(), now())
  ON CONFLICT (bucket, subject) DO UPDATE
    SET count = CASE
          WHEN public.rate_limits.window_start < now() - window_dur THEN 1
          ELSE public.rate_limits.count + 1
        END,
        window_start = CASE
          WHEN public.rate_limits.window_start < now() - window_dur THEN now()
          ELSE public.rate_limits.window_start
        END,
        updated_at = now()
  RETURNING * INTO row;

  RETURN row.count <= _max;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

-- Métricas de webhooks — leitura agregada só para admin.
CREATE OR REPLACE FUNCTION public.admin_ops_summary(_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
        WHERE created_at >= since
        GROUP BY event_type
        ORDER BY c DESC
        LIMIT 10
      ) s
    ), '{}'::jsonb)
  )
  INTO webhooks
  FROM public.webhook_events
  WHERE created_at >= since;

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
$$;

REVOKE ALL ON FUNCTION public.admin_ops_summary(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ops_summary(integer) TO authenticated;