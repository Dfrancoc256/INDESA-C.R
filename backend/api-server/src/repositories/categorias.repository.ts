import { db, categoriasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function findAllCategorias(soloActivas = false) {
  const query = db.select().from(categoriasTable).orderBy(categoriasTable.nombre);
  if (soloActivas) {
    return db.select().from(categoriasTable).where(eq(categoriasTable.activa, true)).orderBy(categoriasTable.nombre);
  }
  return query;
}

export async function findCategoriaById(id: number) {
  const rows = await db.select().from(categoriasTable).where(eq(categoriasTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCategoria(data: { nombre: string; descripcion?: string; activa?: boolean }) {
  const rows = await db.insert(categoriasTable).values(data).returning();
  return rows[0];
}

export async function updateCategoria(id: number, data: Partial<{ nombre: string; descripcion: string; activa: boolean }>) {
  const rows = await db.update(categoriasTable).set(data).where(eq(categoriasTable.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteCategoria(id: number) {
  await db.delete(categoriasTable).where(eq(categoriasTable.id, id));
}
