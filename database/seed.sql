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

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Madera', 'Productos de madera'),
  ('Herramientas', 'Herramientas y accesorios'),
  ('Materiales', 'Materiales para construccion');

INSERT INTO productos (nombre, descripcion, categoria_id, precio, imagen_url) VALUES
  ('Producto de muestra', 'Producto inicial para pruebas locales', 1, 100.00, NULL);

INSERT INTO inventario (producto_id, cantidad, stock_minimo) VALUES
  (1, 20, 5);
