ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(80);

ALTER TABLE public.daily_notes
  ADD COLUMN IF NOT EXISTS title VARCHAR(120) NOT NULL DEFAULT 'Sin título';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario consulta su perfil" ON public.users;
DROP POLICY IF EXISTS "Usuario actualiza su perfil" ON public.users;

CREATE POLICY "Usuario consulta su perfil"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuario actualiza su perfil"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (full_name) ON public.users TO authenticated;

ALTER FUNCTION public.handle_new_user() SET search_path = '';
