import { useListInventario, useUpdateInventario, useGetMovimientosInventario, getGetMovimientosInventarioQueryKey } from "@workspace/api-client-react";
import { useState, useRef } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search, AlertTriangle, History, ArrowDownToLine, ArrowUpToLine, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCatalogData } from "@/lib/queryInvalidation";
import { errorMessages } from "@/lib/errorMessages";

const inventarioSchema = z.object({
  cantidad: z.coerce.number().min(0, "La cantidad debe ser mayor o igual a 0"),
  stock_minimo: z.coerce.number().min(0, "El stock mínimo debe ser mayor o igual a 0"),
  motivo: z.string().min(3, "Debe especificar un motivo para el ajuste")
});

type InventarioValues = z.infer<typeof inventarioSchema>;

export function Inventario() {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | null>(null);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isAjusteOpen, setIsAjusteOpen] = useState(false);
  const canEditInventory = hasPermission(usuario, "inventario.editar");
  const inventarioColSpan = canEditInventory ? 6 : 5;
  
  const { data: inventario, isLoading } = useListInventario();

  const { data: historial, isLoading: isHistorialLoading } = useGetMovimientosInventario(
    productoSeleccionado as number,
    { query: { enabled: !!productoSeleccionado && isHistorialOpen, queryKey: getGetMovimientosInventarioQueryKey(productoSeleccionado as number) } }
  );

  const form = useForm<InventarioValues>({
    resolver: zodResolver(inventarioSchema),
    defaultValues: {
      cantidad: 0,
      stock_minimo: 0,
      motivo: "Ajuste manual de inventario",
    },
  });

  const updateMutation = useUpdateInventario({
    mutation: {
      onSuccess: async () => {
        toast({ title: "Inventario actualizado", description: "El ajuste se registró correctamente." });
        await invalidateCatalogData(queryClient);
        await queryClient.invalidateQueries({ queryKey: getGetMovimientosInventarioQueryKey(productoSeleccionado as number) });
        setIsAjusteOpen(false);
        setProductoSeleccionado(null);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible actualizar el inventario", description: err?.message || errorMessages.updateInventory });
      }
    }
  });

  const onSubmit = (data: InventarioValues) => {
    if (!productoSeleccionado) return;
    updateMutation.mutate({ 
      productoId: productoSeleccionado, 
      data: {
        cantidad: data.cantidad,
        stock_minimo: data.stock_minimo,
        motivo: data.motivo
      } 
    });
  };

  const handleOpenAjuste = (item: any) => {
    setProductoSeleccionado(item.producto_id);
    form.reset({
      cantidad: item.cantidad,
      stock_minimo: item.stock_minimo,
      motivo: "Ajuste manual de inventario"
    });
    setIsAjusteOpen(true);
  };

  const handleOpenHistorial = (id: number) => {
    setProductoSeleccionado(id);
    setIsHistorialOpen(true);
  };

  const filteredInventario = inventario?.filter(item => 
    !busqueda || 
    item.producto_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.categoria_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">Control de existencias y movimientos de almacén.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto o categoría..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="text-right">Stock Mínimo</TableHead>
                <TableHead>Estado</TableHead>
                {canEditInventory && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    {canEditInventory && <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : filteredInventario?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={inventarioColSpan} className="h-32 text-center text-muted-foreground">
                    No se encontró inventario.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventario?.map((item) => (
                  <TableRow key={item.producto_id}>
                    <TableCell className="font-medium text-foreground">
                      {item.producto_nombre}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {item.categoria_nombre}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${
                      item.cantidad <= item.stock_minimo && item.cantidad > 0 ? "text-amber-500" :
                      item.cantidad === 0 ? "text-destructive" : "text-foreground"
                    }`}>
                      {item.cantidad}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.stock_minimo}
                    </TableCell>
                    <TableCell>
                      {item.disponibilidad === "disponible" && <Badge variant="success">Disponible</Badge>}
                      {item.disponibilidad === "pocas_unidades" && <Badge variant="warning">Poco Stock</Badge>}
                      {item.disponibilidad === "agotado" && <Badge variant="destructive">Agotado</Badge>}
                    </TableCell>
                    {canEditInventory && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenAjuste(item)}>
                            Ajustar
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenHistorial(item.producto_id)} title="Historial">
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {canEditInventory && (
        <>
          {/* Modal Ajuste */}
          <Dialog open={isAjusteOpen} onOpenChange={setIsAjusteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajuste de Inventario</DialogTitle>
                <DialogDescription>
                  Actualiza las existencias actuales y el nivel mínimo de alerta.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cantidad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Actual</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stock_minimo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Mínimo (Alerta)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="motivo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo del Ajuste</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAjusteOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Modal Historial */}
          <Dialog open={isHistorialOpen} onOpenChange={setIsHistorialOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Historial de Movimientos</DialogTitle>
                <DialogDescription>
                  Registro de entradas, salidas y ajustes del producto.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Motivo / Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isHistorialLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
                    ) : historial?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay movimientos registrados.</TableCell></TableRow>
                    ) : (
                      historial?.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="text-xs">{formatDate(mov.created_at)}</TableCell>
                          <TableCell>
                            {mov.tipo === 'entrada' && <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100"><ArrowDownToLine className="mr-1 h-3 w-3" /> Entrada</Badge>}
                            {mov.tipo === 'salida' && <Badge variant="destructive" className="bg-primary/10 text-primary hover:bg-primary/10"><ArrowUpToLine className="mr-1 h-3 w-3" /> Salida</Badge>}
                            {mov.tipo === 'ajuste' && <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100"><PenTool className="mr-1 h-3 w-3" /> Ajuste</Badge>}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${mov.tipo === 'entrada' ? 'text-green-600' : mov.tipo === 'salida' ? 'text-primary' : ''}`}>
                            {mov.tipo === 'entrada' ? '+' : mov.tipo === 'salida' ? '-' : ''}{mov.cantidad}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{mov.motivo || "—"}</div>
                            <div className="text-xs text-muted-foreground">{mov.usuario_nombre}</div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

    </div>
  );
}
