-- Base minima para iniciar sesion en INDESA local.
-- Usuario: admin@indesa.com.gt
-- Contrasena: IndesaAdmin2026!

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  permisos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
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

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  precio NUMERIC(10, 2) NOT NULL DEFAULT 0,
  imagen_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL UNIQUE REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  cliente_nombre TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE NOT NULL DEFAULT CURRENT_DATE,
  dias_reserva INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  whatsapp_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS dias_reserva INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  tipo TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  motivo TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (nombre, descripcion, permisos)
VALUES (
  'admin',
  'Administrador del sistema',
  ARRAY[
    'dashboard.ver',
    'productos.crear', 'productos.editar', 'productos.eliminar',
    'inventario.ver', 'inventario.editar',
    'reservas.ver', 'reservas.editar',
    'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar'
  ]
)
ON CONFLICT (nombre) DO UPDATE
SET
  descripcion = EXCLUDED.descripcion,
  permisos = EXCLUDED.permisos;

INSERT INTO usuarios (nombre, apellido, email, password_hash, role_id, activo)
VALUES (
  'Administrador',
  'INDESA',
  'admin@indesa.com.gt',
  '$2b$12$5CxkxL2roe/IeWNYj0YQ3eOpPeMFbvwTbC0dejcYMbs3p2ff9rdHS',
  (SELECT id FROM roles WHERE nombre = 'admin'),
  TRUE
)
ON CONFLICT (email) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  password_hash = EXCLUDED.password_hash,
  role_id = EXCLUDED.role_id,
  activo = TRUE,
  updated_at = NOW();
