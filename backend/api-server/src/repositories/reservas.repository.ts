import { db, reservasTable, productosTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

export async function findAllReservas(params: {
  estado?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20, estado } = params;
  const offset = (page - 1) * limit;

  const condition = estado ? eq(reservasTable.estado, estado) : undefined;

  const rows = await db
    .select({
      id: reservasTable.id,
      clienteNombre: reservasTable.clienteNombre,
      clienteEmail: reservasTable.clienteEmail,
      clienteTelefono: reservasTable.clienteTelefono,
      productoId: reservasTable.productoId,
      productoNombre: productosTable.nombre,
      cantidad: reservasTable.cantidad,
      estado: reservasTable.estado,
      notas: reservasTable.notas,
      whatsappEnviado: reservasTable.whatsappEnviado,
      createdAt: reservasTable.createdAt,
      updatedAt: reservasTable.updatedAt,
    })
    .from(reservasTable)
    .leftJoin(productosTable, eq(reservasTable.productoId, productosTable.id))
    .where(condition)
    .orderBy(desc(reservasTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reservasTable)
    .where(condition);

  return { data: rows, total: Number(count), page, limit };
}

export async function findReservaById(id: number) {
  const rows = await db
    .select({
      id: reservasTable.id,
      clienteNombre: reservasTable.clienteNombre,
      clienteEmail: reservasTable.clienteEmail,
      clienteTelefono: reservasTable.clienteTelefono,
      productoId: reservasTable.productoId,
      productoNombre: productosTable.nombre,
      cantidad: reservasTable.cantidad,
      estado: reservasTable.estado,
      notas: reservasTable.notas,
      whatsappEnviado: reservasTable.whatsappEnviado,
      createdAt: reservasTable.createdAt,
      updatedAt: reservasTable.updatedAt,
    })
    .from(reservasTable)
    .leftJoin(productosTable, eq(reservasTable.productoId, productosTable.id))
    .where(eq(reservasTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createReserva(data: {
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  productoId: number;
  cantidad: number;
  notas?: string;
}) {
  const rows = await db.insert(reservasTable).values({ ...data, estado: "pendiente" }).returning();
  return rows[0];
}

export async function updateReservaEstado(id: number, estado: string, notas?: string) {
  const update: Record<string, unknown> = { estado, updatedAt: new Date() };
  if (notas !== undefined) update["notas"] = notas;
  const rows = await db.update(reservasTable).set(update).where(eq(reservasTable.id, id)).returning();
  return rows[0] ?? null;
}

export async function marcarWhatsappEnviado(id: number) {
  await db.update(reservasTable).set({ whatsappEnviado: true }).where(eq(reservasTable.id, id));
}

export async function findReservasRecientes(limit = 10) {
  return db
    .select({
      id: reservasTable.id,
      clienteNombre: reservasTable.clienteNombre,
      clienteEmail: reservasTable.clienteEmail,
      clienteTelefono: reservasTable.clienteTelefono,
      productoId: reservasTable.productoId,
      productoNombre: productosTable.nombre,
      cantidad: reservasTable.cantidad,
      estado: reservasTable.estado,
      notas: reservasTable.notas,
      whatsappEnviado: reservasTable.whatsappEnviado,
      createdAt: reservasTable.createdAt,
      updatedAt: reservasTable.updatedAt,
    })
    .from(reservasTable)
    .leftJoin(productosTable, eq(reservasTable.productoId, productosTable.id))
    .orderBy(desc(reservasTable.createdAt))
    .limit(limit);
}
