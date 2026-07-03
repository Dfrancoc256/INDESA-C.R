import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListCategorias, useListProductos, type ListProductosOrden } from "@workspace/api-client-react";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, SlidersHorizontal, AlertCircle } from "lucide-react";

const pageSize = 12;

export function Catalogo() {
  const [location] = useLocation();
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");
  const [orden, setOrden] = useState<ListProductosOrden>("nombre_asc");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(busqueda);
    setPage(1);
  };

  useEffect(() => {
    const queryString = location.includes("?") ? location.split("?")[1] : window.location.search.slice(1);
    const query = new URLSearchParams(queryString).get("buscar") ?? "";

    setBusqueda(query);
    setSearchQuery(query);
    setPage(1);
  }, [location]);

  const categoriaId = categoria === "todas" ? undefined : Number(categoria);
  const { data: categorias = [], isLoading: isLoadingCategorias } = useListCategorias();
  const { data: productosResponse, isLoading: isLoadingProductos, isError } = useListProductos({
    page,
    limit: pageSize,
    busqueda: searchQuery.trim() || undefined,
    categoria_id: categoriaId,
    orden,
  });

  const categoriasDisponibles = categorias.filter((cat) => cat.activa);
  const productosPagina = productosResponse?.data ?? [];
  const totalProductos = productosResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProductos / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-5 md:px-8 md:py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">Catálogo de Maquinaria</h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Encuentra maquinaria, equipos de apoyo y repuestos con operador coordinado por INDESA.
              </p>
            </div>
            <div className="w-fit rounded-md border bg-gray-50 px-3 py-2 text-sm font-semibold text-muted-foreground">
              {totalProductos} productos encontrados
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5 md:px-8 md:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
          
          {/* Sidebar / Filters */}
          <aside className="w-full shrink-0 space-y-4 self-start lg:sticky lg:top-28 lg:w-72">
            <div className="space-y-5 rounded-lg border bg-white p-4 shadow-sm">
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Search className="h-4 w-4" /> Buscar
                </h3>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input 
                    placeholder="¿Qué maquinaria buscas?"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-full"
                  />
                </form>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Filter className="h-4 w-4" /> Categoría
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="cat-todas" 
                      name="categoria" 
                      checked={categoria === "todas"}
                      onChange={() => { setCategoria("todas"); setPage(1); }}
                      className="accent-primary h-4 w-4"
                    />
                    <label htmlFor="cat-todas" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                      Todas las categorías
                    </label>
                  </div>
                  {isLoadingCategorias ? (
                    <div className="text-sm text-muted-foreground">Cargando categorías...</div>
                  ) : categoriasDisponibles.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No hay categorías activas.</div>
                  ) : categoriasDisponibles.map((cat) => (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id={`cat-${cat.id}`} 
                        name="categoria" 
                        checked={categoria === cat.id.toString()}
                        onChange={() => { setCategoria(cat.id.toString()); setPage(1); }}
                        className="accent-primary h-4 w-4"
                      />
                      <label htmlFor={`cat-${cat.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {cat.nombre}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <SlidersHorizontal className="h-4 w-4" /> Ordenar por
                </h3>
                <Select value={orden} onValueChange={(val) => { setOrden(val as ListProductosOrden); setPage(1); }}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nombre_asc">Nombre (A-Z)</SelectItem>
                    <SelectItem value="nombre_desc">Nombre (Z-A)</SelectItem>
                    <SelectItem value="precio_asc">Menor precio</SelectItem>
                    <SelectItem value="precio_desc">Mayor precio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {isLoadingProductos ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                    <div className="aspect-[4/3] animate-pulse bg-gray-200" />
                    <div className="space-y-3 p-3">
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                      <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
                      <div className="h-6 w-28 animate-pulse rounded bg-gray-200" />
                      <div className="h-9 w-full animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center rounded-lg border bg-white p-10 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4 opacity-80" />
                <h3 className="text-xl font-bold mb-2">No se pudo cargar el catálogo</h3>
                <p className="text-muted-foreground mb-6">
                  Verifique que el backend esté encendido y conectado a la base de datos.
                </p>
              </div>
            ) : productosPagina.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border bg-white p-10 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No se encontraron productos</h3>
                <p className="text-muted-foreground mb-6">
                  Intente ajustar los filtros o su término de búsqueda.
                </p>
                <Button onClick={() => {
                  setBusqueda("");
                  setSearchQuery("");
                  setCategoria("todas");
                  setPage(1);
                }} variant="outline">
                  Limpiar Filtros
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {productosPagina.map(producto => (
                    <Card key={producto.id} className="group relative flex overflow-hidden flex-col border bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                      <span className="absolute inset-x-0 top-0 z-10 h-1 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                      <span className="pointer-events-none absolute -left-1/2 top-0 z-20 h-full w-1/3 -skew-x-12 bg-white/20 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        {producto.imagen_url ? (
                          <img 
                            src={producto.imagen_url} 
                            alt={producto.nombre}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[0.4deg]" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gray-100 transition-transform duration-500 group-hover:scale-105">
                            {getInitials(producto.nombre)}
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        {producto.disponibilidad === "pocas_unidades" && (
                          <div className="absolute top-2 right-2 transition-transform duration-300 group-hover:-translate-y-0.5">
                            <Badge variant="warning" className="shadow-sm">Pocas Unidades</Badge>
                          </div>
                        )}
                        {producto.disponibilidad === "agotado" && (
                          <div className="absolute top-2 right-2 transition-transform duration-300 group-hover:-translate-y-0.5">
                            <Badge variant="destructive" className="shadow-sm">Agotado</Badge>
                          </div>
                        )}
                      </div>
                      <CardHeader className="p-3 pb-2 transition-transform duration-300 group-hover:-translate-y-0.5">
                        <div className="mb-1 text-xs text-muted-foreground">{producto.categoria_nombre}</div>
                        <CardTitle className="min-h-10 text-base leading-tight transition-colors duration-300 group-hover:text-primary" title={producto.nombre}>
                          <span className="line-clamp-2">{producto.nombre}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 p-3 pt-0 transition-transform duration-300 group-hover:-translate-y-0.5">
                        <div className="mb-2 text-xl font-bold text-primary">
                          {formatCurrency(producto.precio)}
                        </div>
                      </CardContent>
                      <CardFooter className="p-3 pt-0">
                        <Button asChild className="h-9 w-full transition-all duration-200 group-hover:border-primary group-hover:text-primary hover:-translate-y-0.5 hover:shadow-md" variant="outline">
                          <Link href={`/producto/${producto.id}`}>Ver Detalles</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalProductos > pageSize && (
                  <div className="flex items-center justify-center gap-2 pt-8">
                    <Button 
                      variant="outline" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <div className="text-sm font-medium px-4">
                      Página {page} de {totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
