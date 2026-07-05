import { useMemo } from "react";
import { useListReservas, useGetDashboardResumen } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, DollarSign, TrendingUp, Wallet } from "lucide-react";

export function Finanzas() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
        <p className="text-muted-foreground">Control de ingresos estimados y reservas confirmadas desde la base de datos.</p>
      </div>

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
