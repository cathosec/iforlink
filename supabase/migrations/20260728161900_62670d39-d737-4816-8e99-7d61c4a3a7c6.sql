
-- 1) webhook_events: dedup + auditoria de webhooks recebidos
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received',
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT webhook_events_provider_event_unique UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx
  ON public.webhook_events (received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_status_idx
  ON public.webhook_events (status)
  WHERE status <> 'processed';

GRANT SELECT, INSERT, UPDATE ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook_events" ON public.webhook_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Listar assinaturas PIX pendentes para reconciliação
CREATE OR REPLACE FUNCTION public.list_pending_pix_payments_for_reconcile(_older_than_seconds int DEFAULT 300, _limit int DEFAULT 50)
RETURNS TABLE(pix_id uuid, mp_payment_id text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, mp_payment_id, created_at
  FROM public.pix_payments
  WHERE status IN ('pending', 'in_process')
    AND paid_at IS NULL
    AND mp_payment_id IS NOT NULL
    AND created_at < now() - (make_interval(secs => _older_than_seconds))
  ORDER BY created_at ASC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.list_pending_pix_payments_for_reconcile(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pending_pix_payments_for_reconcile(int, int) TO service_role;

-- 3) Listar contribuições PIX pendentes para reconciliação
CREATE OR REPLACE FUNCTION public.list_pending_pix_contributions_for_reconcile(_older_than_seconds int DEFAULT 300, _limit int DEFAULT 50)
RETURNS TABLE(contribution_id uuid, mp_payment_id text, access_token text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.mp_payment_id, a.access_token, c.created_at
  FROM public.pix_contributions c
  JOIN public.pix_campaigns camp ON camp.id = c.campaign_id
  JOIN public.mp_accounts a ON a.user_id = camp.user_id
  WHERE c.status IN ('pending', 'in_process')
    AND c.mp_payment_id IS NOT NULL
    AND c.created_at < now() - (make_interval(secs => _older_than_seconds))
  ORDER BY c.created_at ASC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.list_pending_pix_contributions_for_reconcile(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pending_pix_contributions_for_reconcile(int, int) TO service_role;
