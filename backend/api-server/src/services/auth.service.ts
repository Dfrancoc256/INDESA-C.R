import bcrypt from "bcrypt";
import { signAccessToken, signRefreshToken, hashRefreshToken, refreshTokenExpiry } from "../lib/jwt";
import * as usuariosRepo from "../repositories/usuarios.repository";
import { db, refreshTokensTable, rolesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function login(email: string, password: string) {
  const usuario = await usuariosRepo.findUsuarioByEmail(email);
  if (!usuario || !usuario.activo) {
    throw Object.assign(new Error("Credenciales inválidas"), { status: 401 });
  }

  const valid = await bcrypt.compare(password, usuario.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Credenciales inválidas"), { status: 401 });
  }

  // Obtener rol con permisos desde BD
  const roles = await db.select().from(rolesTable).where(eq(rolesTable.id, usuario.roleId)).limit(1);
  const rol = roles[0];
  if (!rol) throw Object.assign(new Error("Rol no encontrado"), { status: 500 });

  const payload = {
    sub: usuario.id,
    email: usuario.email,
    roleId: usuario.roleId,
    rolNombre: rol.nombre,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  await db.insert(refreshTokensTable).values({
    usuarioId: usuario.id,
    tokenHash,
    expiresAt: refreshTokenExpiry(),
  });

  // Actualizar last_login
  await usuariosRepo.updateUsuario(usuario.id, { lastLogin: new Date() });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 900, // 15 min
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido ?? null,
      email: usuario.email,
      rol: { id: rol.id, nombre: rol.nombre, descripcion: rol.descripcion, permisos: rol.permisos },
    },
  };
}

export async function refresh(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const rows = await db
    .select()
    .from(refreshTokensTable)
    .where(and(eq(refreshTokensTable.tokenHash, tokenHash), eq(refreshTokensTable.revoked, false)))
    .limit(1);

  const stored = rows[0];
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error("Refresh token inválido o expirado"), { status: 401 });
  }

  const usuario = await usuariosRepo.findUsuarioByEmail(
    (await usuariosRepo.findUsuarioById(stored.usuarioId))?.email ?? ""
  );
  if (!usuario || !usuario.activo) {
    throw Object.assign(new Error("Usuario inactivo"), { status: 401 });
  }

  const roles = await db.select().from(rolesTable).where(eq(rolesTable.id, usuario.roleId)).limit(1);
  const rol = roles[0];
  if (!rol) throw Object.assign(new Error("Rol no encontrado"), { status: 500 });

  // Revocar token anterior
  await db.update(refreshTokensTable).set({ revoked: true }).where(eq(refreshTokensTable.id, stored.id));

  const newRefresh = signRefreshToken();
  await db.insert(refreshTokensTable).values({
    usuarioId: stored.usuarioId,
    tokenHash: hashRefreshToken(newRefresh),
    expiresAt: refreshTokenExpiry(),
  });

  return {
    access_token: signAccessToken({ sub: usuario.id, email: usuario.email, roleId: usuario.roleId, rolNombre: rol.nombre }),
    refresh_token: newRefresh,
    expires_in: 900,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido ?? null,
      email: usuario.email,
      rol: { id: rol.id, nombre: rol.nombre, descripcion: rol.descripcion, permisos: rol.permisos },
    },
  };
}

export async function logout(usuarioId: number) {
  await db.update(refreshTokensTable).set({ revoked: true }).where(
    eq(refreshTokensTable.usuarioId, usuarioId)
  );
}

export async function getMe(usuarioId: number, roleId: number) {
  const usuario = await usuariosRepo.findUsuarioById(usuarioId);
  if (!usuario) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
  const roles = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1);
  const rol = roles[0];
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido ?? null,
    email: usuario.email,
    rol: rol ? { id: rol.id, nombre: rol.nombre, descripcion: rol.descripcion, permisos: rol.permisos } : null,
  };
}
