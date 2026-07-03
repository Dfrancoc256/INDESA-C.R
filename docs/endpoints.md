# Endpoints

La API se publica bajo `/api`.

- `GET /api/healthz`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `GET /api/categorias`
- `POST /api/categorias`
- `PUT /api/categorias/:id`
- `DELETE /api/categorias/:id`
- `GET /api/productos`
- `GET /api/productos/:id`
- `POST /api/productos`
- `PUT /api/productos/:id`
- `DELETE /api/productos/:id`
- `PATCH /api/productos/:id/toggle`
- `GET /api/inventario`
- `GET /api/inventario/:productoId`
- `PUT /api/inventario/:productoId`
- `GET /api/inventario/:productoId/movimientos`
- `POST /api/reservas`
- `GET /api/reservas`
- `GET /api/reservas/:id`
- `PATCH /api/reservas/:id/estado`
- `GET /api/usuarios`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `DELETE /api/usuarios/:id`
- `PATCH /api/usuarios/:id/toggle`
- `PUT /api/usuarios/:id/password`
- `GET /api/roles`
- `GET /api/dashboard/resumen`
- `GET /api/dashboard/reservas-recientes`
- `GET /api/dashboard/stock-bajo`
