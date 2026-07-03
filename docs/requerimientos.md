# Requerimientos

- Node.js 20 o superior
- pnpm
- PostgreSQL

Variables principales:

- `DATABASE_URL`: conexion PostgreSQL.
- `JWT_SECRET`: secreto para firmar tokens.
- `PORT`: puerto del backend. Por defecto `4000`.
- `FRONTEND_PORT`: puerto del frontend. Por defecto `5173`.
- `VITE_API_PROXY_TARGET`: URL del backend para reenviar las peticiones `/api` en desarrollo local.
