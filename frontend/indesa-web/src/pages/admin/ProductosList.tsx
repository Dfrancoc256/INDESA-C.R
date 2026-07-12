import { useDeleteProducto, useListCategorias, useListProductos, type Producto } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function ProductosList() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const debouncedBusqueda = useDebouncedValue(busqueda.trim(), 320);
  const canCreateProducts = hasPermission(usuario, "productos.crear");
  const canEditProducts = hasPermission(usuario, "productos.editar");
  const canDeleteProducts = hasPermission(usuario, "productos.eliminar");
  const canManageProducts = canCreateProducts || canEditProducts || canDeleteProducts;
  const productosColSpan = canManageProducts ? 6 : 5;
  const { data: categorias } = useListCategorias();
  
  const { data: productosResponse, isLoading } = useListProductos({
    page,
    limit: pageSize,
    busqueda: debouncedBusqueda || undefined,
    categoria_id: categoriaId,
    incluir_inactivos: true,
  } as any);

  useEffect(() => {
    setPage(1);
  }, [debouncedBusqueda, categoriaId]);

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
    <div className="max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Gestiona el catálogo de productos de INDESA.</p>
        </div>
        {canCreateProducts && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/productos/nuevo">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos por nombre o descripción..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex w-full items-center gap-2 md:w-64">
            <Filter className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
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
        <div className="grid gap-3 p-3 md:hidden">
          {showInitialSkeleton ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border bg-white p-3">
                <div className="flex gap-3">
                  <Skeleton className="h-20 w-24 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : productosPagina.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No se encontraron productos que coincidan con la búsqueda.
            </div>
          ) : (
            productosPagina.map((producto: Producto) => {
              const tarifa = getTarifaPrincipal(producto);
              const tarifas = getTarifasProducto(producto);

              return (
                <div key={producto.id} className="min-w-0 overflow-hidden rounded-md border bg-white p-3 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <div className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-md border bg-white sm:h-28 sm:w-32">
                      {producto.imagen_url ? (
                        <img
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-muted-foreground">{getInitials(producto.nombre)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 break-words text-sm font-semibold text-foreground">{producto.nombre}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{producto.descripcion || "Sin descripción"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant={producto.activo ? "success" : "secondary"} className="shrink-0">
                          {producto.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        <Badge variant="secondary" className="max-w-full truncate font-normal">{producto.categoria_nombre}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                        <span className="text-base font-semibold">{formatCurrency(tarifa.value)}</span>
                        <span className="text-xs text-muted-foreground">por {tarifa.suffix}</span>
                        {tarifas.length > 1 && <span className="text-xs text-muted-foreground">({tarifas.length} tarifas)</span>}
                      </div>
                    </div>
                  </div>
                  {canManageProducts && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {canEditProducts && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/productos/editar/${producto.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </Link>
                        </Button>
                      )}
                      {canDeleteProducts && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setProductoAEliminar(producto)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[10rem]">Imagen</TableHead>
                <TableHead className="w-[34%]">Producto</TableHead>
                <TableHead className="w-[18%]">Categoría</TableHead>
                <TableHead className="w-[12%] text-right">Precio</TableHead>
                <TableHead className="w-[12%]">Estado</TableHead>
                {canManageProducts && <TableHead className="w-[13rem] text-right">Acciones</TableHead>}
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
                      <div className="truncate font-medium text-foreground">{producto.nombre}</div>
                      <div className="truncate text-xs text-muted-foreground" title={producto.descripcion || ""}>
                        {producto.descripcion || "Sin descripción"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="max-w-full truncate font-normal">{producto.categoria_nombre}</Badge>
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
                        <div className="flex items-center justify-end gap-1">
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
              Esta acción eliminará definitivamente el producto "{productoAEliminar?.nombre}" del sistema. Si el producto ya tiene reservas registradas, se mantendrá protegido para conservar el historial.
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
