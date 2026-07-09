import { db, reservasTable, productosTable } from "@workspace/db";
import { and, desc, eq, ilike, or, sql, type SQL, inArray, lte, gte } from "drizzle-orm";

function decimalToNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function mapReservaRow<T extends {
  precio_unitario: string;
  descuento: string;
  total_estimado: string;
}>(row: T) {
  return {
    ...row,
    precio_unitario: decimalToNumber(row.precio_unitario) ?? 0,
    descuento: decimalToNumber(row.descuento) ?? 0,
    total_estimado: decimalToNumber(row.total_estimado) ?? 0,
  };
}

export async function findAllReservas(params: {
  estado?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20, estado, busqueda } = params;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (estado) conditions.push(eq(reservasTable.estado, estado));
  if (busqueda?.trim()) {
    const term = `%${busqueda.trim()}%`;
    const searchCondition = or(
      ilike(reservasTable.clienteNombre, term),
      ilike(reservasTable.clienteEmail, term),
      ilike(reservasTable.clienteTelefono, term),
      ilike(productosTable.nombre, term),
      sql`cast(${reservasTable.id} as text) ilike ${term}`,
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  const condition = conditions.length ? and(...conditions) : undefined;

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
      tipo_tarifa: reservasTable.tipoTarifa,
      unidades_tarifa: reservasTable.unidadesTarifa,
      precio_unitario: reservasTable.precioUnitario,
      descuento: reservasTable.descuento,
      total_estimado: reservasTable.totalEstimado,
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

  return { data: rows.map(mapReservaRow), total: Number(count), page, limit };
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
      tipo_tarifa: reservasTable.tipoTarifa,
      unidades_tarifa: reservasTable.unidadesTarifa,
      precio_unitario: reservasTable.precioUnitario,
      descuento: reservasTable.descuento,
      total_estimado: reservasTable.totalEstimado,
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
  return rows[0] ? mapReservaRow(rows[0]) : null;
}

export async function findReservaDetalleById(id: number) {
  return findReservaById(id);
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
  tipoTarifa: string;
  unidadesTarifa: number;
  precioUnitario: number | string;
  descuento: number | string;
  totalEstimado: number | string;
  notas?: string;
}) {
  const rows = await db.insert(reservasTable).values({
    clienteNombre: data.clienteNombre,
    clienteEmail: data.clienteEmail,
    clienteTelefono: data.clienteTelefono,
    productoId: data.productoId,
    cantidad: data.cantidad,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    diasReserva: data.diasReserva,
    tipoTarifa: data.tipoTarifa,
    unidadesTarifa: data.unidadesTarifa,
    precioUnitario: String(data.precioUnitario),
    descuento: String(data.descuento),
    totalEstimado: String(data.totalEstimado),
    estado: "pendiente",
    notas: data.notas ?? null,
  }).returning();
  return rows[0];
}

export async function updateReservaEstado(id: number, estado: string, notas?: string) {
  const update: Record<string, unknown> = { estado, updatedAt: new Date() };
  if (notas !== undefined) update["notas"] = notas;
  const rows = await db.update(reservasTable).set(update).where(eq(reservasTable.id, id)).returning({ id: reservasTable.id });
  if (!rows[0]) return null;
  return findReservaById(id);
}

export async function updateReserva(
  id: number,
  data: Partial<{
    notas: string;
    precioUnitario: number | string;
    descuento: number | string;
    totalEstimado: number | string;
  }>,
) {
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.notas !== undefined) update["notas"] = data.notas;
  if (data.precioUnitario !== undefined) update["precioUnitario"] = String(data.precioUnitario);
  if (data.descuento !== undefined) update["descuento"] = String(data.descuento);
  if (data.totalEstimado !== undefined) update["totalEstimado"] = String(data.totalEstimado);

  const rows = await db
    .update(reservasTable)
    .set(update)
    .where(eq(reservasTable.id, id))
    .returning({ id: reservasTable.id });

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
      tipo_tarifa: reservasTable.tipoTarifa,
      unidades_tarifa: reservasTable.unidadesTarifa,
      precio_unitario: reservasTable.precioUnitario,
      descuento: reservasTable.descuento,
      total_estimado: reservasTable.totalEstimado,
      estado: reservasTable.estado,
      notas: reservasTable.notas,
      whatsapp_enviado: reservasTable.whatsappEnviado,
      created_at: reservasTable.createdAt,
      updated_at: reservasTable.updatedAt,
    })
    .from(reservasTable)
    .leftJoin(productosTable, eq(reservasTable.productoId, productosTable.id))
    .orderBy(desc(reservasTable.createdAt))
    .limit(limit)
    .then((rows) => rows.map(mapReservaRow));
}

export async function getReservaStockComprometido(params: {
  productoId: number;
  fechaInicio: string;
  fechaFin: string;
}) {
  const { productoId, fechaInicio, fechaFin } = params;
  const [row] = await db
    .select({
      comprometido: sql<number>`coalesce(sum(${reservasTable.cantidad}), 0)::int`,
    })
    .from(reservasTable)
    .where(and(
      eq(reservasTable.productoId, productoId),
      inArray(reservasTable.estado, ["pendiente", "confirmada"]),
      lte(reservasTable.fechaInicio, fechaFin),
      gte(reservasTable.fechaFin, fechaInicio),
    ));

  return Number(row?.comprometido ?? 0);
}

export async function findReservasComprometidasPorProducto(params: {
  productoId: number;
  fechaInicio: string;
  fechaFin: string;
}) {
  const { productoId, fechaInicio, fechaFin } = params;

  return db
    .select({
      cantidad: reservasTable.cantidad,
      fecha_inicio: reservasTable.fechaInicio,
      fecha_fin: reservasTable.fechaFin,
      estado: reservasTable.estado,
    })
    .from(reservasTable)
    .where(and(
      eq(reservasTable.productoId, productoId),
      inArray(reservasTable.estado, ["pendiente", "confirmada"]),
      lte(reservasTable.fechaInicio, fechaFin),
      gte(reservasTable.fechaFin, fechaInicio),
    ));
}

export async function findReservasParaReporte(params: {
  desde: string;
  hasta: string;
}) {
  const { desde, hasta } = params;
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
      tipo_tarifa: reservasTable.tipoTarifa,
      unidades_tarifa: reservasTable.unidadesTarifa,
      precio_unitario: reservasTable.precioUnitario,
      descuento: reservasTable.descuento,
      total_estimado: reservasTable.totalEstimado,
      estado: reservasTable.estado,
      notas: reservasTable.notas,
      whatsapp_enviado: reservasTable.whatsappEnviado,
      created_at: reservasTable.createdAt,
      updated_at: reservasTable.updatedAt,
    })
    .from(reservasTable)
    .leftJoin(productosTable, eq(reservasTable.productoId, productosTable.id))
    .where(and(
      gte(reservasTable.createdAt, new Date(`${desde}T00:00:00`)),
      lte(reservasTable.createdAt, new Date(`${hasta}T23:59:59.999`)),
    ))
    .orderBy(desc(reservasTable.createdAt))
    .then((rows) => rows.map(mapReservaRow));
}
