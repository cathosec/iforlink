
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  url text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  clicks_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX short_links_user_id_idx ON public.short_links(user_id);

GRANT SELECT ON public.short_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Público pode ler (necessário para resolver o código no redirect)
CREATE POLICY "Public can resolve short links"
  ON public.short_links FOR SELECT
  USING (true);

-- Dono gerencia os próprios
CREATE POLICY "Users manage own short links"
  ON public.short_links FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin gerencia tudo
CREATE POLICY "Admins manage all short links"
  ON public.short_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RPC público para contar cliques
CREATE OR REPLACE FUNCTION public.increment_short_click(_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.short_links SET clicks_count = clicks_count + 1 WHERE code = _code;
$$;

GRANT EXECUTE ON FUNCTION public.increment_short_click(text) TO anon, authenticated;
