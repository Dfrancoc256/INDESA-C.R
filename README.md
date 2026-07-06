# Indesa Web

Proyecto reorganizado para ejecutarse localmente sin dependencias de Replit.

## Estructura

```text
indesa-web-local/
  backend/api-server/
  frontend/indesa-web/
  packages/
    api-client-react/
    api-zod/
    db/
    api-spec/
  database/
  docs/
```

## Instalacion

```bash
pnpm install
```

Copia `backend/api-server/.env.example` como `backend/api-server/.env` y ajusta `DATABASE_URL` y `JWT_SECRET`.
El backend solo lee la configuracion de `backend/api-server/.env`, para evitar heredar variables viejas del proyecto raiz.
Si frontend y backend viven en dominios distintos, define `VITE_BACKEND_PUBLIC_URL` con la URL publica del backend.

## Base de datos

Puedes crear las tablas con:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```

Para crear rapidamente la base minima del login local:

```bash
psql "postgresql://indesa_user:6789juanpatito.@127.0.0.1:5432/indesa" -f database/crear-db-login.sql
```

Usuario de prueba:

- Correo: `admin@indesa.com.gt`
- Contrasena: `IndesaAdmin2026!`

O usar Drizzle:

```bash
pnpm --filter @workspace/db push
```

## Ejecutar local

Backend:

```bash
pnpm dev:backend
```

Frontend:

```bash
pnpm dev:frontend
```

Ambos a la vez:

```bash
pnpm dev
```

Por defecto:

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`
