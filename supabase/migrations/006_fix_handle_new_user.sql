-- Corrige "Database error creating new user" no trigger de signup
-- Causa: search_path do Auth não inclui public → falha ao resolver user_role/profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.user_role := 'client';
  _email TEXT;
  _role_text TEXT;
BEGIN
  _email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  IF _email IS NULL OR btrim(_email) = '' THEN
    RAISE EXCEPTION 'Email obrigatório para criar perfil';
  END IF;

  _role_text := NEW.raw_user_meta_data->>'role';
  IF _role_text IN ('admin', 'client') THEN
    _role := _role_text::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    _email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR current_setting('role', true) = 'service_role');

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
