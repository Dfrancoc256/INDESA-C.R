import bcrypt from "bcrypt";
import { db, movimientosTable, refreshTokensTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as repo from "../repositories/usuarios.repository";

const SALT_ROUNDS = 12;

type CreateUsuarioPayload = {
  nombre: string;
  apellido?: string;
  email: string;
  password: string;
  roleId?: number;
  role_id?: number;
};

export async function listUsuarios() {
  return repo.findAllUsuarios();
}

export async function createUsuario(data: {
  nombre: string;
  apellido?: string;
  email: string;
  password: string;
  roleId: number;
}) {
  const roles = await db.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.id, data.roleId)).limit(1);
  if (!roles.length) {
    throw Object.assign(new Error("El rol seleccionado no existe"), { status: 400 });
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  return repo.createUsuario({
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    passwordHash,
    passwordTemporal: true,
    roleId: data.roleId,
  });
}

export async function createUsuarioFromBody(data: CreateUsuarioPayload) {
  const roleId = data.roleId ?? data.role_id;
  if (!roleId) {
    throw Object.assign(new Error("Debe seleccionar un rol válido"), { status: 400 });
  }
  return createUsuario({
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    password: data.password,
    roleId,
  });
}

export async function updateUsuario(id: number, data: Partial<{ nombre: string; apellido: string; email: string; roleId: number }>) {
  if (data.roleId !== undefined) {
    const roles = await db.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.id, data.roleId)).limit(1);
    if (!roles.length) {
      throw Object.assign(new Error("El rol seleccionado no existe"), { status: 400 });
    }
  }
  const updated = await repo.updateUsuario(id, data);
  if (!updated) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
  return repo.findUsuarioById(id);
}

export async function toggleUsuario(id: number) {
  const usuario = await repo.findUsuarioById(id);
  if (!usuario) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
  return repo.updateUsuario(id, { activo: !usuario.activo });
}

export async function deleteUsuario(id: number) {
  const usuario = await repo.findUsuarioById(id);
  if (!usuario) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
  await db.delete(refreshTokensTable).where(eq(refreshTokensTable.usuarioId, id));
  await db.update(movimientosTable).set({ usuarioId: null }).where(eq(movimientosTable.usuarioId, id));
  await repo.deleteUsuario(id);
}

export async function resetPassword(id: number, nuevaPassword: string) {
  const passwordHash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);
  const updated = await repo.updateUsuario(id, { passwordHash, passwordTemporal: true });
  if (!updated) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
}
