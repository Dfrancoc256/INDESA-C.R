# Arquitectura

El proyecto esta organizado como monorepo local con pnpm.

- `backend/api-server`: API REST con Express, TypeScript, JWT, permisos y acceso a PostgreSQL mediante Drizzle.
- `frontend/indesa-web`: aplicacion React + Vite para catalogo publico y panel administrativo.
- `packages/db`: esquema compartido de base de datos.
- `packages/api-zod`: contratos Zod compartidos.
- `packages/api-client-react`: cliente de API usado por el frontend.
- `database`: SQL base para crear y probar la base de datos.
- `docs`: documentacion funcional y tecnica.

La estructura reemplaza las carpetas generadas por Replit con nombres claros para trabajar localmente.
