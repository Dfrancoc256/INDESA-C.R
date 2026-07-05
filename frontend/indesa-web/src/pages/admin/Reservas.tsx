import { useListReservas, useUpdateReservaEstado, ListReservasEstado } from "@workspace/api-client-react";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Phone, Mail, FileText, CheckCircle, Truck, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { invalidateCatalogData } from "@/lib/queryInvalidation";

function formatDateOnly(value?: string | Date | null) {
  if (!value) return "Sin fecha";
  const normalized = String(value).slice(0, 10);
  return new Date(`${normalized}T00:00:00`).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Reservas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState("");
  
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null);
  
  const [isNotaOpen, setIsNotaOpen] = useState(false);
  const [notaEstado, setNotaEstado] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState<any>(null);

  const { data: reservasResponse, isLoading, refetch } = useListReservas({
    page,
    limit: 15,
    estado: estadoFilter !== "todas" ? estadoFilter as ListReservasEstado : undefined,
  });

  const estadoMutation = useUpdateReservaEstado({
    mutation: {
      onSuccess: async () => {
        toast({ title: "Estado actualizado", description: "La reserva ha cambiado de estado exitosamente." });
        await invalidateCatalogData(queryClient);
        await refetch();
        setIsNotaOpen(false);
        setNotaEstado("");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.message || "No se pudo actualizar el estado." });
      }
    }
  });

  const handleCambiarEstado = (id: number, estado: string, requiereNota: boolean = false) => {
    if (requiereNota) {
      setNuevoEstado({ id, estado });
      setIsNotaOpen(true);
      return;
    }
    
    estadoMutation.mutate({ 
      id, 
      data: { estado: estado as any } 
    });
  };

  const confirmarCambioEstado = () => {
    if (nuevoEstado) {
      estadoMutation.mutate({ 
        id: nuevoEstado.id, 
        data: { estado: nuevoEstado.estado as any, notas: notaEstado } 
      });
    }
  };

  const verDetalle = (reserva: any) => {
    setReservaSeleccionada(reserva);
    setIsDetalleOpen(true);
  };

  // Filtrado cliente side para búsqueda simple (idealmente sería server-side)
  const reservasFiltradas = reservasResponse?.data?.filter(r => 
    !busqueda || 
    r.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.cliente_email.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.producto_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.id.toString().includes(busqueda)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
        <p className="text-muted-foreground">Gestiona las solicitudes de reserva de los clientes.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, email, producto o ID..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={estadoFilter} 
              onValueChange={(val) => {
                setEstadoFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="confirmada">Confirmadas</SelectItem>
                <SelectItem value="entregada">Entregadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
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
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24 mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-16 mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : reservasFiltradas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No se encontraron reservas.
                  </TableCell>
                </TableRow>
              ) : (
                reservasFiltradas?.map((reserva) => (
                  <TableRow key={reserva.id}>
                    <TableCell className="font-mono text-xs">#{reserva.id.toString().padStart(5, '0')}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(reserva.created_at).toLocaleDateString("es-GT", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{reserva.cliente_nombre}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{reserva.cliente_telefono}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm truncate max-w-[250px]">{reserva.producto_nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        Cant: {reserva.cantidad} unid. · {reserva.dias_reserva ?? 1} día{(reserva.dias_reserva ?? 1) === 1 ? "" : "s"}
                      </div>
                      <div className="text-xs font-medium text-primary">
                        {reserva.tipo_tarifa ?? "dia"} x {reserva.unidades_tarifa ?? reserva.dias_reserva ?? 1} · {formatCurrency(reserva.total_estimado ?? 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateOnly(reserva.fecha_inicio)} - {formatDateOnly(reserva.fecha_fin)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={reserva.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => verDetalle(reserva)}>
                          Ver Detalle
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={reserva.estado === 'entregada' || reserva.estado === 'cancelada'}>
                              Cambiar Estado
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {reserva.estado === 'pendiente' && (
                              <>
                                <DropdownMenuItem onClick={() => handleCambiarEstado(reserva.id, 'confirmada')}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-info" /> Confirmar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCambiarEstado(reserva.id, 'cancelada', true)}>
                                  <XCircle className="mr-2 h-4 w-4 text-destructive" /> Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                            {reserva.estado === 'confirmada' && (
                              <>
                                <DropdownMenuItem onClick={() => handleCambiarEstado(reserva.id, 'entregada')}>
                                  <Truck className="mr-2 h-4 w-4 text-success" /> Marcar Entregada
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCambiarEstado(reserva.id, 'cancelada', true)}>
                                  <XCircle className="mr-2 h-4 w-4 text-destructive" /> Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {reservasResponse && reservasResponse.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * 15) + 1} a {Math.min(page * 15, reservasResponse.total)} de {reservasResponse.total} reservas
            </div>
            <div className="flex gap-2">
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
                disabled={page * 15 >= reservasResponse.total}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalle */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-8">
              <span>Detalle de Reserva #{reservaSeleccionada?.id.toString().padStart(5, '0')}</span>
              {reservaSeleccionada && <EstadoBadge estado={reservaSeleccionada.estado} />}
            </DialogTitle>
          </DialogHeader>
          
          {reservaSeleccionada && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" /> Producto Reservado
                  </h3>
                  <div className="font-medium">{reservaSeleccionada.producto_nombre}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Cantidad solicitada: <span className="font-bold text-foreground">{reservaSeleccionada.cantidad} unidades</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Período: <span className="font-bold text-foreground">
                      {formatDateOnly(reservaSeleccionada.fecha_inicio)} - {formatDateOnly(reservaSeleccionada.fecha_fin)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Días apartados: <span className="font-bold text-foreground">{reservaSeleccionada.dias_reserva ?? 1}</span>
                  </div>
                  <div className="mt-3 rounded-md border bg-white p-3 text-sm">
                    <div className="font-semibold text-foreground">Tarifa solicitada</div>
                    <div className="mt-1 text-muted-foreground">
                      Modalidad: <span className="font-bold text-foreground">{reservaSeleccionada.tipo_tarifa ?? "dia"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Períodos: <span className="font-bold text-foreground">{reservaSeleccionada.unidades_tarifa ?? reservaSeleccionada.dias_reserva ?? 1}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Precio unitario: <span className="font-bold text-foreground">{formatCurrency(reservaSeleccionada.precio_unitario ?? 0)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Total estimado: <span className="font-bold text-primary">{formatCurrency(reservaSeleccionada.total_estimado ?? 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Notas del Cliente</h3>
                  <div className="bg-background border rounded-md p-3 text-sm min-h-[80px]">
                    {reservaSeleccionada.notas || <span className="italic text-muted-foreground">Sin notas adicionales.</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Información del Cliente</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="font-medium min-w-[80px]">Nombre:</div>
                      <div>{reservaSeleccionada.cliente_nombre}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${reservaSeleccionada.cliente_email}`} className="text-primary hover:underline">
                        {reservaSeleccionada.cliente_email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`https://wa.me/${reservaSeleccionada.cliente_telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {reservaSeleccionada.cliente_telefono}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span>Fecha de solicitud:</span>
                  </div>
                  <div className="text-sm font-medium pl-6">
                    {formatDate(reservaSeleccionada.created_at)}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDetalleOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Nota de Estado (ej. Cancelación) */}
      <Dialog open={isNotaOpen} onOpenChange={setIsNotaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cambio de Estado</DialogTitle>
            <DialogDescription>
              ¿Está seguro de cambiar el estado a <strong className="uppercase">{nuevoEstado?.estado}</strong>?
              Puede añadir una nota explicando el motivo (opcional).
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Nota (visible internamente)</label>
            <Textarea 
              value={notaEstado}
              onChange={(e) => setNotaEstado(e.target.value)}
              placeholder="Ej. Cliente solicitó cancelación por teléfono..."
              className="resize-none"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsNotaOpen(false)}>Cancelar</Button>
            <Button 
              variant={nuevoEstado?.estado === 'cancelada' ? "destructive" : "default"}
              onClick={confirmarCambioEstado}
              disabled={estadoMutation.isPending}
            >
              {estadoMutation.isPending ? "Guardando..." : "Confirmar Cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Icono simple para el Detalle
function Package(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  switch (estado) {
    case 'pendiente': return <Badge variant="warning" className="flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> Pendiente</Badge>;
    case 'confirmada': return <Badge variant="info" className="flex items-center gap-1 w-fit bg-blue-600 hover:bg-blue-700 text-white"><CheckCircle className="h-3 w-3" /> Confirmada</Badge>;
    case 'entregada': return <Badge variant="success" className="flex items-center gap-1 w-fit"><Truck className="h-3 w-3" /> Entregada</Badge>;
    case 'cancelada': return <Badge variant="destructive" className="flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" /> Cancelada</Badge>;
    default: return <Badge variant="outline">{estado}</Badge>;
  }
}
