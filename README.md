# TEUS Fleet OS

Sistema integral de gestión de flota para TEUS Logistics — Paraguay.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** con paleta TEUS
- **Supabase** (Postgres + Auth)
- **Deploy**: Vercel

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
```

## Deploy en Vercel

1. Subir el código a GitHub
2. Importar el repo en Vercel
3. Agregar las variables de entorno en Vercel (Settings → Environment Variables)
4. Deploy automático

## Rutas

- `/login` — Login / Registro
- `/dashboard` — Panel principal con KPIs y flota
- `/vehiculos` — Gestión de vehículos (CRUD + activar/desactivar)

Más rutas se van agregando en siguientes iteraciones.
