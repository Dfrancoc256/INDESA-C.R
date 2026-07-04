CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_productos_activo_categoria ON productos (activo, categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo_nombre ON productos (activo, nombre);
CREATE INDEX IF NOT EXISTS idx_productos_precio ON productos (precio);
CREATE INDEX IF NOT EXISTS idx_productos_busqueda_nombre ON productos USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_productos_busqueda_descripcion ON productos USING gin (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categorias_nombre ON categorias (nombre);
