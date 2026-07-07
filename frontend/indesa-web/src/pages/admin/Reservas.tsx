import { useListReservas, useUpdateReservaEstado, useGetReserva, getGetReservaQueryKey, ListReservasEstado, useListProductos, useCreateReserva } from "@workspace/api-client-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Phone, Mail, FileText, CheckCircle, Truck, XCircle, Clock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { invalidateCatalogData } from "@/lib/queryInvalidation";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { errorMessages } from "@/lib/errorMessages";

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
  const { usuario } = useAuth();
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
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [agregarError, setAgregarError] = useState("");
  const [agregarForm, setAgregarForm] = useState({
    cliente_nombre: "",
    cliente_email: "",
    cliente_telefono: "",
    producto_id: "",
    cantidad: "1",
    fecha_inicio: "",
    fecha_fin: "",
    tipo_tarifa: "dia",
    unidades_tarifa: "1",
    notas: "",
  });
  const canEditReservas = hasPermission(usuario, "reservas.editar");
  const reservasColSpan = canEditReservas ? 6 : 5;

  const { data: productosResponse } = useListProductos({ page: 1, limit: 100, orden: "nombre_asc" } as any);
  const productosDisponibles = useMemo(() => productosResponse?.data ?? [], [productosResponse]);
  const productoAgregar = useMemo(
    () => productosDisponibles.find((producto: any) => producto.id.toString() === agregarForm.producto_id) ?? null,
    [productosDisponibles, agregarForm.producto_id]
  );

  const createReservaMutation = useCreateReserva({
    mutation: {
      onSuccess: async () => {
        setAgregarError("");
        toast({ title: "Reserva agregada", description: "La reserva manual se registró correctamente." });
        await invalidateCatalogData(queryClient);
        await refetch();
        setIsAgregarOpen(false);
        setAgregarForm({
          cliente_nombre: "",
          cliente_email: "",
          cliente_telefono: "",
          producto_id: "",
          cantidad: "1",
          fecha_inicio: "",
          fecha_fin: "",
          tipo_tarifa: "dia",
          unidades_tarifa: "1",
          notas: "",
        });
      },
      onError: (err: any) => {
        const friendlyMessage =
          err?.response?.data?.message ||
          err?.message ||
          errorMessages.createReservation;
        setAgregarError(friendlyMessage);
        toast({
          variant: "destructive",
          title: "No fue posible registrar la reserva",
          description: friendlyMessage,
        });
      },
    },
  });

  useEffect(() => {
    if (!agregarForm.fecha_inicio) return;
    if (agregarForm.tipo_tarifa === "dia") return;

    const base = new Date(`${agregarForm.fecha_inicio}T00:00:00`);
    if (Number.isNaN(base.getTime())) return;

    const dias = Math.max(1, Number(agregarForm.unidades_tarifa || 1));
    const fechaFin = new Date(base);

    if (agregarForm.tipo_tarifa === "semana") fechaFin.setDate(fechaFin.getDate() + (dias * 7) - 1);
    if (agregarForm.tipo_tarifa === "mes") fechaFin.setMonth(fechaFin.getMonth() + dias);
    if (agregarForm.tipo_tarifa === "base") fechaFin.setDate(fechaFin.getDate() + dias - 1);

    setAgregarForm((prev) => ({ ...prev, fecha_fin: fechaFin.toISOString().slice(0, 10) }));
  }, [agregarForm.fecha_inicio, agregarForm.tipo_tarifa, agregarForm.unidades_tarifa]);

  const busquedaNormalizada = busqueda.trim();

  const { data: reservasResponse, isLoading, refetch } = useListReservas({
    page,
    limit: 15,
    estado: estadoFilter !== "todas" ? estadoFilter as ListReservasEstado : undefined,
    busqueda: busquedaNormalizada || undefined,
  } as any);

  const reservaDetalleId = reservaSeleccionada?.id ?? 0;
  const { data: reservaDetalle } = useGetReserva(reservaDetalleId, {
    query: {
      enabled: isDetalleOpen && Boolean(reservaDetalleId),
      queryKey: getGetReservaQueryKey(reservaDetalleId),
    },
  });
  const notasReserva = reservaDetalle?.notas ?? reservaSeleccionada?.notas;

  const estadoMutation = useUpdateReservaEstado({
    mutation: {
      onSuccess: async () => {
        toast({ title: "Estado actualizado", description: "La reserva se actualizó correctamente." });
        await invalidateCatalogData(queryClient);
        await refetch();
        setIsNotaOpen(false);
        setNotaEstado("");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible actualizar la reserva", description: err?.message || errorMessages.updateReservation });
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

  const resetAgregarForm = () => {
    setAgregarError("");
    setAgregarForm({
      cliente_nombre: "",
      cliente_email: "",
      cliente_telefono: "",
      producto_id: "",
      cantidad: "1",
      fecha_inicio: "",
      fecha_fin: "",
      tipo_tarifa: "dia",
      unidades_tarifa: "1",
      notas: "",
    });
  };

  const handleGuardarReservaManual = () => {
    const clienteNombre = agregarForm.cliente_nombre.trim();
    const clienteEmail = agregarForm.cliente_email.trim();
    const clienteTelefono = agregarForm.cliente_telefono.trim();
    const fechaInicio = agregarForm.fecha_inicio;
    const fechaFin = agregarForm.fecha_fin;
    const productoId = Number(agregarForm.producto_id);
    const cantidadSolicitada = Number(agregarForm.cantidad || 1);
    const unidadesTarifa = Number(agregarForm.unidades_tarifa || 1);

    if (!productoId || !clienteNombre || !clienteEmail || !clienteTelefono || !fechaInicio || !fechaFin) {
      const message = "Completa cliente, producto, teléfono, fechas y correo antes de guardar.";
      setAgregarError(message);
      toast({ variant: "destructive", title: "Faltan datos", description: message });
      return;
    }

    if (Number.isNaN(productoId) || Number.isNaN(cantidadSolicitada) || cantidadSolicitada < 1 || Number.isNaN(unidadesTarifa) || unidadesTarifa < 1) {
      const message = "La cantidad y las unidades de tarifa deben ser números válidos mayores a cero.";
      setAgregarError(message);
      toast({ variant: "destructive", title: "Datos inválidos", description: message });
      return;
    }

    if (new Date(`${fechaFin}T00:00:00`).getTime() < new Date(`${fechaInicio}T00:00:00`).getTime()) {
      const message = "La fecha final no puede ser anterior a la fecha de inicio.";
      setAgregarError(message);
      toast({ variant: "destructive", title: "Fechas inválidas", description: message });
      return;
    }

    setAgregarError("");

    createReservaMutation.mutate({
      data: {
        productoId,
        producto_id: productoId,
        clienteNombre,
        cliente_nombre: clienteNombre,
        clienteEmail,
        cliente_email: clienteEmail,
        clienteTelefono,
        cliente_telefono: clienteTelefono,
        cantidad: cantidadSolicitada,
        fechaInicio,
        fecha_inicio: fechaInicio,
        fechaFin,
        fecha_fin: fechaFin,
        tipoTarifa: agregarForm.tipo_tarifa as any,
        tipo_tarifa: agregarForm.tipo_tarifa as any,
        unidadesTarifa,
        unidades_tarifa: unidadesTarifa,
        notas: agregarForm.notas?.trim() || undefined,
        precio_unitario: precioProductoAgregar,
        total_estimado: totalAgregar,
        estado: "pendiente",
      } as any,
    });
  };

  const reservasFiltradas = reservasResponse?.data ?? [];
  const precioProductoAgregar = productoAgregar ? (productoAgregar.precio_dia || productoAgregar.precio_semana || productoAgregar.precio_mes || productoAgregar.precio || 0) : 0;
  const diasAgregar = agregarForm.fecha_inicio && agregarForm.fecha_fin
    ? Math.max(1, Math.ceil((new Date(`${agregarForm.fecha_fin}T00:00:00`).getTime() - new Date(`${agregarForm.fecha_inicio}T00:00:00`).getTime()) / 86400000) + 1)
    : 1;
  const totalAgregar = Number(agregarForm.cantidad || 1) * Number(agregarForm.unidades_tarifa || 1) * precioProductoAgregar;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between items-start gap-2 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
          <p className="text-muted-foreground">Gestiona las solicitudes de reserva de los clientes.</p>
        </div>
        {canEditReservas && (
          <Button className="gap-2" onClick={() => setIsAgregarOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, email, producto o ID..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
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
                {canEditReservas && <TableHead className="text-right">Acciones</TableHead>}
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
                    {canEditReservas && <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : reservasFiltradas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={reservasColSpan} className="h-32 text-center text-muted-foreground">
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
                    {canEditReservas && (
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
                    )}
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

      <Dialog open={isAgregarOpen} onOpenChange={setIsAgregarOpen}>
        <DialogContent
          className="max-w-3xl"
          onInteractOutside={() => {
            if (!createReservaMutation.isPending) {
              setAgregarError("");
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Agregar reserva manual</DialogTitle>
            <DialogDescription>
              Registra un apartado directamente desde administración.
            </DialogDescription>
          </DialogHeader>

          {agregarError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {agregarError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Cliente / Empresa</Label>
              <Input
                value={agregarForm.cliente_nombre}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, cliente_nombre: e.target.value }))}
                placeholder="Nombre o razón social"
              />
            </div>

            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                value={agregarForm.cliente_email}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, cliente_email: e.target.value }))}
                placeholder="correo@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={agregarForm.cliente_telefono}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, cliente_telefono: e.target.value }))}
                placeholder="502..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Producto</Label>
              <Select
                value={agregarForm.producto_id}
                onValueChange={(value) => setAgregarForm((prev) => ({ ...prev, producto_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un producto" />
                </SelectTrigger>
                <SelectContent>
                  {productosDisponibles.map((producto: any) => (
                    <SelectItem key={producto.id} value={producto.id.toString()}>
                      {producto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={agregarForm.cantidad}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, cantidad: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Modalidad</Label>
              <Select
                value={agregarForm.tipo_tarifa}
                onValueChange={(value) => setAgregarForm((prev) => ({ ...prev, tipo_tarifa: value, unidades_tarifa: "1" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Día</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="mes">Mes</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={agregarForm.fecha_inicio}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={agregarForm.fecha_fin}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, fecha_fin: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Unidades tarifa</Label>
              <Input
                type="number"
                min="1"
                value={agregarForm.unidades_tarifa}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, unidades_tarifa: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={agregarForm.notas}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, notas: e.target.value }))}
                placeholder="Detalles del apartado, condiciones o comentarios"
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            <div>Total estimado: <span className="font-semibold text-foreground">{formatCurrency(totalAgregar)}</span></div>
            <div>Días aproximados: <span className="font-semibold text-foreground">{diasAgregar}</span></div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsAgregarOpen(false);
                resetAgregarForm();
              }}
              disabled={createReservaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGuardarReservaManual}
              disabled={createReservaMutation.isPending}
            >
              {createReservaMutation.isPending ? "Guardando..." : "Guardar reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <div className="font-medium">{reservaDetalle?.producto_nombre ?? reservaSeleccionada.producto_nombre}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Cantidad solicitada: <span className="font-bold text-foreground">{reservaDetalle?.cantidad ?? reservaSeleccionada.cantidad} unidades</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Período: <span className="font-bold text-foreground">
                      {formatDateOnly(reservaDetalle?.fecha_inicio ?? reservaSeleccionada.fecha_inicio)} - {formatDateOnly(reservaDetalle?.fecha_fin ?? reservaSeleccionada.fecha_fin)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Días apartados: <span className="font-bold text-foreground">{reservaDetalle?.dias_reserva ?? reservaSeleccionada.dias_reserva ?? 1}</span>
                  </div>
                  <div className="mt-3 rounded-md border bg-white p-3 text-sm">
                    <div className="font-semibold text-foreground">Tarifa solicitada</div>
                    <div className="mt-1 text-muted-foreground">
                      Modalidad: <span className="font-bold text-foreground">{reservaDetalle?.tipo_tarifa ?? reservaSeleccionada.tipo_tarifa ?? "dia"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Períodos: <span className="font-bold text-foreground">{reservaDetalle?.unidades_tarifa ?? reservaSeleccionada.unidades_tarifa ?? reservaDetalle?.dias_reserva ?? reservaSeleccionada.dias_reserva ?? 1}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Precio unitario: <span className="font-bold text-foreground">{formatCurrency(reservaDetalle?.precio_unitario ?? reservaSeleccionada.precio_unitario ?? 0)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Total estimado: <span className="font-bold text-primary">{formatCurrency(reservaDetalle?.total_estimado ?? reservaSeleccionada.total_estimado ?? 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Notas del Cliente</h3>
                  <div className="bg-background border rounded-md p-3 text-sm min-h-[80px]">
                    {notasReserva ? notasReserva : <span className="italic text-muted-foreground">Sin notas adicionales.</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Información del Cliente</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="font-medium min-w-[80px]">Nombre:</div>
                      <div>{reservaDetalle?.cliente_nombre ?? reservaSeleccionada.cliente_nombre}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${reservaDetalle?.cliente_email ?? reservaSeleccionada.cliente_email}`} className="text-primary hover:underline">
                        {reservaDetalle?.cliente_email ?? reservaSeleccionada.cliente_email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`https://wa.me/${(reservaDetalle?.cliente_telefono ?? reservaSeleccionada.cliente_telefono).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {reservaDetalle?.cliente_telefono ?? reservaSeleccionada.cliente_telefono}
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
                    {formatDate(reservaDetalle?.created_at ?? reservaSeleccionada.created_at)}
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
