import type { UsuarioMe } from "@workspace/api-client-react";

export function hasPermission(usuario: UsuarioMe | null | undefined, permiso: string) {
  if (!usuario) return false;
  if (usuario.rol?.nombre === "admin") return true;
  if (usuario.rol?.nombre === "operador") {
    return !permiso.startsWith("finanzas.") && !permiso.startsWith("usuarios.");
  }
  return Boolean(usuario.rol?.permisos?.includes(permiso));
}

export function hasAnyPermission(usuario: UsuarioMe | null | undefined, permisos: string[]) {
  return permisos.some((permiso) => hasPermission(usuario, permiso));
}
