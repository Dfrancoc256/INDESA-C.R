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
      cliente_nombre: reservasTable.clienteNombre,
      cliente_email: reservasTable.clienteEmail,
      cliente_telefono: reservasTable.clienteTelefono,
      producto_id: reservasTable.productoId,
      producto_nombre: productosTable.nombre,
      cantidad: reservasTable.cantidad,
      fecha_inicio: reservasTable.fechaInicio,
      fecha_fin: reservasTable.fechaFin,
      dias_reserva: reservasTable.diasReserva,
      estado: reservasTable.estado,
      notas: reservasTable.notas,
      whatsapp_enviado: reservasTable.whatsappEnviado,
      created_at: reservasTable.createdAt,
      updated_at: reservasTable.updatedAt,
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
      cliente_nombre: reservasTable.clienteNombre,
      cliente_email: reservasTable.clienteEmail,
      cliente_telefono: reservasTable.clienteTelefono,
      producto_id: reservasTable.productoId,
      producto_nombre: productosTable.nombre,
      cantidad: reservasTable.cantidad,
      fecha_inicio: reservasTable.fechaInicio,
      fecha_fin: reservasTable.fechaFin,
      dias_reserva: reservasTable.diasReserva,
      estado: reservasTable.estado,
      notas: reservasTable.notas,
      whatsapp_enviado: reservasTable.whatsappEnviado,
      created_at: reservasTable.createdAt,
      updated_at: reservasTable.updatedAt,
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
  fechaInicio: string;
  fechaFin: string;
  diasReserva: number;
  notas?: string;
}) {
  const rows = await db.insert(reservasTable).values({ ...data, estado: "pendiente" }).returning();
  return rows[0];
}

export async function updateReservaEstado(id: number, estado: string, notas?: string) {
  const update: Record<string, unknown> = { estado, updatedAt: new Date() };
  if (notas !== undefined) update["notas"] = notas;
  const rows = await db.update(reservasTable).set(update).where(eq(reservasTable.id, id)).returning({ id: reservasTable.id });
  if (!rows[0]) return null;
  return findReservaById(id);
}

export async function marcarWhatsappEnviado(id: number) {
  await db.update(reservasTable).set({ whatsappEnviado: true }).where(eq(reservasTable.id, id));
}

export async function findReservasRecientes(limit = 10) {
  return db
    .select({
      id: reservasTable.id,
      cliente_nombre: reservasTable.clienteNombre,
      cliente_email: reservasTable.clienteEmail,
      cliente_telefono: reservasTable.clienteTelefono,
      producto_id: reservasTable.productoId,
      producto_nombre: productosTable.nombre,
      cantidad: reservasTable.cantidad,
      fecha_inicio: reservasTable.fechaInicio,
      fecha_fin: reservasTable.fechaFin,
      dias_reserva: reservasTable.diasReserva,
      estado: reservasTable.estado,
      notas: reservasTable.notas,
      whatsapp_enviado: reservasTable.whatsappEnviado,
      created_at: reservasTable.createdAt,
      updated_at: reservasTable.updatedAt,
    })
    .from(reservasTable)
    .leftJoin(productosTable, eq(reservasTable.productoId, productosTable.id))
    .orderBy(desc(reservasTable.createdAt))
    .limit(limit);
}
