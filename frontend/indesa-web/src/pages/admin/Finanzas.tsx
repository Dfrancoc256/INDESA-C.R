import { useEffect, useMemo, useState } from "react";
import { useListReservas, useGetDashboardResumen } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarRange, CreditCard, DollarSign, FileDown, TrendingUp, Wallet, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";

function getMonthStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function normalizarEstado(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function estaEnRango(dateString: string | Date | null | undefined, desde: string, hasta: string) {
  if (!dateString) return false;
  const value = new Date(dateString).getTime();
  const start = new Date(`${desde}T00:00:00`).getTime();
  const end = new Date(`${hasta}T23:59:59.999`).getTime();
  if ([value, start, end].some(Number.isNaN)) return false;
  return value >= start && value <= end;
}

const pageSize = 10;

export function Finanzas() {
  const { toast } = useToast();
  const [desde, setDesde] = useState(getMonthStart());
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [pagadasPage, setPagadasPage] = useState(1);
  const [canceladasPage, setCanceladasPage] = useState(1);
  const { data: resumen, isLoading: isLoadingResumen } = useGetDashboardResumen();
  const { data: reservasResponse, isLoading: isLoadingReservas } = useListReservas({ page: 1, limit: 1000 });

  const reservas = reservasResponse?.data ?? [];
  const reservasDelRango = useMemo(() => {
    return reservas
      .filter((reserva) => estaEnRango(reserva.created_at, desde, hasta))
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return Number(b.id ?? 0) - Number(a.id ?? 0);
      });
  }, [reservas, desde, hasta]);

  const totales = useMemo(() => {
    return reservasDelRango.reduce(
      (acc, reserva) => {
        const monto = Number(reserva.total_estimado ?? 0);
        const estado = normalizarEstado(reserva.estado);
        const estadoPago = normalizarEstado((reserva as any).estado_pago);
        const cancelada = estado === "cancelada" || estado === "cancelado";

        if (cancelada) {
          acc.cancelado += monto;
          acc.canceladas += 1;
          return acc;
        }

        acc.total += monto;
        if (estadoPago === "pagada") acc.pagado += monto;
        if (estadoPago !== "pagada") acc.pendientePago += monto;
        return acc;
      },
      { total: 0, pagado: 0, pendientePago: 0, cancelado: 0, canceladas: 0 },
    );
  }, [reservasDelRango]);

  const reservasPagadas = reservasDelRango.filter((reserva) => normalizarEstado((reserva as any).estado_pago) === "pagada" && !["cancelada", "cancelado"].includes(normalizarEstado(reserva.estado)));
  const reservasCanceladas = reservasDelRango.filter((reserva) => ["cancelada", "cancelado"].includes(normalizarEstado(reserva.estado)));
  const pagadasTotalPages = Math.max(1, Math.ceil(reservasPagadas.length / pageSize));
  const canceladasTotalPages = Math.max(1, Math.ceil(reservasCanceladas.length / pageSize));
  const reservasPagadasPagina = reservasPagadas.slice((pagadasPage - 1) * pageSize, pagadasPage * pageSize);
  const reservasCanceladasPagina = reservasCanceladas.slice((canceladasPage - 1) * pageSize, canceladasPage * pageSize);

  useEffect(() => {
    setPagadasPage(1);
    setCanceladasPage(1);
  }, [desde, hasta]);

  useEffect(() => {
    setPagadasPage((current) => Math.min(current, pagadasTotalPages));
  }, [pagadasTotalPages]);

  useEffect(() => {
    setCanceladasPage((current) => Math.min(current, canceladasTotalPages));
  }, [canceladasTotalPages]);

  const descargarReporte = async () => {
    if (!desde || !hasta) {
      toast({
        variant: "destructive",
        title: "Faltan fechas",
        description: "Selecciona una fecha inicial y una fecha final para generar el reporte.",
      });
      return;
    }

    if (new Date(`${hasta}T00:00:00`).getTime() < new Date(`${desde}T00:00:00`).getTime()) {
      toast({
        variant: "destructive",
        title: "Rango inválido",
        description: "La fecha final no puede ser anterior a la fecha inicial.",
      });
      return;
    }

    try {
      const response = await apiFetch(`/api/reservas/reporte?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "No fue posible descargar el reporte.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/i);
      const filename = filenameMatch?.[1] ?? `reporte-reservas-${desde}-a-${hasta}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }, 0);

      toast({
        title: "Reporte descargado",
        description: "El archivo se generó correctamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "No fue posible descargar el reporte",
        description: error?.message ?? "Intenta nuevamente en unos momentos.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
        <p className="text-muted-foreground">Control de ingresos estimados y reservas confirmadas desde la base de datos.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CalendarRange className="h-4 w-4 text-primary" />
                Fecha inicial
              </label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CalendarRange className="h-4 w-4 text-primary" />
                Fecha final
              </label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>
          <Button className="gap-2 md:w-auto" onClick={descargarReporte}>
            <FileDown className="h-4 w-4" />
            Descargar Excel
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Ingresos estimados" value={totales.total} icon={DollarSign} />
        <MetricCard title="Pagadas" value={totales.pagado} icon={TrendingUp} />
        <MetricCard title="Pendientes de pago" value={totales.pendientePago} icon={Wallet} />
        <MetricCard title="Canceladas" value={totales.cancelado} icon={CreditCard} caption={`${totales.canceladas} reserva${totales.canceladas === 1 ? "" : "s"}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Reservas pagadas</CardTitle>
            <CardDescription>
              Solo muestra registros confirmados como pagados en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReservas ? (
              <div className="h-[260px] space-y-2 overflow-hidden">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : reservasPagadas.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed p-8 text-center text-muted-foreground">
                Aún no hay reservas marcadas como pagadas.
              </div>
            ) : (
              <div>
                <div className="grid h-[260px] gap-3 overflow-auto pr-2 md:hidden">
                  {reservasPagadasPagina.map((reserva) => (
                    <div key={reserva.id} className="rounded-md border bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{reserva.cliente_nombre}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(reserva.created_at)}</div>
                        </div>
                        <div className="shrink-0 font-semibold text-primary">{formatCurrency(Number(reserva.total_estimado ?? 0))}</div>
                      </div>
                      <div className="mt-2 line-clamp-2 font-medium">{reserva.producto_nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {reserva.tipo_tarifa ?? "dia"} · {reserva.dias_reserva ?? 1} día{(reserva.dias_reserva ?? 1) === 1 ? "" : "s"}
                      </div>
                      <Badge variant="success" className="mt-2 capitalize">
                        {(reserva as any).metodo_pago ? `Pagada · ${(reserva as any).metodo_pago}` : "Pagada"}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="hidden h-[260px] overflow-auto pr-2 md:block">
                  <Table className="w-full table-fixed">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead className="w-[27%]">Cliente</TableHead>
                        <TableHead className="w-[31%]">Producto</TableHead>
                        <TableHead className="w-[25%]">Pago</TableHead>
                        <TableHead className="w-[17%] text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservasPagadasPagina.map((reserva) => (
                        <TableRow key={reserva.id}>
                          <TableCell>
                            <div className="truncate font-medium">{reserva.cliente_nombre}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(reserva.created_at)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate font-medium">{reserva.producto_nombre}</div>
                            <div className="text-xs text-muted-foreground">
                              {reserva.tipo_tarifa ?? "dia"} · {reserva.dias_reserva ?? 1} día{(reserva.dias_reserva ?? 1) === 1 ? "" : "s"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="success" className="capitalize">
                              {(reserva as any).metodo_pago ? `Pagada · ${(reserva as any).metodo_pago}` : "Pagada"}
                            </Badge>
                            {(reserva as any).fecha_pago && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {formatDate((reserva as any).fecha_pago)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(Number(reserva.total_estimado ?? 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationFooter
                  page={pagadasPage}
                  totalPages={pagadasTotalPages}
                  total={reservasPagadas.length}
                  label="reservas pagadas"
                  onPrevious={() => setPagadasPage((value) => Math.max(1, value - 1))}
                  onNext={() => setPagadasPage((value) => Math.min(pagadasTotalPages, value + 1))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>Datos de control listos para revisión interna.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingResumen ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground">Productos activos</div>
                  <div className="text-2xl font-bold">{resumen?.total_productos ?? 0}</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground">Reservas pendientes</div>
                  <div className="text-2xl font-bold">{resumen?.reservas_pendientes ?? 0}</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground">Monto total estimado</div>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(totales.total)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservas canceladas</CardTitle>
          <CardDescription>
            Muestra las solicitudes canceladas dentro del rango seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReservas ? (
            <div className="h-[300px] space-y-2 overflow-hidden">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : reservasCanceladas.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed p-8 text-center text-muted-foreground">
              No hay reservas canceladas en este rango.
            </div>
          ) : (
            <div>
              <div className="grid h-[300px] gap-3 overflow-auto pr-2 md:hidden">
                {reservasCanceladasPagina.map((reserva) => (
                  <div key={reserva.id} className="rounded-md border bg-white p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{reserva.cliente_nombre}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(reserva.created_at)}</div>
                      </div>
                      <div className="shrink-0 font-semibold">{formatCurrency(Number(reserva.total_estimado ?? 0))}</div>
                    </div>
                    <div className="mt-2 line-clamp-2 font-medium">{reserva.producto_nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {reserva.tipo_tarifa ?? "dia"} · {reserva.dias_reserva ?? 1} día{(reserva.dias_reserva ?? 1) === 1 ? "" : "s"}
                    </div>
                    <Badge variant="destructive" className="mt-2 gap-1">
                      <XCircle className="h-3 w-3" />
                      Cancelada
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="hidden h-[300px] overflow-auto pr-2 md:block">
                <Table className="w-full table-fixed">
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-[30%]">Cliente</TableHead>
                      <TableHead className="w-[35%]">Producto</TableHead>
                      <TableHead className="w-[18%]">Estado</TableHead>
                      <TableHead className="w-[17%] text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservasCanceladasPagina.map((reserva) => (
                      <TableRow key={reserva.id}>
                        <TableCell>
                          <div className="truncate font-medium">{reserva.cliente_nombre}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(reserva.created_at)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="truncate font-medium">{reserva.producto_nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {reserva.tipo_tarifa ?? "dia"} · {reserva.dias_reserva ?? 1} día{(reserva.dias_reserva ?? 1) === 1 ? "" : "s"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Cancelada
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(Number(reserva.total_estimado ?? 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationFooter
                page={canceladasPage}
                totalPages={canceladasTotalPages}
                total={reservasCanceladas.length}
                label="reservas canceladas"
                onPrevious={() => setCanceladasPage((value) => Math.max(1, value - 1))}
                onNext={() => setCanceladasPage((value) => Math.min(canceladasTotalPages, value + 1))}
              />
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function PaginationFooter({
  page,
  totalPages,
  total,
  label,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} {label}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={onPrevious}>
          Anterior
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  caption,
}: {
  title: string;
  value: number;
  icon: any;
  caption?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(value)}</div>
        {caption && <div className="mt-1 text-xs text-muted-foreground">{caption}</div>}
      </CardContent>
    </Card>
  );
}
