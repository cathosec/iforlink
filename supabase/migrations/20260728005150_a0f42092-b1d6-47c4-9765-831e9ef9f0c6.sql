CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  code_verifier text NOT NULL,
  redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.oauth_states TO authenticated;
GRANT ALL ON public.oauth_states TO service_role;

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own oauth states"
ON public.oauth_states
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX oauth_states_expires_at_idx ON public.oauth_states (expires_at);
CREATE INDEX oauth_states_provider_user_idx ON public.oauth_states (provider, user_id);