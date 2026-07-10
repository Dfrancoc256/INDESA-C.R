CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  permisos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  precio NUMERIC(10, 2) NOT NULL DEFAULT 0,
  precio_dia NUMERIC(10, 2),
  precio_semana NUMERIC(10, 2),
  precio_mes NUMERIC(10, 2),
  imagen_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  advertencia_precio BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventario (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL UNIQUE REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reservas (
  id SERIAL PRIMARY KEY,
  cliente_nombre TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE NOT NULL DEFAULT CURRENT_DATE,
  dias_reserva INTEGER NOT NULL DEFAULT 1,
  tipo_tarifa TEXT NOT NULL DEFAULT 'dia',
  unidades_tarifa INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
  descuento NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_estimado NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  estado_pago TEXT NOT NULL DEFAULT 'pendiente',
  fecha_pago TIMESTAMPTZ,
  metodo_pago TEXT,
  referencia_pago TEXT,
  notas TEXT,
  whatsapp_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE movimientos_inventario (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  tipo TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  motivo TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_productos_activo_categoria ON productos (activo, categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo_nombre ON productos (activo, nombre);
CREATE INDEX IF NOT EXISTS idx_productos_precio ON productos (precio);
CREATE INDEX IF NOT EXISTS idx_productos_busqueda_nombre ON productos USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_productos_busqueda_descripcion ON productos USING gin (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categorias_nombre ON categorias (nombre);
