
-- 1) Triggers em presentations (idempotentes)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'presentations_set_user_id'
  ) THEN
    CREATE TRIGGER presentations_set_user_id
    BEFORE INSERT ON public.presentations
    FOR EACH ROW EXECUTE FUNCTION public.set_presentation_user_id();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'presentations_update_updated_at'
  ) THEN
    CREATE TRIGGER presentations_update_updated_at
    BEFORE UPDATE ON public.presentations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Enum de roles (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
  END IF;
END $$;

-- 3) Tabela user_roles (idempotente)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) Função para checar role (idempotente)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- 5) Policies (checando por policyname correto)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Users can manage their own user role'
  ) THEN
    CREATE POLICY "Users can manage their own user role"
    ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND role = 'user');
  END IF;
END $$;
