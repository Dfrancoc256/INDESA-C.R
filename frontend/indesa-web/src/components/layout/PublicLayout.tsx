import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, LockKeyhole, Mail, Menu, MessageCircle, Phone, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getListProductosQueryKey, useListProductos, type Producto } from "@workspace/api-client-react";
import { formatCurrency, getInitials, getTarifaPrincipal } from "@/lib/utils";
import logoIndesa from "@/assets/logo-indesa-lockup.png";
import logoIndesaCompleto from "@/assets/logo-indesa-transparent.png";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSocialMenuOpen, setIsSocialMenuOpen] = useState(false);
  const socialMenuRef = useRef<HTMLDivElement | null>(null);
  const whatsappUrl = "https://wa.me/50222223333?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20la%20renta%20de%20maquinaria.";

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

  useEffect(() => {
    if (!isSocialMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && socialMenuRef.current?.contains(target)) return;
      setIsSocialMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSocialMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSocialMenuOpen]);

  const handleHeaderSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = headerSearch.trim();
    setIsMobileMenuOpen(false);
    setIsSearchFocused(false);

    if (!query) {
      setLocation("/catalogo");
      return;
    }

    setLocation(`/catalogo?buscar=${encodeURIComponent(query)}`);
  };

  const normalizedSearch = headerSearch.trim().toLowerCase();
  const searchParams = {
    page: 1,
    limit: 5,
    busqueda: normalizedSearch || undefined,
    orden: "nombre_asc",
  } as const;
  const { data: searchResponse, isFetching: isFetchingSuggestions } = useListProductos(searchParams, {
    query: {
      queryKey: getListProductosQueryKey(searchParams),
      enabled: Boolean(normalizedSearch),
    },
  });
  const searchSuggestions = normalizedSearch ? searchResponse?.data ?? [] : [];
  const showSearchSuggestions = isSearchFocused && Boolean(normalizedSearch);

  const goToProduct = (producto: Producto) => {
    setHeaderSearch(producto.nombre);
    setIsSearchFocused(false);
    setIsMobileMenuOpen(false);
    setLocation(`/producto/${producto.id}`);
  };

  const goToCatalogSearch = () => {
    const query = headerSearch.trim();
    setIsSearchFocused(false);
    setIsMobileMenuOpen(false);
    setLocation(query ? `/catalogo?buscar=${encodeURIComponent(query)}` : "/catalogo");
  };

  const searchSuggestionList = (
    <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-md border bg-white shadow-xl">
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
        Coincidencias
      </div>
      {isFetchingSuggestions ? (
        <div className="px-3 py-4 text-sm text-muted-foreground">Buscando coincidencias...</div>
      ) : searchSuggestions.length > 0 ? (
        <div className="max-h-80 overflow-y-auto py-1">
          {searchSuggestions.map((producto) => (
            <button
              key={producto.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                goToProduct(producto);
              }}
              className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-primary/5"
            >
              <div className="h-12 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {producto.imagen_url ? (
                  <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
                    {getInitials(producto.nombre)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{producto.nombre}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {producto.categoria_nombre} · {producto.descripcion}
                </div>
              </div>
              <div className="hidden shrink-0 text-sm font-bold text-primary sm:block">
                {formatCurrency(getTarifaPrincipal(producto).value)}
                <span className="ml-1 text-[11px] font-medium text-muted-foreground">/{getTarifaPrincipal(producto).suffix}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-sm text-muted-foreground">
          No encontramos coincidencias exactas.
        </div>
      )}
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          goToCatalogSearch();
        }}
        className="flex w-full items-center justify-between border-t px-3 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        Ver resultados en catálogo
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full bg-[#ff2800] text-white shadow-[0_12px_28px_rgba(90,15,6,0.26)]">
        <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4 md:h-[92px] md:px-8 lg:gap-8">
          <Link
            href="/"
            className="group flex h-16 w-[132px] min-w-0 shrink-0 items-center justify-center rounded-md bg-white px-2 py-1.5 shadow-lg shadow-red-950/18 ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:w-[142px] md:h-[76px] md:w-[156px]"
          >
            <img
              src={logoIndesa}
              alt="INDESA renta de equipo"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            />
          </Link>

          <form onSubmit={handleHeaderSearch} className="relative hidden w-full max-w-[430px] xl:block">
            <div className="flex h-11 items-center rounded-md border border-white/60 bg-white shadow-[0_8px_18px_rgba(80,12,5,0.18)] transition-all duration-200 focus-within:border-[#ffd400] focus-within:shadow-[0_10px_24px_rgba(80,12,5,0.26)]">
              <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="search"
                value={headerSearch}
                onChange={(event) => setHeaderSearch(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setIsSearchFocused(false);
                }}
                placeholder="¿Qué maquinaria buscas?"
                aria-label="Buscar maquinaria"
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="mr-1 rounded-md bg-[#c90000] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#9f0000] hover:shadow-sm"
              >
                Buscar
              </button>
            </div>
            {showSearchSuggestions && searchSuggestionList}
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-3 lg:gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative rounded-md px-4 py-3 text-[15px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#c90000] ${
                  isActive(link.href)
                    ? "text-white"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {link.label}
                <span
                  className={`absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#ffd400] transition-all duration-300 ${
                    isActive(link.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex shrink-0 items-center gap-4">
            {isAuthenticated ? (
              <Button asChild className="gap-2 rounded-md bg-white text-[#c90000] shadow-[0_8px_18px_rgba(80,12,5,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#fff8d6] hover:text-[#9f0000] hover:shadow-md">
                <Link href="/admin/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Panel Admin
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="gap-2 rounded-md bg-white text-[#c90000] shadow-[0_8px_18px_rgba(80,12,5,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#fff8d6] hover:text-[#9f0000] hover:shadow-md">
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
            className="md:hidden -mr-2 rounded-md border border-white/25 bg-white/10 p-2 text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/15 bg-[#ff2800] px-4 py-4 shadow-md">
            <form onSubmit={handleHeaderSearch} className="relative mb-4">
              <div className="flex h-11 items-center rounded-md border bg-white shadow-sm">
                <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="search"
                  value={headerSearch}
                  onChange={(event) => setHeaderSearch(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setIsSearchFocused(false);
                  }}
                  placeholder="¿Qué maquinaria buscas?"
                  aria-label="Buscar maquinaria"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button type="submit" className="mr-1 rounded-md bg-[#c90000] px-3 py-2 text-sm font-semibold text-white">
                  Buscar
                </button>
              </div>
              {showSearchSuggestions && searchSuggestionList}
            </form>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-white text-[#c90000]"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t">
                {isAuthenticated ? (
                  <Button asChild className="w-full gap-2 bg-white text-[#c90000] hover:bg-[#fff8d6]">
                    <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" />
                      Panel Admin
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full gap-2 bg-white text-[#c90000] hover:bg-[#fff8d6]">
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
        <div className="h-1.5 w-full bg-[#ffd400]" />
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <div ref={socialMenuRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        <div
          className={`w-72 overflow-hidden rounded-md border bg-white shadow-2xl transition-all duration-300 ${
            isSocialMenuOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          <div className="border-b px-4 py-3">
            <div className="text-sm font-bold text-foreground">Contacto rápido</div>
            <div className="text-xs text-muted-foreground">Cotiza o resuelve dudas con INDESA.</div>
          </div>
          <div className="p-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-[#128C7E] transition-colors hover:bg-[#128C7E]/10 hover:text-[#075E54]"
              onClick={() => setIsSocialMenuOpen(false)}
            >
              <MessageCircle className="h-4 w-4 text-[#128C7E]" />
              WhatsApp
            </a>
            <a
              href="tel:+50222223333"
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-colors hover:bg-primary/5 hover:text-primary"
              onClick={() => setIsSocialMenuOpen(false)}
            >
              <Phone className="h-4 w-4 text-primary" />
              Llamar
            </a>
            <a
              href="mailto:info@indesa.com.gt"
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-colors hover:bg-primary/5 hover:text-primary"
              onClick={() => setIsSocialMenuOpen(false)}
            >
              <Mail className="h-4 w-4 text-primary" />
              Correo
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsSocialMenuOpen((current) => !current)}
          aria-label={isSocialMenuOpen ? "Cerrar redes sociales" : "Abrir redes sociales"}
          className="inline-flex h-14 items-center gap-3 rounded-full bg-primary px-5 font-semibold text-white shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-1 hover:bg-primary/90 hover:shadow-2xl"
        >
          {isSocialMenuOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          Redes
        </button>
      </div>

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
