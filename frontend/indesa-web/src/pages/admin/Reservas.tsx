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
import { Search, Filter, Phone, Mail, CheckCircle, Truck, XCircle, Clock, Plus, Eye, PencilLine, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReservaDisponibilidad } from "@/hooks/use-reserva-disponibilidad";
import { useReservaCalendarioDisponibilidad } from "@/hooks/use-reserva-calendario-disponibilidad";
import { ReservationDatePicker } from "@/components/reservation-date-picker";
import { getFriendlyApiErrorMessage } from "@/lib/apiErrorMessage";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { invalidateCatalogData } from "@/lib/queryInvalidation";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { errorMessages } from "@/lib/errorMessages";
import { calcularUnidadesTarifa, getTarifaPrincipal, getTarifasProducto } from "@/lib/utils";
import { apiFetch } from "@/lib/apiFetch";

function formatDateOnly(value?: string | Date | null) {
  if (!value) return "Sin fecha";
  const normalized = String(value).slice(0, 10);
  return new Date(`${normalized}T00:00:00`).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

const todayDate = new Date().toISOString().slice(0, 10);
const calendarLimitDate = (() => {
  const date = new Date(`${todayDate}T00:00:00`);
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
})();

export function Reservas() {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reservasPorPagina = 10;
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
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [reservaEditando, setReservaEditando] = useState<any>(null);
  const [editarError, setEditarError] = useState("");
  const [editarForm, setEditarForm] = useState({
    precio_unitario: "",
    descuento: "",
    notas: "",
  });
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
    precio_unitario: "",
    descuento: "",
    notas: "",
  });
  const canEditReservas = hasPermission(usuario, "reservas.editar");
  const canChangeEstadoReservas = hasPermission(usuario, "reservas.cambiar_estado");
  const esAdmin = usuario?.rol?.nombre === "admin";
  const reservasColSpan = 6;

  const { data: productosResponse } = useListProductos({ page: 1, limit: 100, orden: "nombre_asc" } as any);
  const productosDisponibles = useMemo(() => productosResponse?.data ?? [], [productosResponse]);
  const productoAgregar = useMemo(
    () => productosDisponibles.find((producto: any) => producto.id.toString() === agregarForm.producto_id) ?? null,
    [productosDisponibles, agregarForm.producto_id]
  );
  const tarifasProductoAgregar = useMemo(
    () => (productoAgregar ? getTarifasProducto(productoAgregar) : []),
    [productoAgregar]
  );
  const tarifaAgregarSeleccionada = useMemo(
    () => tarifasProductoAgregar.find((tarifa) => tarifa.tipo === agregarForm.tipo_tarifa) ?? (productoAgregar ? getTarifaPrincipal(productoAgregar) : null),
    [tarifasProductoAgregar, agregarForm.tipo_tarifa, productoAgregar]
  );
  const fechaInicioAgregar = agregarForm.fecha_inicio;
  const fechaFinAgregar = agregarForm.fecha_fin;
  const cantidadAgregarSolicitada = Number(agregarForm.cantidad || 1);
  const calendarioAgregar = useReservaCalendarioDisponibilidad({
    productoId: productoAgregar?.id,
    desde: todayDate,
    hasta: calendarLimitDate,
  });
  const disponibilidadAgregar = useReservaDisponibilidad({
    productoId: productoAgregar?.id,
    fechaInicio: fechaInicioAgregar,
    fechaFin: fechaFinAgregar,
    cantidad: cantidadAgregarSolicitada,
  });
  const fechasBloqueadasAgregar = calendarioAgregar.data?.fechasBloqueadas ?? [];
  const disponibilidadAgregarActual = disponibilidadAgregar.data;

  const createReservaMutation = useCreateReserva({
    mutation: {
      onSuccess: async () => {
        setAgregarError("");
        toast({ title: "Reserva agregada", description: "La reserva manual se registrÃ³ correctamente." });
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
          precio_unitario: "",
          descuento: "",
          notas: "",
        });
      },
      onError: (err: any) => {
        const friendlyMessage =
          err?.response?.data?.message ||
          getFriendlyApiErrorMessage(err, errorMessages.createReservation);
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
    limit: reservasPorPagina,
    estado: estadoFilter !== "todas" ? estadoFilter as ListReservasEstado : undefined,
    busqueda: busquedaNormalizada || undefined,
  } as any);
  const reservasFiltradas = useMemo(() => {
    const items = reservasResponse?.data ?? [];
    return [...items].sort((a, b) => {
      const dateA = new Date(a.created_at ?? 0).getTime();
      const dateB = new Date(b.created_at ?? 0).getTime();
      return dateB - dateA;
    });
  }, [reservasResponse]);

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
        toast({ title: "Estado actualizado", description: "La reserva se actualizÃ³ correctamente." });
        await invalidateCatalogData(queryClient);
        await refetch();
        setIsNotaOpen(false);
        setNotaEstado("");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "No fue posible actualizar la reserva", description: getFriendlyApiErrorMessage(err, errorMessages.updateReservation) });
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
    if (esAdmin && agregarForm.precio_unitario.trim() !== "") {
      const precioIngresado = Number(agregarForm.precio_unitario);
      if (!Number.isFinite(precioIngresado) || precioIngresado < 0) {
        const message = "Ingresa un precio especial válido para esta reserva.";
        setAgregarError(message);
        toast({ variant: "destructive", title: "Precio inválido", description: message });
        return;
      }
    }

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
      precio_unitario: "",
      descuento: "",
      notas: "",
    });
  };

  const setNumericField = (field: "cliente_telefono" | "cantidad" | "unidades_tarifa" | "precio_unitario" | "descuento", value: string) => {
    setAgregarForm((prev) => ({ ...prev, [field]: onlyDigits(value) }));
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
      const message = "Completa cliente, producto, telÃ©fono, fechas y correo antes de guardar.";
      setAgregarError(message);
      toast({ variant: "destructive", title: "Faltan datos", description: message });
      return;
    }

    if (Number.isNaN(productoId) || Number.isNaN(cantidadSolicitada) || cantidadSolicitada < 1 || Number.isNaN(unidadesTarifa) || unidadesTarifa < 1) {
      const message = "La cantidad y las unidades de tarifa deben ser nÃºmeros vÃ¡lidos mayores a cero.";
      setAgregarError(message);
      toast({ variant: "destructive", title: "Datos invÃ¡lidos", description: message });
      return;
    }

    if (new Date(`${fechaFin}T00:00:00`).getTime() < new Date(`${fechaInicio}T00:00:00`).getTime()) {
      const message = "La fecha final no puede ser anterior a la fecha de inicio.";
      setAgregarError(message);
      toast({ variant: "destructive", title: "Fechas invÃ¡lidas", description: message });
      return;
    }

    if (disponibilidadAgregarActual && !disponibilidadAgregarActual.permitido) {
      const message = `No hay stock suficiente para ese rango. Disponible: ${disponibilidadAgregarActual.stockDisponible}.`;
      setAgregarError(message);
      toast({ variant: "destructive", title: "Fechas no disponibles", description: message });
      return;
    }

    setAgregarError("");
    const unidadesCalculadas = calcularUnidadesTarifa(agregarForm.tipo_tarifa, fechaInicio, fechaFin, unidadesTarifa);
    const precioManual = agregarForm.precio_unitario.trim();
    const tienePrecioEspecial = esAdmin && precioManual !== "";
    const precioUnitarioBase = Number(tienePrecioEspecial ? precioManual : (tarifaAgregarSeleccionada?.value ?? 0));
    const descuento = esAdmin ? Number(agregarForm.descuento || 0) : 0;
    if (!Number.isFinite(descuento) || descuento < 0) {
      const message = "Ingresa un descuento válido para esta reserva.";
      setAgregarError(message);
      toast({ variant: "destructive", title: "Descuento inválido", description: message });
      return;
    }

    const totalCalculado = Math.max(0, (Number(cantidadSolicitada || 1) * unidadesCalculadas * precioUnitarioBase) - descuento);

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
        unidadesTarifa: unidadesCalculadas,
        unidades_tarifa: unidadesCalculadas,
        notas: agregarForm.notas?.trim() || undefined,
        ...(esAdmin ? {
          precioUnitario: precioUnitarioBase,
          precio_unitario: precioUnitarioBase,
          descuento,
          totalEstimado: totalCalculado,
          total_estimado: totalCalculado,
        } : {}),
        estado: "pendiente",
      } as any,
    });
  };

  const diasAgregar = agregarForm.fecha_inicio && agregarForm.fecha_fin
    ? Math.max(1, Math.ceil((new Date(`${agregarForm.fecha_fin}T00:00:00`).getTime() - new Date(`${agregarForm.fecha_inicio}T00:00:00`).getTime()) / 86400000) + 1)
    : 1;
  const precioAgregarVista = esAdmin && agregarForm.precio_unitario.trim() !== ""
    ? Number(agregarForm.precio_unitario)
    : (tarifaAgregarSeleccionada?.value ?? 0);
  const unidadesAgregarVista = calcularUnidadesTarifa(
    agregarForm.tipo_tarifa,
    agregarForm.fecha_inicio,
    agregarForm.fecha_fin,
    Number(agregarForm.unidades_tarifa || 1)
  );
  const descuentoAgregarVista = esAdmin ? Number(agregarForm.descuento || 0) : 0;
  const totalAgregar = Math.max(0, (Number(agregarForm.cantidad || 1) * unidadesAgregarVista * precioAgregarVista) - descuentoAgregarVista);

  const abrirEdicionReserva = (reserva: any) => {
    setReservaEditando(reserva);
    setEditarError("");
    setEditarForm({
      precio_unitario: String(reserva.precio_unitario ?? ""),
      descuento: String(reserva.descuento ?? 0),
      notas: reserva.notas ?? "",
    });
    setIsEditarOpen(true);
  };

  const guardarEdicionReserva = async () => {
    if (!reservaEditando) return;

    const precioUnitario = editarForm.precio_unitario.trim();
    if (precioUnitario === "" || Number.isNaN(Number(precioUnitario)) || Number(precioUnitario) < 0) {
      const message = "Ingresa un precio válido para la reserva.";
      setEditarError(message);
      toast({ variant: "destructive", title: "Precio inválido", description: message });
      return;
    }
    const descuento = Number(editarForm.descuento || 0);
    if (!Number.isFinite(descuento) || descuento < 0) {
      const message = "Ingresa un descuento válido para la reserva.";
      setEditarError(message);
      toast({ variant: "destructive", title: "Descuento inválido", description: message });
      return;
    }

    try {
      const response = await apiFetch(`/api/reservas/${reservaEditando.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          precioUnitario: Number(precioUnitario),
          descuento,
          notas: editarForm.notas?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "No fue posible actualizar la reserva");
      }

      toast({ title: "Reserva actualizada", description: "El precio, descuento y notas se guardaron correctamente." });
      await invalidateCatalogData(queryClient);
      await refetch();
      setIsEditarOpen(false);
      setReservaEditando(null);
    } catch (error: any) {
      const friendlyMessage = getFriendlyApiErrorMessage(error, errorMessages.updateReservation);
      setEditarError(friendlyMessage);
      toast({
        variant: "destructive",
        title: "No fue posible actualizar la reserva",
        description: friendlyMessage,
      });
    }
  };

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
                    <TableCell className="text-right">
                      <div className="ml-auto flex justify-end gap-1.5">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        {esAdmin && <Skeleton className="h-9 w-9 rounded-md" />}
                        {canChangeEstadoReservas && <Skeleton className="h-9 w-9 rounded-md" />}
                      </div>
                    </TableCell>
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
                        Cant: {reserva.cantidad} unid. Â· {reserva.dias_reserva ?? 1} dÃ­a{(reserva.dias_reserva ?? 1) === 1 ? "" : "s"}
                      </div>
                      <div className="text-xs font-medium text-primary">
                        {reserva.tipo_tarifa ?? "dia"} x {reserva.unidades_tarifa ?? reserva.dias_reserva ?? 1} Â· {formatCurrency(reserva.total_estimado ?? 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateOnly(reserva.fecha_inicio)} - {formatDateOnly(reserva.fecha_fin)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={reserva.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Button variant="ghost" size="icon" onClick={() => verDetalle(reserva)} aria-label="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {esAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => abrirEdicionReserva(reserva)} aria-label="Editar reserva">
                            <PencilLine className="h-4 w-4" />
                          </Button>
                        )}
                        {canChangeEstadoReservas && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={reserva.estado === 'entregada' || reserva.estado === 'cancelada'}
                                aria-label="Cambiar estado"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                              <DropdownMenuSeparator />
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
                                    <Truck className="mr-2 h-4 w-4 text-success" /> Marcar entregada
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCambiarEstado(reserva.id, 'cancelada', true)}>
                                    <XCircle className="mr-2 h-4 w-4 text-destructive" /> Cancelar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
              Mostrando {((page - 1) * reservasPorPagina) + 1} a {Math.min(page * reservasPorPagina, reservasResponse.total)} de {reservasResponse.total} reservas
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
                disabled={page * reservasPorPagina >= reservasResponse.total}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isAgregarOpen} onOpenChange={setIsAgregarOpen}>
        <DialogContent
          className="w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] max-w-3xl overflow-y-auto overscroll-contain p-4 sm:p-6"
          onInteractOutside={() => {
            if (!createReservaMutation.isPending) {
              setAgregarError("");
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Agregar reserva manual</DialogTitle>
            <DialogDescription>
              Registra un apartado directamente desde administraciÃ³n.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAgregarForm}
              disabled={createReservaMutation.isPending}
            >
              Limpiar formulario
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const hoy = new Date().toISOString().slice(0, 10);
                setAgregarForm((prev) => ({
                  ...prev,
                  fecha_inicio: hoy,
                  fecha_fin: hoy,
                }));
              }}
              disabled={createReservaMutation.isPending}
            >
              Usar fecha de hoy
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              Los campos numÃ©ricos aceptan solo nÃºmeros.
            </div>
          </div>

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
                placeholder="Nombre o razÃ³n social"
              />
            </div>

            <div className="space-y-2">
              <Label>Correo electrÃ³nico</Label>
              <Input
                type="email"
                value={agregarForm.cliente_email}
                onChange={(e) => setAgregarForm((prev) => ({ ...prev, cliente_email: e.target.value }))}
                placeholder="correo@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label>TelÃ©fono</Label>
              <Input
                value={agregarForm.cliente_telefono}
                onChange={(e) => setNumericField("cliente_telefono", e.target.value)}
                placeholder="Solo nÃºmeros"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Producto</Label>
              <Select
                value={agregarForm.producto_id}
                onValueChange={(value) => setAgregarForm((prev) => ({ ...prev, producto_id: value, precio_unitario: "", descuento: "" }))}
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
                type="text"
                min="1"
                inputMode="numeric"
                pattern="[0-9]*"
                value={agregarForm.cantidad}
                onChange={(e) => setNumericField("cantidad", e.target.value)}
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
                  <SelectItem value="dia">DÃ­a</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="mes">Mes</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <ReservationDatePicker
                label=""
                value={agregarForm.fecha_inicio}
                onChange={(value) => setAgregarForm((prev) => ({ ...prev, fecha_inicio: value }))}
                minDate={todayDate}
                blockedDates={fechasBloqueadasAgregar}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <ReservationDatePicker
                label=""
                value={agregarForm.fecha_fin}
                onChange={(value) => setAgregarForm((prev) => ({ ...prev, fecha_fin: value }))}
                minDate={agregarForm.fecha_inicio || todayDate}
                blockedDates={fechasBloqueadasAgregar}
              />
            </div>

            <div className="space-y-2">
              <Label>Unidades tarifa</Label>
              <Input
                type="text"
                min="1"
                inputMode="numeric"
                pattern="[0-9]*"
                value={agregarForm.unidades_tarifa}
                onChange={(e) => setNumericField("unidades_tarifa", e.target.value)}
              />
            </div>

            {esAdmin && (
              <>
                <div className="space-y-2">
                  <Label>Precio unitario especial</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={agregarForm.precio_unitario}
                    onChange={(e) => {
                      const numeric = e.target.value.replace(/[^\d.]/g, "");
                      setAgregarForm((prev) => ({ ...prev, precio_unitario: numeric }));
                    }}
                    placeholder="Opcional para precio interno"
                  />
                  <div className="text-xs text-muted-foreground">
                    Solo el administrador puede ajustar este valor.
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descuento</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={agregarForm.descuento}
                    onChange={(e) => {
                      const numeric = e.target.value.replace(/[^\d.]/g, "");
                      setAgregarForm((prev) => ({ ...prev, descuento: numeric }));
                    }}
                    placeholder="0.00"
                  />
                  <div className="text-xs text-muted-foreground">
                    Se resta del total estimado y queda registrado en el reporte.
                  </div>
                </div>
              </>
            )}

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
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
              <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">Vista previa</span>
              <span>La reserva se guardarÃ¡ con los datos ingresados</span>
            </div>
            {esAdmin && (
              <div>Descuento: <span className="font-semibold text-foreground">{formatCurrency(descuentoAgregarVista || 0)}</span></div>
            )}
            <div>Total estimado: <span className="font-semibold text-foreground">{formatCurrency(totalAgregar)}</span></div>
            <div>DÃ­as aproximados: <span className="font-semibold text-foreground">{diasAgregar}</span></div>
          </div>
          {disponibilidadAgregarActual && !disponibilidadAgregarActual.permitido ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
              No hay stock suficiente para esas fechas. Disponible: {disponibilidadAgregarActual.stockDisponible}.
            </div>
          ) : null}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
              disabled={createReservaMutation.isPending || disponibilidadAgregar.isFetching}
              className="gap-2 w-full sm:w-auto"
            >
              {createReservaMutation.isPending || disponibilidadAgregar.isFetching ? "Validando..." : "Guardar reserva"}
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
                    PerÃ­odo: <span className="font-bold text-foreground">
                      {formatDateOnly(reservaDetalle?.fecha_inicio ?? reservaSeleccionada.fecha_inicio)} - {formatDateOnly(reservaDetalle?.fecha_fin ?? reservaSeleccionada.fecha_fin)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    DÃ­as apartados: <span className="font-bold text-foreground">{reservaDetalle?.dias_reserva ?? reservaSeleccionada.dias_reserva ?? 1}</span>
                  </div>
                  <div className="mt-3 rounded-md border bg-white p-3 text-sm">
                    <div className="font-semibold text-foreground">Tarifa solicitada</div>
                    <div className="mt-1 text-muted-foreground">
                      Modalidad: <span className="font-bold text-foreground">{reservaDetalle?.tipo_tarifa ?? reservaSeleccionada.tipo_tarifa ?? "dia"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      PerÃ­odos: <span className="font-bold text-foreground">{reservaDetalle?.unidades_tarifa ?? reservaSeleccionada.unidades_tarifa ?? reservaDetalle?.dias_reserva ?? reservaSeleccionada.dias_reserva ?? 1}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Precio unitario: <span className="font-bold text-foreground">{formatCurrency(reservaDetalle?.precio_unitario ?? reservaSeleccionada.precio_unitario ?? 0)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Descuento: <span className="font-bold text-foreground">{formatCurrency((reservaDetalle as any)?.descuento ?? reservaSeleccionada.descuento ?? 0)}</span>
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
                  <h3 className="font-semibold mb-3">InformaciÃ³n del Cliente</h3>
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

      <Dialog
        open={isEditarOpen}
        onOpenChange={(open) => {
          setIsEditarOpen(open);
          if (!open) {
            setReservaEditando(null);
            setEditarError("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar reserva</DialogTitle>
            <DialogDescription>
              Ajusta el precio interno y las notas de esta reserva.
            </DialogDescription>
          </DialogHeader>

          {editarError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {editarError}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{reservaEditando?.producto_nombre}</div>
              <div className="text-muted-foreground">
                Cliente: {reservaEditando?.cliente_nombre} · ID #{String(reservaEditando?.id ?? "").padStart(5, "0")}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Precio unitario</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editarForm.precio_unitario}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/[^\d.]/g, "");
                    setEditarForm((prev) => ({ ...prev, precio_unitario: numeric }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Descuento</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editarForm.descuento}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/[^\d.]/g, "");
                    setEditarForm((prev) => ({ ...prev, descuento: numeric }));
                  }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Total estimado</Label>
                <Input
                  value={formatCurrency(
                    Math.max(0,
                      (Number(editarForm.precio_unitario || reservaEditando?.precio_unitario || 0)
                      * Number(reservaEditando?.cantidad ?? 1)
                      * Number(reservaEditando?.unidades_tarifa ?? reservaEditando?.dias_reserva ?? 1))
                      - Number(editarForm.descuento || 0)
                    )
                  )}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={editarForm.notas}
                onChange={(e) => setEditarForm((prev) => ({ ...prev, notas: e.target.value }))}
                placeholder="Observaciones internas o acuerdos especiales"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditarOpen(false);
                setReservaEditando(null);
                setEditarError("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={guardarEdicionReserva}
              disabled={!reservaEditando}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Nota de Estado (ej. CancelaciÃ³n) */}
      <Dialog open={isNotaOpen} onOpenChange={setIsNotaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cambio de Estado</DialogTitle>
            <DialogDescription>
              Â¿EstÃ¡ seguro de cambiar el estado a <strong className="uppercase">{nuevoEstado?.estado}</strong>?
              Puede aÃ±adir una nota explicando el motivo (opcional).
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Nota (visible internamente)</label>
            <Textarea 
              value={notaEstado}
              onChange={(e) => setNotaEstado(e.target.value)}
              placeholder="Ej. Cliente solicitÃ³ cancelaciÃ³n por telÃ©fono..."
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

