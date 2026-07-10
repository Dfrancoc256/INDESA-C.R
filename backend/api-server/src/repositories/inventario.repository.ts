import { db, inventarioTable, productosTable, categoriasTable, movimientosTable } from "@workspace/db";
import { desc, eq, lte, sql } from "drizzle-orm";

function calcularDisponibilidad(cantidad: number, stockMinimo: number): string {
  if (cantidad === 0) return "agotado";
  if (cantidad <= stockMinimo) return "pocas_unidades";
  return "disponible";
}

export async function findAllInventario() {
  const rows = await db
    .select({
      producto_id: inventarioTable.productoId,
      producto_nombre: productosTable.nombre,
      categoria_nombre: categoriasTable.nombre,
      cantidad: inventarioTable.cantidad,
      stock_minimo: inventarioTable.stockMinimo,
      updated_at: inventarioTable.updatedAt,
    })
    .from(inventarioTable)
    .leftJoin(productosTable, eq(inventarioTable.productoId, productosTable.id))
    .leftJoin(categoriasTable, eq(productosTable.categoriaId, categoriasTable.id))
    .orderBy(desc(inventarioTable.updatedAt), desc(inventarioTable.id));

  return rows.map((r) => ({
    ...r,
    disponibilidad: calcularDisponibilidad(r.cantidad ?? 0, r.stock_minimo ?? 5),
  }));
}

export async function findInventarioByProducto(productoId: number) {
  const rows = await db
    .select({
      producto_id: inventarioTable.productoId,
      producto_nombre: productosTable.nombre,
      categoria_nombre: categoriasTable.nombre,
      cantidad: inventarioTable.cantidad,
      stock_minimo: inventarioTable.stockMinimo,
      updated_at: inventarioTable.updatedAt,
    })
    .from(inventarioTable)
    .leftJoin(productosTable, eq(inventarioTable.productoId, productosTable.id))
    .leftJoin(categoriasTable, eq(productosTable.categoriaId, categoriasTable.id))
    .where(eq(inventarioTable.productoId, productoId))
    .limit(1);

  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, disponibilidad: calcularDisponibilidad(r.cantidad ?? 0, r.stock_minimo ?? 5) };
}

export async function upsertInventario(productoId: number, cantidad: number, stockMinimo?: number) {
  const existing = await db.select().from(inventarioTable).where(eq(inventarioTable.productoId, productoId)).limit(1);
  if (existing[0]) {
    const rows = await db.update(inventarioTable)
      .set({ cantidad, stockMinimo: stockMinimo ?? existing[0].stockMinimo, updatedAt: new Date() })
      .where(eq(inventarioTable.productoId, productoId))
      .returning();
    return rows[0];
  } else {
    const rows = await db.insert(inventarioTable).values({ productoId, cantidad, stockMinimo: stockMinimo ?? 5 }).returning();
    return rows[0];
  }
}

export async function decrementarStock(productoId: number, cantidad: number): Promise<boolean> {
  const result = await db
    .update(inventarioTable)
    .set({ cantidad: sql`${inventarioTable.cantidad} - ${cantidad}`, updatedAt: new Date() })
    .where(
      sql`${inventarioTable.productoId} = ${productoId} AND ${inventarioTable.cantidad} >= ${cantidad}`
    )
    .returning({ cantidad: inventarioTable.cantidad });
  return result.length > 0;
}

export async function findStockBajo() {
  const rows = await db
    .select({
      producto_id: inventarioTable.productoId,
      producto_nombre: productosTable.nombre,
      categoria_nombre: categoriasTable.nombre,
      cantidad: inventarioTable.cantidad,
      stock_minimo: inventarioTable.stockMinimo,
      updated_at: inventarioTable.updatedAt,
    })
    .from(inventarioTable)
    .leftJoin(productosTable, eq(inventarioTable.productoId, productosTable.id))
    .leftJoin(categoriasTable, eq(productosTable.categoriaId, categoriasTable.id))
    .where(lte(inventarioTable.cantidad, inventarioTable.stockMinimo));

  return rows.map((r) => ({
    ...r,
    disponibilidad: calcularDisponibilidad(r.cantidad ?? 0, r.stock_minimo ?? 5),
  }));
}

export async function createMovimiento(data: {
  productoId: number;
  tipo: string;
  cantidad: number;
  motivo?: string;
  usuarioId?: number;
}) {
  const rows = await db.insert(movimientosTable).values(data).returning();
  return rows[0];
}

export async function findMovimientosByProducto(productoId: number) {
  const { usuariosTable } = await import("@workspace/db");
  return db
    .select({
      id: movimientosTable.id,
      producto_id: movimientosTable.productoId,
      tipo: movimientosTable.tipo,
      cantidad: movimientosTable.cantidad,
      motivo: movimientosTable.motivo,
      usuario_nombre: usuariosTable.nombre,
      created_at: movimientosTable.createdAt,
    })
    .from(movimientosTable)
    .leftJoin(usuariosTable, eq(movimientosTable.usuarioId, usuariosTable.id))
    .where(eq(movimientosTable.productoId, productoId))
    .orderBy(desc(movimientosTable.createdAt), desc(movimientosTable.id));
}
