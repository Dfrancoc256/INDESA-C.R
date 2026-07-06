import { db, usuariosTable, rolesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export async function findAllUsuarios() {
  return db
    .select({
      id: usuariosTable.id,
      nombre: usuariosTable.nombre,
      apellido: usuariosTable.apellido,
      email: usuariosTable.email,
      role_id: usuariosTable.roleId,
      rol_nombre: rolesTable.nombre,
      activo: usuariosTable.activo,
      last_login: usuariosTable.lastLogin,
      created_at: usuariosTable.createdAt,
    })
    .from(usuariosTable)
    .leftJoin(rolesTable, eq(usuariosTable.roleId, rolesTable.id))
    .orderBy(usuariosTable.createdAt);
}

export async function findUsuarioById(id: number) {
  const rows = await db
    .select({
      id: usuariosTable.id,
      nombre: usuariosTable.nombre,
      apellido: usuariosTable.apellido,
      email: usuariosTable.email,
      role_id: usuariosTable.roleId,
      rol_nombre: rolesTable.nombre,
      activo: usuariosTable.activo,
      last_login: usuariosTable.lastLogin,
      created_at: usuariosTable.createdAt,
    })
    .from(usuariosTable)
    .leftJoin(rolesTable, eq(usuariosTable.roleId, rolesTable.id))
    .where(eq(usuariosTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUsuarioByEmail(email: string) {
  const rows = await db
    .select({
      id: usuariosTable.id,
      nombre: usuariosTable.nombre,
      apellido: usuariosTable.apellido,
      email: usuariosTable.email,
      passwordHash: usuariosTable.passwordHash,
      role_id: usuariosTable.roleId,
      rol_nombre: rolesTable.nombre,
      activo: usuariosTable.activo,
    })
    .from(usuariosTable)
    .leftJoin(rolesTable, eq(usuariosTable.roleId, rolesTable.id))
    .where(eq(usuariosTable.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function createUsuario(data: {
  nombre: string;
  apellido?: string;
  email: string;
  passwordHash: string;
  roleId: number;
}) {
  const rows = await db.insert(usuariosTable).values({
    nombre: data.nombre,
    apellido: data.apellido ?? null,
    email: data.email,
    passwordHash: data.passwordHash,
    roleId: data.roleId,
    activo: true,
  }).returning();
  return rows[0];
}

export async function updateUsuario(id: number, data: Partial<{
  nombre: string;
  apellido: string;
  email: string;
  roleId: number;
  activo: boolean;
  passwordHash: string;
  lastLogin: Date;
}>) {
  const rows = await db
    .update(usuariosTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(usuariosTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteUsuario(id: number) {
  await db.delete(usuariosTable).where(eq(usuariosTable.id, id));
}
