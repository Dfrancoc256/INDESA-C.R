import { useGetDashboardResumen, useGetReservasRecientes, useGetProductosStockBajo } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Calendar, Users, AlertTriangle, PackageX, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";

export function Dashboard() {
  const { data: resumen, isLoading: isLoadingResumen } = useGetDashboardResumen();
  const { data: reservasRecientes, isLoading: isLoadingReservas } = useGetReservasRecientes();
  const { data: stockBajo, isLoading: isLoadingStock } = useGetProductosStockBajo();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de actividad y estado del sistema.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Productos" 
          value={resumen?.total_productos} 
          icon={Package} 
          isLoading={isLoadingResumen}
          description="En catálogo"
        />
        <MetricCard 
          title="Reservas Pendientes" 
          value={resumen?.reservas_pendientes} 
          icon={Calendar} 
          iconColor="text-amber-500"
          isLoading={isLoadingResumen}
          description="Requieren atención"
        />
        <MetricCard 
          title="Total Usuarios" 
          value={resumen?.total_usuarios} 
          icon={Users} 
          isLoading={isLoadingResumen}
          description="Usuarios registrados"
        />
        <MetricCard 
          title="Productos Agotados" 
          value={resumen?.productos_agotados} 
          icon={PackageX} 
          iconColor="text-destructive"
          isLoading={isLoadingResumen}
          description="Sin inventario"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Reservations */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Reservas Recientes</CardTitle>
            <CardDescription>
              Las últimas reservas realizadas por clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReservas ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : reservasRecientes?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay reservas recientes
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservasRecientes?.map((reserva) => (
                      <TableRow key={reserva.id}>
                        <TableCell className="font-medium">
                          {reserva.cliente_nombre}
                          <div className="text-xs text-muted-foreground font-normal">{reserva.cliente_email}</div>
                        </TableCell>
                        <TableCell>
                          {reserva.producto_nombre}
                          <div className="text-xs text-muted-foreground font-normal">
                            Cant: {reserva.cantidad} · {reserva.dias_reserva ?? 1} día{(reserva.dias_reserva ?? 1) === 1 ? "" : "s"}
                          </div>
                          <div className="text-xs font-medium text-primary">
                            {reserva.tipo_tarifa ?? "dia"} · {formatCurrency(reserva.total_estimado ?? 0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={reserva.estado} />
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDate(reserva.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas de Stock
            </CardTitle>
            <CardDescription>
              Productos por debajo del mínimo requerido
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStock ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : stockBajo?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-2 opacity-50" />
                <p className="text-muted-foreground">El inventario está en niveles óptimos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stockBajo?.map((item) => (
                  <div key={item.producto_id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <Link href={`/admin/inventario?producto=${item.producto_id}`} className="font-medium hover:text-primary transition-colors">
                        {item.producto_nombre}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">Mínimo: {item.stock_minimo}</span>
                        <DisponibilidadBadge disponibilidad={item.disponibilidad} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-destructive">{item.cantidad}</div>
                      <div className="text-xs text-muted-foreground">disponibles</div>
                    </div>
                  </div>
                ))}
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
  iconColor = "text-primary",
  isLoading,
  description 
}: { 
  title: string; 
  value?: number; 
  icon: any; 
  iconColor?: string;
  isLoading: boolean;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value || 0}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  switch (estado) {
    case 'pendiente': return <Badge variant="warning">Pendiente</Badge>;
    case 'confirmada': return <Badge variant="info">Confirmada</Badge>;
    case 'entregada': return <Badge variant="success">Entregada</Badge>;
    case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>;
    default: return <Badge variant="outline">{estado}</Badge>;
  }
}

function DisponibilidadBadge({ disponibilidad }: { disponibilidad: string }) {
  switch (disponibilidad) {
    case 'disponible': return <Badge variant="success" className="text-[10px] px-1.5 py-0">Disponible</Badge>;
    case 'pocas_unidades': return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Pocas unidades</Badge>;
    case 'agotado': return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Agotado</Badge>;
    default: return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{disponibilidad}</Badge>;
  }
}
