SELECT * FROM productos WHERE activo = TRUE;
SELECT * FROM categorias WHERE activa = TRUE;
SELECT p.nombre, i.cantidad, i.stock_minimo
FROM inventario i
JOIN productos p ON p.id = i.producto_id
WHERE i.cantidad <= i.stock_minimo;
SELECT * FROM reservas ORDER BY created_at DESC;
