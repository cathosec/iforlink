
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('free', 'pro', 'admin');

-- Função updated_at genérica
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$')
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================
-- user_roles
-- =========================
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- get_user_role (retorna maior papel: admin > pro > free)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'pro' THEN 2 ELSE 3 END
  LIMIT 1
$$;

-- =========================
-- user_categories
-- =========================
CREATE TABLE public.user_categories (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_categories_user ON public.user_categories(user_id, display_order);

GRANT SELECT ON public.user_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_categories TO authenticated;
GRANT ALL ON public.user_categories TO service_role;

ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_user_categories_updated_at
BEFORE UPDATE ON public.user_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- links
-- =========================
CREATE TABLE public.links (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.user_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  favicon_url TEXT,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_links_category ON public.links(category_id, display_order);
CREATE INDEX idx_links_user ON public.links(user_id);

GRANT SELECT ON public.links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.links TO authenticated;
GRANT ALL ON public.links TO service_role;

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_links_updated_at
BEFORE UPDATE ON public.links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Policies: profiles
-- =========================
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Policies: user_roles
-- =========================
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Policies: user_categories
-- =========================
CREATE POLICY "Public categories visible to all"
  ON public.user_categories FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Owner reads own categories"
  ON public.user_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner manages own categories"
  ON public.user_categories FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all categories"
  ON public.user_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Policies: links
-- =========================
CREATE POLICY "Public links visible to all"
  ON public.links FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Owner reads own links"
  ON public.links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner manages own links"
  ON public.links FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all links"
  ON public.links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Trigger: novo usuário -> profile + role free
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]+', '-', 'g'));
  base_username := regexp_replace(base_username, '^-+|-+$', '', 'g');
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := 'user-' || substr(NEW.id::text, 1, 6);
  END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || '-' || suffix;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- Incrementar cliques (público)
-- =========================
CREATE OR REPLACE FUNCTION public.increment_link_click(_link_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.links SET clicks_count = clicks_count + 1 WHERE id = _link_id AND is_visible = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_link_click(UUID) TO anon, authenticated;

-- =========================
-- Limites Free (3 categorias / 15 links)
-- =========================
CREATE OR REPLACE FUNCTION public.check_free_category_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role(NEW.user_id) = 'free' THEN
    IF (SELECT COUNT(*) FROM public.user_categories WHERE user_id = NEW.user_id) >= 3 THEN
      RAISE EXCEPTION 'Limite do plano Free atingido (3 categorias). Faça upgrade para Pro.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_free_category_limit
BEFORE INSERT ON public.user_categories
FOR EACH ROW EXECUTE FUNCTION public.check_free_category_limit();

CREATE OR REPLACE FUNCTION public.check_free_link_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role(NEW.user_id) = 'free' THEN
    IF (SELECT COUNT(*) FROM public.links WHERE user_id = NEW.user_id) >= 15 THEN
      RAISE EXCEPTION 'Limite do plano Free atingido (15 links). Faça upgrade para Pro.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_free_link_limit
BEFORE INSERT ON public.links
FOR EACH ROW EXECUTE FUNCTION public.check_free_link_limit();

-- =========================
-- SEED: 3 perfis de demonstração
-- =========================
DO $$
DECLARE
  u1 UUID := '11111111-1111-1111-1111-111111111111';
  u2 UUID := '22222222-2222-2222-2222-222222222222';
  u3 UUID := '33333333-3333-3333-3333-333333333333';
  c_id UUID;
BEGIN
  -- Insere usuários fictícios em auth.users (necessário para FK)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  VALUES
    (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech-curator@forlink.demo', crypt('demo-only', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}'::jsonb, '{"display_name":"Ana Ribeiro"}'::jsonb, false, false),
    (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'design-inspo@forlink.demo', crypt('demo-only', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}'::jsonb, '{"display_name":"Bruno Costa"}'::jsonb, false, false),
    (u3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'daily-reads@forlink.demo', crypt('demo-only', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}'::jsonb, '{"display_name":"Carla Mendes"}'::jsonb, false, false)
  ON CONFLICT (id) DO NOTHING;

  -- O trigger handle_new_user já criou profile + role free. Vamos ajustar os dados.
  UPDATE public.profiles SET username='tech-curator', display_name='Ana Ribeiro', bio='Engenheira de software · curando as melhores ferramentas para devs 🇧🇷', avatar_url='https://api.dicebear.com/9.x/avataaars/svg?seed=Ana', is_verified=true, views_count=1284 WHERE id=u1;
  UPDATE public.profiles SET username='design-inspo', display_name='Bruno Costa', bio='Designer de produto · inspiração diária em UI, UX e branding.', avatar_url='https://api.dicebear.com/9.x/avataaars/svg?seed=Bruno', is_verified=true, views_count=892 WHERE id=u2;
  UPDATE public.profiles SET username='daily-reads', display_name='Carla Mendes', bio='Jornalista de tecnologia · minhas leituras favoritas da semana.', avatar_url='https://api.dicebear.com/9.x/avataaars/svg?seed=Carla', is_verified=false, views_count=456 WHERE id=u3;

  -- Promover u1 e u2 para Pro
  UPDATE public.user_roles SET role='pro' WHERE user_id IN (u1, u2);

  -- Categorias e links do tech-curator
  INSERT INTO public.user_categories (id, user_id, name, display_order) VALUES (gen_random_uuid(), u1, 'Ferramentas para Devs', 0) RETURNING id INTO c_id;
  INSERT INTO public.links (user_id, category_id, title, description, url, favicon_url, display_order) VALUES
    (u1, c_id, 'GitHub', 'Onde meu código vive', 'https://github.com', 'https://www.google.com/s2/favicons?sz=64&domain=github.com', 0),
    (u1, c_id, 'Vercel', 'Deploy instantâneo', 'https://vercel.com', 'https://www.google.com/s2/favicons?sz=64&domain=vercel.com', 1),
    (u1, c_id, 'Supabase', 'Postgres com superpoderes', 'https://supabase.com', 'https://www.google.com/s2/favicons?sz=64&domain=supabase.com', 2);

  INSERT INTO public.user_categories (id, user_id, name, display_order) VALUES (gen_random_uuid(), u1, 'Aprendizado', 1) RETURNING id INTO c_id;
  INSERT INTO public.links (user_id, category_id, title, description, url, favicon_url, display_order) VALUES
    (u1, c_id, 'MDN Web Docs', 'A referência da web', 'https://developer.mozilla.org', 'https://www.google.com/s2/favicons?sz=64&domain=developer.mozilla.org', 0),
    (u1, c_id, 'Frontend Masters', 'Cursos avançados', 'https://frontendmasters.com', 'https://www.google.com/s2/favicons?sz=64&domain=frontendmasters.com', 1);

  INSERT INTO public.user_categories (id, user_id, name, display_order) VALUES (gen_random_uuid(), u1, 'Comunidades', 2) RETURNING id INTO c_id;
  INSERT INTO public.links (user_id, category_id, title, description, url, favicon_url, display_order) VALUES
    (u1, c_id, 'Hacker News', 'Notícias de tech', 'https://news.ycombinator.com', 'https://www.google.com/s2/favicons?sz=64&domain=news.ycombinator.com', 0),
    (u1, c_id, 'dev.to', 'Artigos da comunidade', 'https://dev.to', 'https://www.google.com/s2/favicons?sz=64&domain=dev.to', 1);

  -- design-inspo
  INSERT INTO public.user_categories (id, user_id, name, display_order) VALUES (gen_random_uuid(), u2, 'Inspiração Visual', 0) RETURNING id INTO c_id;
  INSERT INTO public.links (user_id, category_id, title, description, url, favicon_url, display_order) VALUES
    (u2, c_id, 'Dribbble', 'Shots de designers', 'https://dribbble.com', 'https://www.google.com/s2/favicons?sz=64&domain=dribbble.com', 0),
    (u2, c_id, 'Behance', 'Portfólios completos', 'https://behance.net', 'https://www.google.com/s2/favicons?sz=64&domain=behance.net', 1),
    (u2, c_id, 'Awwwards', 'Sites premiados', 'https://awwwards.com', 'https://www.google.com/s2/favicons?sz=64&domain=awwwards.com', 2);

  INSERT INTO public.user_categories (id, user_id, name, display_order) VALUES (gen_random_uuid(), u2, 'Ferramentas de Design', 1) RETURNING id INTO c_id;
  INSERT INTO public.links (user_id, category_id, title, description, url, favicon_url, display_order) VALUES
    (u2, c_id, 'Figma', 'Design colaborativo', 'https://figma.com', 'https://www.google.com/s2/favicons?sz=64&domain=figma.com', 0),
    (u2, c_id, 'Framer', 'Sites interativos', 'https://framer.com', 'https://www.google.com/s2/favicons?sz=64&domain=framer.com', 1);

  -- daily-reads
  INSERT INTO public.user_categories (id, user_id, name, display_order) VALUES (gen_random_uuid(), u3, 'Leituras da Semana', 0) RETURNING id INTO c_id;
  INSERT INTO public.links (user_id, category_id, title, description, url, favicon_url, display_order) VALUES
    (u3, c_id, 'The Verge', 'Tecnologia e cultura', 'https://theverge.com', 'https://www.google.com/s2/favicons?sz=64&domain=theverge.com', 0),
    (u3, c_id, 'Wired', 'Reportagens profundas', 'https://wired.com', 'https://www.google.com/s2/favicons?sz=64&domain=wired.com', 1);

  INSERT INTO public.user_categories (id, user_id, name, display_order) VALUES (gen_random_uuid(), u3, 'Newsletters', 1) RETURNING id INTO c_id;
  INSERT INTO public.links (user_id, category_id, title, description, url, favicon_url, display_order) VALUES
    (u3, c_id, 'Stratechery', 'Análise de tech e negócios', 'https://stratechery.com', 'https://www.google.com/s2/favicons?sz=64&domain=stratechery.com', 0),
    (u3, c_id, 'Platformer', 'Big tech por dentro', 'https://platformer.news', 'https://www.google.com/s2/favicons?sz=64&domain=platformer.news', 1);
END $$;
