-- Entidad Principal: Usuarios
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name VARCHAR(80),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notas Diarias (Eventos y Estado del día)
CREATE TABLE public.daily_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    title VARCHAR(120) NOT NULL DEFAULT 'Sin título',
    content TEXT,
    tags TEXT[],
    day_state VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date) 
);

-- Bitácoras Semanales
CREATE TABLE public.weekly_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    iso_week INTEGER NOT NULL,
    year INTEGER NOT NULL,
    content_markdown TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, iso_week, year)
);

-- Habilitar RLS estricto
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario consulta su perfil" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuario actualiza su perfil" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (full_name) ON public.users TO authenticated;
CREATE POLICY "Propietario gestiona sus notas" ON public.daily_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Propietario gestiona sus bitácoras" ON public.weekly_logs FOR ALL USING (auth.uid() = user_id);

-- Trigger para auto-crear usuario en public.users cuando se registra en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
