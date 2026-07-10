import { useDeleteProducto, useListCategorias, useListProductos, type Producto } from "@workspace/api-client-react";
import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { formatCurrency, getInitials, getTarifaPrincipal, getTarifasProducto } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { getFriendlyApiErrorMessage } from "@/lib/apiErrorMessage";
import { errorMessages } from "@/lib/errorMessages";
import { invalidateCatalogData } from "@/lib/queryInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Filter, BadgeCheck, XCircle, Trash2 } from "lucide-react";

export function ProductosList() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  
  // Debounce search
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const canCreateProducts = hasPermission(usuario, "productos.crear");
  const canEditProducts = hasPermission(usuario, "productos.editar");
  const canDeleteProducts = hasPermission(usuario, "productos.eliminar");
  const canManageProducts = canCreateProducts || canEditProducts || canDeleteProducts;
  const productosColSpan = canManageProducts ? 6 : 5;
  
  const handleSearch = (val: string) => {
    setBusqueda(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedBusqueda(val);
      setPage(1);
    }, 500);
  };

  const { data: categorias } = useListCategorias();
  
  const { data: productosResponse, isLoading } = useListProductos({
    page,
    limit: pageSize,
    busqueda: debouncedBusqueda || undefined,
    categoria_id: categoriaId,
    incluir_inactivos: true,
  } as any);

  const productosPagina = productosResponse?.data ?? [];
  const totalProductos = productosResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProductos / pageSize));
  const showInitialSkeleton = isLoading && productosPagina.length === 0;

  const deleteMutation = useDeleteProducto({
    mutation: {
      onSuccess: async () => {
        toast({ title: "Producto eliminado", description: "El producto fue retirado del catálogo correctamente." });
        setProductoAEliminar(null);
        await invalidateCatalogData(queryClient);
        if (productosPagina.length === 1 && page > 1) {
          setPage((currentPage) => Math.max(1, currentPage - 1));
        }
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "No fue posible eliminar el producto",
          description: getFriendlyApiErrorMessage(err, errorMessages.generic),
        });
      },
    },
  });

  const confirmarEliminacion = () => {
    if (!productoAEliminar) return;
    deleteMutation.mutate({ id: productoAEliminar.id });
  };

  // Mantiene la página dentro del rango cuando cambian los filtros o el total
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Gestiona el catálogo de productos de INDESA.</p>
        </div>
        {canCreateProducts && (
          <Button asChild>
            <Link href="/admin/productos/nuevo">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </Link>
          </Button>
        )}
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
                <TableHead className="w-32">Imagen</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Estado</TableHead>
                {canManageProducts && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {showInitialSkeleton ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i} className="h-24">
                    <TableCell className="py-3"><Skeleton className="h-16 w-24 rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /><Skeleton className="h-3 w-[150px] mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    {canManageProducts && <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : productosPagina.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={productosColSpan} className="h-32 text-center text-muted-foreground">
                    No se encontraron productos que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                productosPagina.map((producto: Producto) => {
                  const tarifa = getTarifaPrincipal(producto);
                  const tarifas = getTarifasProducto(producto);

                  return (
                  <TableRow key={producto.id} className="h-24 transition-colors hover:bg-muted/35">
                    <TableCell className="py-3">
                      {producto.imagen_url ? (
                        <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm md:h-20 md:w-28">
                          <img
                            src={producto.imagen_url}
                            alt={producto.nombre}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-contain p-1.5 transition-transform duration-200 hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-24 items-center justify-center rounded-lg border bg-muted text-lg font-semibold text-muted-foreground md:h-20 md:w-28">
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
                      <div>{formatCurrency(tarifa.value)}</div>
                      <div className="text-xs font-normal text-muted-foreground">por {tarifa.suffix}</div>
                      {tarifas.length > 1 && (
                        <div className="mt-1 text-[11px] font-normal text-muted-foreground">
                          {tarifas.length} tarifas
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${
                          producto.activo 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {producto.activo ? (
                          <><BadgeCheck className="h-3.5 w-3.5" /> Activo</>
                        ) : (
                          <><XCircle className="h-3.5 w-3.5" /> Inactivo</>
                        )}
                      </div>
                    </TableCell>
                    {canManageProducts && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                        {canEditProducts && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/productos/editar/${producto.id}`}>
                              <Edit className="h-4 w-4 mr-1" /> Editar
                            </Link>
                          </Button>
                        )}
                        {canDeleteProducts && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setProductoAEliminar(producto)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                          </Button>
                        )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {productosResponse && totalProductos > 0 && (
          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalProductos)} de {totalProductos} productos
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
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AlertDialog open={Boolean(productoAEliminar)} onOpenChange={(open) => !open && setProductoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción retirará el producto "{productoAEliminar?.nombre}" del sistema. Si solo necesita ocultarlo del catálogo, puede editarlo y desactivar su publicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmarEliminacion();
              }}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar producto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
