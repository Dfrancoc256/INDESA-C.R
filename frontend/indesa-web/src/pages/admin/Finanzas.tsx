import { useMemo, useState } from "react";
import { useListReservas, useGetDashboardResumen } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarRange, CreditCard, DollarSign, FileDown, TrendingUp, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";

function getMonthStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

export function Finanzas() {
  const { toast } = useToast();
  const [desde, setDesde] = useState(getMonthStart());
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const { data: resumen, isLoading: isLoadingResumen } = useGetDashboardResumen();
  const { data: reservasResponse, isLoading: isLoadingReservas } = useListReservas({ page: 1, limit: 100 });

  const reservas = reservasResponse?.data ?? [];
  const totales = useMemo(() => {
    return reservas.reduce(
      (acc, reserva) => {
        const monto = Number(reserva.total_estimado ?? 0);
        acc.total += monto;
        if (reserva.estado === "confirmada") acc.confirmado += monto;
        if (reserva.estado === "pendiente") acc.pendiente += monto;
        if (reserva.estado === "cancelada") acc.cancelado += monto;
        return acc;
      },
      { total: 0, confirmado: 0, pendiente: 0, cancelado: 0 },
    );
  }, [reservas]);

  const reservasPagadas = reservas.filter((reserva) => reserva.estado === "confirmada" || reserva.estado === "entregada");

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
      const filename = filenameMatch?.[1] ?? `reporte-reservas-${desde}-a-${hasta}.xls`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

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
        <MetricCard title="Confirmadas" value={totales.confirmado} icon={TrendingUp} />
        <MetricCard title="Pendientes" value={totales.pendiente} icon={Wallet} />
        <MetricCard title="Canceladas" value={totales.cancelado} icon={CreditCard} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Reservas con valor monetario</CardTitle>
            <CardDescription>
              Solo usa registros guardados en el sistema para controlar el dinero.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReservas ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : reservasPagadas.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                Aún no hay reservas confirmadas para registrar ingresos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservasPagadas.map((reserva) => (
                      <TableRow key={reserva.id}>
                        <TableCell>
                          <div className="font-medium">{reserva.cliente_nombre}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(reserva.created_at)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{reserva.producto_nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {reserva.tipo_tarifa ?? "dia"} · {reserva.dias_reserva ?? 1} día{(reserva.dias_reserva ?? 1) === 1 ? "" : "s"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={reserva.estado === "entregada" ? "success" : "info"} className="capitalize">
                            {reserva.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(Number(reserva.total_estimado ?? 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: any;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(value)}</div>
      </CardContent>
    </Card>
  );
}
