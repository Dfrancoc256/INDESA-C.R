BEGIN;

DELETE FROM movimientos_inventario
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE nombre IN (
    'Producto de muestra',
    'Excavadora compacta hidráulica',
    'Montacargas industrial',
    'Generador eléctrico industrial',
    'Compresor de aire para maquinaria',
    'Cilindro hidráulico reforzado',
    'Accesorio de carga frontal'
  )
);

DELETE FROM reservas
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE nombre IN (
    'Producto de muestra',
    'Excavadora compacta hidráulica',
    'Montacargas industrial',
    'Generador eléctrico industrial',
    'Compresor de aire para maquinaria',
    'Cilindro hidráulico reforzado',
    'Accesorio de carga frontal'
  )
);

DELETE FROM inventario
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE nombre IN (
    'Producto de muestra',
    'Excavadora compacta hidráulica',
    'Montacargas industrial',
    'Generador eléctrico industrial',
    'Compresor de aire para maquinaria',
    'Cilindro hidráulico reforzado',
    'Accesorio de carga frontal'
  )
);

DELETE FROM productos
WHERE nombre IN (
  'Producto de muestra',
  'Excavadora compacta hidráulica',
  'Montacargas industrial',
  'Generador eléctrico industrial',
  'Compresor de aire para maquinaria',
  'Cilindro hidráulico reforzado',
  'Accesorio de carga frontal'
);

DELETE FROM categorias
WHERE nombre IN (
  'Madera',
  'Herramientas',
  'Materiales',
  'Maquinaria pesada',
  'Equipos de apoyo',
  'Repuestos'
)
AND NOT EXISTS (
  SELECT 1 FROM productos WHERE productos.categoria_id = categorias.id
);

COMMIT;
