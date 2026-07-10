import { db, productosTable, categoriasTable, inventarioTable } from "@workspace/db";
import { eq, ilike, and, or, sql, asc, desc, type SQL } from "drizzle-orm";

type DisponibilidadFiltro = "disponible" | "pocas_unidades" | "agotado" | undefined;
type OrdenFiltro = "nombre_asc" | "nombre_desc" | "precio_asc" | "precio_desc" | undefined;

function calcularDisponibilidad(cantidad: number, stockMinimo: number): string {
  if (cantidad === 0) return "agotado";
  if (cantidad <= stockMinimo) return "pocas_unidades";
  return "disponible";
}

function decimalToNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export async function findProductos(params: {
  categoriaId?: number;
  busqueda?: string;
  disponibilidad?: DisponibilidadFiltro;
  orden?: OrdenFiltro;
  page?: number;
  limit?: number;
  soloActivos?: boolean;
}) {
  const { page = 1, limit = 20, soloActivos = true } = params;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (soloActivos) conditions.push(eq(productosTable.activo, true));
  if (params.categoriaId) conditions.push(eq(productosTable.categoriaId, params.categoriaId));
  if (params.busqueda) {
    const term = `%${params.busqueda}%`;
    const searchCondition = or(
      ilike(productosTable.nombre, term),
      ilike(productosTable.descripcion, term),
      ilike(categoriasTable.nombre, term),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (params.disponibilidad === "agotado") {
    conditions.push(sql`coalesce(${inventarioTable.cantidad}, 0) = 0`);
  }
  if (params.disponibilidad === "pocas_unidades") {
    conditions.push(sql`coalesce(${inventarioTable.cantidad}, 0) > 0 and coalesce(${inventarioTable.cantidad}, 0) <= coalesce(${inventarioTable.stockMinimo}, 5)`);
  }
  if (params.disponibilidad === "disponible") {
    conditions.push(sql`coalesce(${inventarioTable.cantidad}, 0) > coalesce(${inventarioTable.stockMinimo}, 5)`);
  }

  let orderBy;
  switch (params.orden) {
    case "nombre_asc":  orderBy = asc(productosTable.nombre); break;
    case "nombre_desc": orderBy = desc(productosTable.nombre); break;
    case "precio_asc":  orderBy = asc(productosTable.precio); break;
    case "precio_desc": orderBy = desc(productosTable.precio); break;
    default:            orderBy = desc(productosTable.createdAt);
  }

  const rows = await db
    .select({
      id: productosTable.id,
      nombre: productosTable.nombre,
      descripcion: productosTable.descripcion,
      categoria_id: productosTable.categoriaId,
      categoria_nombre: categoriasTable.nombre,
      precio: productosTable.precio,
      precio_dia: productosTable.precioDia,
      precio_semana: productosTable.precioSemana,
      precio_mes: productosTable.precioMes,
      imagen_url: productosTable.imagenUrl,
      activo: productosTable.activo,
      advertencia_precio: productosTable.advertenciaPrecio,
      cantidad: inventarioTable.cantidad,
      stock_minimo: inventarioTable.stockMinimo,
    })
    .from(productosTable)
    .leftJoin(categoriasTable, eq(productosTable.categoriaId, categoriasTable.id))
    .leftJoin(inventarioTable, eq(productosTable.id, inventarioTable.productoId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productosTable)
    .leftJoin(categoriasTable, eq(productosTable.categoriaId, categoriasTable.id))
    .leftJoin(inventarioTable, eq(productosTable.id, inventarioTable.productoId))
    .where(conditions.length ? and(...conditions) : undefined);

  const data = rows.map((r) => ({
    ...r,
    precio: Number(r.precio),
    precio_dia: decimalToNumber(r.precio_dia),
    precio_semana: decimalToNumber(r.precio_semana),
    precio_mes: decimalToNumber(r.precio_mes),
    disponibilidad: calcularDisponibilidad(r.cantidad ?? 0, r.stock_minimo ?? 5),
  }));

  return { data, total: Number(count), page, limit };
}

export async function findProductoById(id: number) {
  const rows = await db
    .select({
      id: productosTable.id,
      nombre: productosTable.nombre,
      descripcion: productosTable.descripcion,
      categoria_id: productosTable.categoriaId,
      categoria_nombre: categoriasTable.nombre,
      precio: productosTable.precio,
      precio_dia: productosTable.precioDia,
      precio_semana: productosTable.precioSemana,
      precio_mes: productosTable.precioMes,
      imagen_url: productosTable.imagenUrl,
      activo: productosTable.activo,
      advertencia_precio: productosTable.advertenciaPrecio,
      cantidad: inventarioTable.cantidad,
      stock_minimo: inventarioTable.stockMinimo,
    })
    .from(productosTable)
    .leftJoin(categoriasTable, eq(productosTable.categoriaId, categoriasTable.id))
    .leftJoin(inventarioTable, eq(productosTable.id, inventarioTable.productoId))
    .where(eq(productosTable.id, id))
    .limit(1);

  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    precio: Number(r.precio),
    precio_dia: decimalToNumber(r.precio_dia),
    precio_semana: decimalToNumber(r.precio_semana),
    precio_mes: decimalToNumber(r.precio_mes),
    disponibilidad: calcularDisponibilidad(r.cantidad ?? 0, r.stock_minimo ?? 5),
  };
}

export async function createProducto(data: {
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  precio: number;
  precioDia?: number | null;
  precioSemana?: number | null;
  precioMes?: number | null;
  imagenUrl?: string;
  activo?: boolean;
  advertenciaPrecio?: boolean;
}) {
  const rows = await db.insert(productosTable).values({
    ...data,
    precio: String(data.precio),
    precioDia: data.precioDia === undefined || data.precioDia === null ? null : String(data.precioDia),
    precioSemana: data.precioSemana === undefined || data.precioSemana === null ? null : String(data.precioSemana),
    precioMes: data.precioMes === undefined || data.precioMes === null ? null : String(data.precioMes),
  }).returning();
  return rows[0];
}

export async function updateProducto(id: number, data: Partial<{
  nombre: string;
  descripcion: string;
  categoriaId: number;
  precio: number;
  precioDia: number | null;
  precioSemana: number | null;
  precioMes: number | null;
  imagenUrl: string;
  activo: boolean;
  advertenciaPrecio: boolean;
}>) {
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.precio !== undefined) update["precio"] = String(data.precio);
  if (data.precioDia !== undefined) update["precioDia"] = data.precioDia === null ? null : String(data.precioDia);
  if (data.precioSemana !== undefined) update["precioSemana"] = data.precioSemana === null ? null : String(data.precioSemana);
  if (data.precioMes !== undefined) update["precioMes"] = data.precioMes === null ? null : String(data.precioMes);
  const rows = await db.update(productosTable).set(update).where(eq(productosTable.id, id)).returning();
  return rows[0] ?? null;
}

export async function toggleProductoActivo(id: number) {
  const producto = await db.select({ activo: productosTable.activo }).from(productosTable).where(eq(productosTable.id, id)).limit(1);
  if (!producto[0]) return null;
  const rows = await db.update(productosTable).set({ activo: !producto[0].activo, updatedAt: new Date() }).where(eq(productosTable.id, id)).returning();
  return rows[0] ?? null;
}

export async function softDeleteProducto(id: number) {
  await db.update(productosTable).set({ activo: false, updatedAt: new Date() }).where(eq(productosTable.id, id));
}
