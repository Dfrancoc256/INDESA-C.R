import type { UsuarioMe } from "@workspace/api-client-react";

export function hasPermission(usuario: UsuarioMe | null | undefined, permiso: string) {
  if (!usuario) return false;
  if (usuario.rol?.nombre === "admin") return true;
  if (usuario.rol?.nombre === "operador") {
    const permisosLecturaOperador = [
      "dashboard.ver",
      "productos.ver",
      "categorias.ver",
      "inventario.ver",
      "reservas.ver",
    ];
    if (permisosLecturaOperador.includes(permiso)) return true;
  }
  return Boolean(usuario.rol?.permisos?.includes(permiso));
}

export function hasAnyPermission(usuario: UsuarioMe | null | undefined, permisos: string[]) {
  return permisos.some((permiso) => hasPermission(usuario, permiso));
}
