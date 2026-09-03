# Agenda Digital

Agenda personal con calendario mensual y bitácora semanal, construida con Next.js, Supabase y TipTap.

## Configuración local

1. Copia `.env.example` como `.env.local` y completa las credenciales públicas de Supabase.
2. Ejecuta `supabase/schema.sql` en un proyecto nuevo. Para una base existente, aplica `supabase/migrations/20260903_harden_schema.sql`.
3. Instala y levanta la aplicación:

```bash
npm install
npm run dev
```

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run build
```

Las rutas bajo `/dashboard` requieren una sesión válida de Supabase. Row Level Security limita cada perfil, evento y bitácora a su propietario.
