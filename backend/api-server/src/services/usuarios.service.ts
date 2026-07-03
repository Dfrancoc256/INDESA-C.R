import bcrypt from "bcrypt";
import * as repo from "../repositories/usuarios.repository";

const SALT_ROUNDS = 12;

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
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  return repo.createUsuario({ ...data, passwordHash });
}

export async function updateUsuario(id: number, data: Partial<{ nombre: string; apellido: string; email: string; roleId: number }>) {
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
  await repo.deleteUsuario(id);
}

export async function resetPassword(id: number, nuevaPassword: string) {
  const passwordHash = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);
  const updated = await repo.updateUsuario(id, { passwordHash });
  if (!updated) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
}
