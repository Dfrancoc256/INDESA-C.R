import type { UsuarioMe } from "@workspace/api-client-react";
import { hasPermission } from "@/lib/permissions";

export const adminNavigationItems = [
  { href: "/admin/dashboard", label: "Dashboard", permiso: "dashboard.ver" },
  { href: "/admin/finanzas", label: "Finanzas", permiso: "finanzas.ver" },
  { href: "/admin/productos", label: "Productos", permiso: "productos.ver" },
  { href: "/admin/reservas", label: "Reservas", permiso: "reservas.ver" },
  { href: "/admin/inventario", label: "Inventario", permiso: "inventario.ver" },
  { href: "/admin/categorias", label: "Categorías", permiso: "categorias.ver" },
  { href: "/admin/usuarios", label: "Usuarios", permiso: "usuarios.ver" },
] as const;

export function getAdminHomePath(usuario: UsuarioMe | null | undefined) {
  return adminNavigationItems.find((item) => hasPermission(usuario, item.permiso))?.href ?? "/admin/login";
}
