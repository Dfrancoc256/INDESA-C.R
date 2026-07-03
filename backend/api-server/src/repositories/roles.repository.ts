import { db, rolesTable } from "@workspace/db";

export async function findAllRoles() {
  return db.select().from(rolesTable).orderBy(rolesTable.id);
}

export async function findRolById(id: number) {
  const rows = await db.select().from(rolesTable).where(
    (await import("drizzle-orm")).eq(rolesTable.id, id)
  ).limit(1);
  return rows[0] ?? null;
}
