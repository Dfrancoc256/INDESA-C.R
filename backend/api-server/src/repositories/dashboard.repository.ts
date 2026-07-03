import { db, productosTable, reservasTable, usuariosTable, inventarioTable } from "@workspace/db";
import { eq, sql, lte } from "drizzle-orm";

export async function getDashboardCounts() {
  const [productos] = await db.select({ count: sql<number>`count(*)::int` }).from(productosTable).where(eq(productosTable.activo, true));
  const [reservasTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(reservasTable);
  const [pendientes] = await db.select({ count: sql<number>`count(*)::int` }).from(reservasTable).where(eq(reservasTable.estado, "pendiente"));
  const [confirmadas] = await db.select({ count: sql<number>`count(*)::int` }).from(reservasTable).where(eq(reservasTable.estado, "confirmada"));
  const [entregadas] = await db.select({ count: sql<number>`count(*)::int` }).from(reservasTable).where(eq(reservasTable.estado, "entregada"));
  const [usuarios] = await db.select({ count: sql<number>`count(*)::int` }).from(usuariosTable);
  const [agotados] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventarioTable)
    .where(eq(inventarioTable.cantidad, 0));
  const [pocasUnidades] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventarioTable)
    .where(
      sql`${inventarioTable.cantidad} > 0 AND ${inventarioTable.cantidad} <= ${inventarioTable.stockMinimo}`
    );

  return {
    totalProductos: Number(productos?.count ?? 0),
    totalReservas: Number(reservasTotal?.count ?? 0),
    reservasPendientes: Number(pendientes?.count ?? 0),
    reservasConfirmadas: Number(confirmadas?.count ?? 0),
    reservasEntregadas: Number(entregadas?.count ?? 0),
    productosAgotados: Number(agotados?.count ?? 0),
    productosPocasUnidades: Number(pocasUnidades?.count ?? 0),
    totalUsuarios: Number(usuarios?.count ?? 0),
  };
}
