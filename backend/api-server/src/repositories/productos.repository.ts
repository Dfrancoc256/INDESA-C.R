import { db, productosTable, categoriasTable, inventarioTable } from "@workspace/db";
import { eq, ilike, and, or, sql, asc, desc } from "drizzle-orm";

type DisponibilidadFiltro = "disponible" | "pocas_unidades" | "agotado" | undefined;
type OrdenFiltro = "nombre_asc" | "nombre_desc" | "precio_asc" | "precio_desc" | undefined;

function calcularDisponibilidad(cantidad: number, stockMinimo: number): string {
  if (cantidad === 0) return "agotado";
  if (cantidad <= stockMinimo) return "pocas_unidades";
  return "disponible";
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

  const conditions: ReturnType<typeof eq>[] = [];
  if (soloActivos) conditions.push(eq(productosTable.activo, true));
  if (params.categoriaId) conditions.push(eq(productosTable.categoriaId, params.categoriaId));
  if (params.busqueda) conditions.push(ilike(productosTable.nombre, `%${params.busqueda}%`));

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
      imagen_url: productosTable.imagenUrl,
      activo: productosTable.activo,
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
    .where(conditions.length ? and(...conditions) : undefined);

  const data = rows.map((r) => ({
    ...r,
    precio: Number(r.precio),
    disponibilidad: calcularDisponibilidad(r.cantidad ?? 0, r.stock_minimo ?? 5),
  }));

  // filtro de disponibilidad post-query
  const filtered = params.disponibilidad
    ? data.filter((p) => p.disponibilidad === params.disponibilidad)
    : data;

  return { data: filtered, total: Number(count), page, limit };
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
      imagen_url: productosTable.imagenUrl,
      activo: productosTable.activo,
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
    disponibilidad: calcularDisponibilidad(r.cantidad ?? 0, r.stock_minimo ?? 5),
  };
}

export async function createProducto(data: {
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  precio: number;
  imagenUrl?: string;
  activo?: boolean;
}) {
  const rows = await db.insert(productosTable).values({
    ...data,
    precio: String(data.precio),
  }).returning();
  return rows[0];
}

export async function updateProducto(id: number, data: Partial<{
  nombre: string;
  descripcion: string;
  categoriaId: number;
  precio: number;
  imagenUrl: string;
  activo: boolean;
}>) {
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.precio !== undefined) update["precio"] = String(data.precio);
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
