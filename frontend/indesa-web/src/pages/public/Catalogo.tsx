import { useState } from "react";
import { Link } from "wouter";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, SlidersHorizontal, AlertCircle } from "lucide-react";
import { mockCategorias, mockProductos } from "@/lib/mockCatalog";

type CatalogOrder = "nombre_asc" | "nombre_desc" | "precio_asc" | "precio_desc";

export function Catalogo() {
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");
  const [orden, setOrden] = useState<CatalogOrder>("nombre_asc");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(busqueda);
    setPage(1);
  };

  const categoriasDisponibles = mockCategorias;
  const productosFiltrados = mockProductos
    .filter((producto) => producto.activo !== false)
    .filter((producto) => categoria === "todas" || producto.categoria_id === parseInt(categoria))
    .filter((producto) => {
      const term = searchQuery.trim().toLowerCase();
      if (!term) return true;
      return `${producto.nombre} ${producto.descripcion ?? ""} ${producto.categoria_nombre ?? ""}`
        .toLowerCase()
        .includes(term);
    })
    .sort((a, b) => {
      const priceA = Number(a.precio);
      const priceB = Number(b.precio);
      if (orden === "nombre_desc") return b.nombre.localeCompare(a.nombre);
      if (orden === "precio_asc") return priceA - priceB;
      if (orden === "precio_desc") return priceB - priceA;
      return a.nombre.localeCompare(b.nombre);
    });
  const totalProductos = productosFiltrados.length;
  const productosPagina = productosFiltrados.slice((page - 1) * 12, page * 12);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 md:px-8 py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Catálogo de Maquinaria</h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Explore maquinaria, equipos de apoyo y repuestos para obra, mantenimiento e industria.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar / Filters */}
          <aside className="w-full lg:w-64 shrink-0 space-y-6">
            <div className="bg-white p-5 rounded-lg border shadow-sm space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4" /> Buscar
                </h3>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input 
                    placeholder="Nombre o ID..." 
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full"
                  />
                </form>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
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
                  {categoriasDisponibles.map((cat) => (
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
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Ordenar por
                </h3>
                <Select value={orden} onValueChange={(val) => { setOrden(val as CatalogOrder); setPage(1); }}>
                  <SelectTrigger className="w-full">
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
            {productosPagina.length === 0 ? (
              <div className="bg-white border rounded-lg p-12 text-center flex flex-col items-center">
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
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {productosPagina.map(producto => (
                    <Card key={producto.id} className="group overflow-hidden flex flex-col hover-elevate transition-shadow duration-300">
                      <div className="aspect-square relative bg-gray-100 overflow-hidden">
                        {producto.imagen_url ? (
                          <img 
                            src={producto.imagen_url} 
                            alt={producto.nombre}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gray-100">
                            {getInitials(producto.nombre)}
                          </div>
                        )}
                        {producto.disponibilidad === "pocas_unidades" && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="warning" className="shadow-sm">Pocas Unidades</Badge>
                          </div>
                        )}
                        {producto.disponibilidad === "agotado" && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="destructive" className="shadow-sm">Agotado</Badge>
                          </div>
                        )}
                      </div>
                      <CardHeader className="p-4 pb-2">
                        <div className="text-xs text-muted-foreground mb-1">{producto.categoria_nombre}</div>
                        <CardTitle className="text-lg leading-tight h-12" title={producto.nombre}>
                          <span className="line-clamp-2">{producto.nombre}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 flex-1">
                        <div className="text-2xl font-bold text-primary mb-2">
                          {formatCurrency(producto.precio)}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button asChild className="w-full" variant="outline">
                          <Link href={`/producto/${producto.id}`}>Ver Detalles</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalProductos > 12 && (
                  <div className="flex items-center justify-center gap-2 pt-8">
                    <Button 
                      variant="outline" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <div className="text-sm font-medium px-4">
                      Página {page} de {Math.ceil(totalProductos / 12)}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * 12 >= totalProductos}
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
