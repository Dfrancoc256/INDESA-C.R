INSERT INTO roles (nombre, descripcion, permisos) VALUES
  ('admin', 'Administrador del sistema', ARRAY[
    'dashboard.ver',
    'productos.crear', 'productos.editar', 'productos.eliminar',
    'inventario.ver', 'inventario.editar',
    'reservas.ver', 'reservas.editar',
    'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar'
  ]),
  ('operador', 'Usuario operativo', ARRAY[
    'dashboard.ver',
    'inventario.ver', 'inventario.editar',
    'reservas.ver', 'reservas.editar'
  ]);

-- El catálogo debe gestionarse desde el panel administrador y quedar guardado en la base de datos.
-- No se insertan productos ni categorías de muestra.
