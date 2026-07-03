import { useListCategorias, useListProductos, useToggleProducto } from "@workspace/api-client-react";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Image as ImageIcon, Filter, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function ProductosList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);
  
  // Debounce search
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const handleSearch = (val: string) => {
    setBusqueda(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedBusqueda(val);
      setPage(1);
    }, 500);
  };

  const { data: categorias } = useListCategorias();
  
  const { data: productosResponse, isLoading, refetch } = useListProductos({
    page,
    limit: 10,
    busqueda: debouncedBusqueda || undefined,
    categoria_id: categoriaId,
    incluir_inactivos: true,
  } as any);

  const toggleMutation = useToggleProducto({
    mutation: {
      onSuccess: () => {
        toast({ title: "Estado actualizado", description: "El estado del producto ha sido cambiado." });
        refetch();
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el estado del producto." });
      }
    }
  });

  const handleToggleEstado = (id: number) => {
    toggleMutation.mutate({ id });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Gestiona el catálogo de productos de INDESA.</p>
        </div>
        <Button asChild>
          <Link href="/admin/productos/nuevo">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos por nombre o descripción..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={categoriaId?.toString() || "todas"} 
              onValueChange={(val) => {
                setCategoriaId(val === "todas" ? undefined : parseInt(val));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Imagen</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /><Skeleton className="h-3 w-[150px] mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : productosResponse?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No se encontraron productos que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                productosResponse?.data?.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell>
                      {producto.imagen_url ? (
                        <img 
                          src={producto.imagen_url} 
                          alt={producto.nombre} 
                          className="h-10 w-10 rounded-md object-cover border bg-muted"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center border text-muted-foreground font-semibold text-xs">
                          {getInitials(producto.nombre)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{producto.nombre}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs" title={producto.descripcion || ""}>
                        {producto.descripcion || "Sin descripción"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{producto.categoria_nombre}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(producto.precio)}
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => handleToggleEstado(producto.id)}
                        disabled={toggleMutation.isPending}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
                          producto.activo 
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {producto.activo ? (
                          <><CheckCircle2 className="h-3.5 w-3.5" /> Activo</>
                        ) : (
                          <><XCircle className="h-3.5 w-3.5" /> Inactivo</>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/productos/editar/${producto.id}`}>
                          <Edit className="h-4 w-4 mr-1" /> Editar
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {productosResponse && productosResponse.total > 0 && (
          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * 10) + 1} a {Math.min(page * 10, productosResponse.total)} de {productosResponse.total} productos
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={page * 10 >= productosResponse.total}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
