# Agenda Digital

Agenda personal instalable con calendario mensual y bitácora semanal, construida con Next.js, Supabase y TipTap.

## Funciones

- Calendario mensual para eventos y notas diarias.
- Bitácora semanal con editor enriquecido.
- Instalación como aplicación desde Chrome, Edge y navegadores compatibles con PWA.
- Lectura y edición sin conexión después de la primera visita.
- Sincronización automática de cambios al recuperar internet.
- Autenticación y datos privados mediante Supabase Row Level Security.

## Configuración local

1. Copia `.env.example` como `.env.local` y completa las credenciales públicas de Supabase.
2. Ejecuta `supabase/schema.sql` en un proyecto nuevo. Para una base existente, aplica `supabase/migrations/20260903_harden_schema.sql`.
3. Instala y levanta la aplicación:

```bash
npm install
npm run dev
```

## Instalación y uso offline

En producción, abre la aplicación desde HTTPS e inicia sesión al menos una vez. Después puedes usar la opción **Instalar aplicación** del menú lateral o la opción de instalación del navegador.

Los meses y semanas visitados quedan disponibles en el dispositivo. Si editas sin conexión, la aplicación guarda los cambios localmente y los sincroniza cuando vuelve internet. Al cerrar sesión se eliminan los datos offline del dispositivo.

> La instalación PWA y el service worker se activan en el build de producción; durante `npm run dev` permanecen deshabilitados para evitar caché obsoleta.

## Despliegue en Vercel

Configura estas variables de entorno en el proyecto de Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Vercel ejecutará `npm run build`. El HTTPS del despliegue permite que el navegador ofrezca la instalación de la aplicación.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run build
```

Las rutas bajo `/dashboard` requieren una sesión válida de Supabase. Row Level Security limita cada perfil, evento y bitácora a su propietario.
