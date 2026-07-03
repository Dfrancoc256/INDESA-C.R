import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, LockKeyhole, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import logoIndesa from "@/assets/logo-indesa-lockup.png";
import logoIndesaCompleto from "@/assets/logo-indesa-transparent.png";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");

  const navLinks = [
    { href: "/", label: "Inicio" },
    { href: "/catalogo", label: "Catálogo" },
    { href: "/reservar", label: "Reservar" },
    { href: "/contacto", label: "Contacto" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location === href || location.startsWith(`${href}/`);
  };

  const handleHeaderSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = headerSearch.trim();
    setIsMobileMenuOpen(false);

    if (!query) {
      setLocation("/catalogo");
      return;
    }

    setLocation(`/catalogo?buscar=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full bg-background/95 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4 md:h-[92px] md:px-8 lg:gap-8">
          <Link href="/" className="group flex h-16 w-[132px] min-w-0 shrink-0 items-center transition-transform duration-200 hover:-translate-y-0.5 sm:h-[72px] sm:w-[150px] md:w-[168px]">
            <img
              src={logoIndesa}
              alt="INDESA renta de equipo"
              className="h-full w-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </Link>

          <form
            onSubmit={handleHeaderSearch}
            className="hidden xl:flex h-11 w-full max-w-[390px] items-center rounded-md border border-border bg-white shadow-sm transition-all duration-200 focus-within:border-primary focus-within:shadow-md"
          >
            <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              placeholder="¿Qué maquinaria buscas?"
              aria-label="Buscar maquinaria"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="mr-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            >
              Buscar
            </button>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8 lg:gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative px-1 py-3 text-[15px] font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                <span
                  className={`absolute inset-x-0 bottom-1 h-0.5 rounded-full bg-primary transition-all duration-300 ${
                    isActive(link.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex shrink-0 items-center gap-4">
            {isAuthenticated ? (
              <Button asChild className="gap-2 rounded-md shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <Link href="/admin/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Panel Admin
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="gap-2 rounded-md shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <Link href="/admin/login">
                  <LockKeyhole className="h-4 w-4" />
                  Acceso
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden rounded-md border bg-card p-2 -mr-2 text-muted-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b bg-background/95 px-4 py-4 shadow-md backdrop-blur">
            <form onSubmit={handleHeaderSearch} className="mb-4 flex h-11 items-center rounded-md border bg-white shadow-sm">
              <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="search"
                value={headerSearch}
                onChange={(event) => setHeaderSearch(event.target.value)}
                placeholder="¿Qué maquinaria buscas?"
                aria-label="Buscar maquinaria"
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" className="mr-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                Buscar
              </button>
            </form>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-primary"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t">
                {isAuthenticated ? (
                  <Button asChild className="w-full gap-2">
                    <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" />
                      Panel Admin
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full gap-2">
                    <Link href="/admin/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <LockKeyhole className="h-4 w-4" />
                      Acceso
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
        <div className="h-1 w-full bg-primary shadow-[0_2px_10px_rgba(220,38,38,0.22)]" />
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="border-t bg-muted/40 py-12">
        <div className="container mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-4">
              <img src={logoIndesaCompleto} alt="INDESA" className="h-20 w-auto max-w-[150px] object-contain" />
            </div>
            <p className="text-sm text-muted-foreground">
              Maquinaria, repuestos y equipos industriales de alta calidad para empresas y profesionales en Guatemala.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Enlaces</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/catalogo" className="hover:text-primary">Catálogo de Productos</Link></li>
              <li><Link href="/reservar" className="hover:text-primary">Realizar Reserva</Link></li>
              <li><Link href="/contacto" className="hover:text-primary">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Zona 4, Ciudad de Guatemala</li>
              <li>info@indesa.com.gt</li>
              <li>+502 2222-3333</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Horario</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Lunes a Viernes: 8:00 - 17:00</li>
              <li>Sábados: 8:00 - 12:00</li>
              <li>Domingos: Cerrado</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-8 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} INDESA. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
