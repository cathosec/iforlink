GRANT INSERT, UPDATE ON public.pix_payments TO authenticated;

DROP POLICY IF EXISTS "Users create own pending pix payments" ON public.pix_payments;
CREATE POLICY "Users create own pending pix payments"
ON public.pix_payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'pro'
  AND status = 'pending'
  AND paid_at IS NULL
  AND subscription_id IS NULL
  AND amount_cents > 0
  AND interval IN ('month', 'quarter', 'year')
);

DROP POLICY IF EXISTS "Users update own non-approved pix payments" ON public.pix_payments;
CREATE POLICY "Users update own non-approved pix payments"
ON public.pix_payments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND paid_at IS NULL
  AND status <> 'approved'
)
WITH CHECK (
  auth.uid() = user_id
  AND paid_at IS NULL
  AND status IN ('pending', 'in_process', 'rejected', 'cancelled', 'expired')
  AND plan = 'pro'
  AND amount_cents > 0
  AND interval IN ('month', 'quarter', 'year')
);