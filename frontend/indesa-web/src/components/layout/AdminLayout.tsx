import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { 
  Home, Package, ClipboardList, 
  Calendar, Users, LogOut, Menu, X, Tags, Loader2, Landmark
} from "lucide-react";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import logoIndesa from "@/assets/logo-indesa-wordmark.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { usuario, isAuthenticated, isLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return <AdminStatus title="Cargando panel administrativo" description="Estamos validando tu sesión." />;
  }

  if (!isAuthenticated) {
    return <AdminStatus title="Redirigiendo al acceso" description="Inicia sesión para entrar al panel." />;
  }

  const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: Home, permiso: "dashboard.ver" },
    { href: "/admin/finanzas", label: "Finanzas", icon: Landmark, permiso: "finanzas.ver" },
    { href: "/admin/productos", label: "Productos", icon: Package, permiso: "productos.ver" },
    { href: "/admin/reservas", label: "Reservas", icon: Calendar, permiso: "reservas.ver" },
    { href: "/admin/inventario", label: "Inventario", icon: ClipboardList, permiso: "inventario.ver" },
    { href: "/admin/categorias", label: "Categorías", icon: Tags, permiso: "categorias.ver" },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users, permiso: "usuarios.ver" },
  ].filter((link) => hasPermission(usuario, link.permiso));

  const homeHref = navLinks[0]?.href ?? "/admin/login";

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-gray-100 font-sans md:flex">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border z-20 shadow-md">
        <Link href={homeHref} className="group flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-[128px] place-items-center transition-transform duration-200 group-hover:-translate-y-0.5">
            <img src={logoIndesa} alt="INDESA" className="h-auto w-full object-contain" />
          </span>
          <span className="font-bold text-sm tracking-tight text-sidebar-foreground/85">Admin</span>
        </Link>
        <button
          className="rounded-md border border-sidebar-border p-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sidebar-accent"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? "Cerrar menu" : "Abrir menu"}
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-20 w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl transition-transform duration-300 ease-in-out md:translate-x-0 md:shadow-none
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="hidden md:flex h-16 items-center px-6 border-b border-sidebar-border">
            <Link href={homeHref} className="group flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-[148px] place-items-center transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.02]">
              <img src={logoIndesa} alt="INDESA" className="h-auto w-full object-contain" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-normal text-sidebar-foreground/65">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href || location.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                    : "text-sidebar-foreground/70 hover:-translate-y-0.5 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-md transition-colors ${
                  isActive ? "bg-white/15" : "bg-sidebar-accent/40 group-hover:bg-sidebar-accent"
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
                {link.label}
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-sidebar-primary-foreground" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-sidebar-accent/70">
                <Avatar className="h-9 w-9 bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30">
                  <AvatarFallback>{getInitials(usuario?.nombre || "")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{usuario?.nombre} {usuario?.apellido}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate capitalize">{usuario?.rol?.nombre}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-black/50 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto md:ml-64">
        <div className="min-w-0 flex-1 p-3 sm:p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function AdminStatus({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-md border bg-white p-6 text-center shadow-lg">
        <img src={logoIndesa} alt="INDESA" className="mx-auto mb-5 h-auto w-44 object-contain" />
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
