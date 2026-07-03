import * as repo from "../repositories/inventario.repository";

export async function listInventario() {
  return repo.findAllInventario();
}

export async function getInventario(productoId: number) {
  return repo.findInventarioByProducto(productoId);
}

export async function updateInventario(
  productoId: number,
  cantidad: number,
  motivo: string,
  stockMinimo?: number,
  usuarioId?: number
) {
  const current = await repo.findInventarioByProducto(productoId);
  const cantidadAnterior = current?.cantidad ?? 0;

  await repo.upsertInventario(productoId, cantidad, stockMinimo);

  const diferencia = cantidad - cantidadAnterior;
  const tipo = diferencia > 0 ? "entrada" : diferencia < 0 ? "salida" : "ajuste";

  await repo.createMovimiento({
    productoId,
    tipo,
    cantidad: Math.abs(diferencia) || cantidad,
    motivo,
    usuarioId,
  });

  return repo.findInventarioByProducto(productoId);
}

export async function getMovimientos(productoId: number) {
  return repo.findMovimientosByProducto(productoId);
}

export async function getStockBajo() {
  return repo.findStockBajo();
}
