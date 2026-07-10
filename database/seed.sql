INSERT INTO roles (nombre, descripcion, permisos) VALUES
  ('admin', 'Administrador del sistema', ARRAY[
    'dashboard.ver',
    'roles.ver',
    'productos.ver',
    'productos.crear', 'productos.editar', 'productos.eliminar',
    'categorias.ver',
    'inventario.ver', 'inventario.editar',
    'reservas.ver', 'reservas.editar', 'reservas.cambiar_estado',
    'finanzas.ver',
    'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar'
  ]),
  ('operador', 'Usuario operativo', ARRAY[
    'dashboard.ver',
    'roles.ver',
    'productos.ver',
    'productos.crear', 'productos.editar', 'productos.eliminar',
    'categorias.ver',
    'inventario.ver', 'inventario.editar',
    'reservas.ver', 'reservas.editar', 'reservas.cambiar_estado'
  ]);

-- El catálogo debe gestionarse desde el panel administrador y quedar guardado en la base de datos.
-- No se insertan productos ni categorías de muestra.
