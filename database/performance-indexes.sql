-- Indices para mejorar consultas frecuentes sin cambiar la logica del sistema.
-- Ejecutar en PostgreSQL:
-- psql -h localhost -U indesa_user -d indesa -f database/performance-indexes.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_categorias_activa_nombre ON categorias (activa, nombre);
CREATE INDEX IF NOT EXISTS idx_categorias_busqueda_nombre ON categorias USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categorias_busqueda_texto
  ON categorias USING gin ((nombre || ' ' || coalesce(descripcion, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_productos_activo_created ON productos (activo, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_productos_categoria_activo ON productos (categoria_id, activo);
CREATE INDEX IF NOT EXISTS idx_productos_updated_desc ON productos (updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_productos_busqueda_nombre ON productos USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_productos_busqueda_descripcion ON productos USING gin (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_productos_busqueda_texto
  ON productos USING gin ((nombre || ' ' || coalesce(descripcion, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventario_producto ON inventario (producto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_stock_bajo ON inventario (cantidad, stock_minimo);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto_created ON movimientos_inventario (producto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_created ON movimientos_inventario (usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservas_created_desc ON reservas (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_reservas_estado_created ON reservas (estado, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_reservas_estado_pago_created ON reservas (estado_pago, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_reservas_producto_fechas ON reservas (producto_id, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservas_fechas ON reservas (fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente_busqueda ON reservas USING gin ((cliente_nombre || ' ' || cliente_email || ' ' || cliente_telefono) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_reservas_busqueda_texto
  ON reservas USING gin ((cliente_nombre || ' ' || cliente_email || ' ' || cliente_telefono || ' ' || coalesce(notas, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_usuarios_activo_role ON usuarios (activo, role_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email_lower ON usuarios (lower(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_created_desc ON usuarios (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_busqueda_texto
  ON usuarios USING gin ((nombre || ' ' || coalesce(apellido, '') || ' ' || email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario_revoked ON refresh_tokens (usuario_id, revoked);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_revoked ON refresh_tokens (expires_at, revoked);

CREATE INDEX IF NOT EXISTS idx_roles_nombre_lower ON roles (lower(nombre));
