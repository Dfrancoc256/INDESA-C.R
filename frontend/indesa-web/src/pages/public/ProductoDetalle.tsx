import { useGetProducto, useCreateReserva, getGetProductoQueryKey } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import {
  calcularFechaFinPorTarifa,
  calcularUnidadesTarifa,
  formatCurrency,
  getDiasEntreFechas,
  getInitials,
  getTarifaPrincipal,
  getTarifasProducto,
  getTodayDate,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, CheckCircle2, AlertTriangle, BadgeCheck, Package, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCatalogData } from "@/lib/queryInvalidation";

const reservaSchema = z.object({
  cliente_nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  cliente_email: z.string().email("Correo electrónico inválido"),
  cliente_telefono: z.string().min(8, "El teléfono debe tener al menos 8 dígitos"),
  cantidad: z.coerce.number().min(1, "La cantidad mínima es 1"),
  fecha_inicio: z.string().min(1, "Seleccione fecha de inicio"),
  fecha_fin: z.string().min(1, "Seleccione fecha final"),
  tipo_tarifa: z.enum(["dia", "semana", "mes", "base"]),
  unidades_tarifa: z.coerce.number().min(1, "La cantidad mínima es 1"),
  notas: z.string().optional()
}).refine((data) => data.fecha_fin >= data.fecha_inicio, {
  path: ["fecha_fin"],
  message: "La fecha final no puede ser anterior a la fecha inicial",
});

type ReservaValues = z.infer<typeof reservaSchema>;
const todayDate = getTodayDate();

export function ProductoDetalle() {
  const { id } = useParams<{ id: string }>();
  const productoId = parseInt(id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reservaExitoso, setReservaExitoso] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const { data: productoActual, isLoading } = useGetProducto(productoId, {
    query: { enabled: productoId > 0, queryKey: getGetProductoQueryKey(productoId) }
  });
  const imageSrc = productoActual?.imagen_url ?? "";
  const categoriaNombre = productoActual?.categoria_nombre ?? "Maquinaria";
  const cantidadDisponible = productoActual?.cantidad ?? 0;

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  const form = useForm<ReservaValues>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      cliente_nombre: "",
      cliente_email: "",
      cliente_telefono: "",
      cantidad: 1,
      fecha_inicio: todayDate,
      fecha_fin: todayDate,
      tipo_tarifa: "dia",
      unidades_tarifa: 1,
      notas: ""
    },
  });

  useEffect(() => {
    if (!productoActual) return;
    form.setValue("tipo_tarifa", getTarifaPrincipal(productoActual).tipo);
  }, [productoActual, form]);

  const reservaMutation = useCreateReserva({
    mutation: {
      onSuccess: async () => {
        await invalidateCatalogData(queryClient);
        setReservaExitoso(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Error al reservar", 
          description: err?.message || "Hubo un problema al procesar su solicitud. Intente más tarde." 
        });
      }
    }
  });

  const onSubmit = (data: ReservaValues) => {
    if (!productoActual) return;
    
    // Validar stock antes de enviar
    if (productoActual.cantidad !== null && productoActual.cantidad !== undefined && data.cantidad > productoActual.cantidad) {
      form.setError("cantidad", {
        type: "manual",
        message: `Solo hay ${productoActual.cantidad} unidades disponibles`
      });
      return;
    }

    const tarifa = getTarifasProducto(productoActual).find((item) => item.tipo === data.tipo_tarifa) ?? getTarifaPrincipal(productoActual);
    const fechaFin = data.tipo_tarifa === "dia"
      ? data.fecha_fin
      : calcularFechaFinPorTarifa(data.fecha_inicio, data.tipo_tarifa, data.unidades_tarifa);
    const unidadesTarifa = calcularUnidadesTarifa(data.tipo_tarifa, data.fecha_inicio, fechaFin, data.unidades_tarifa);

    reservaMutation.mutate({
      data: {
        productoId: productoActual.id,
        producto_id: productoActual.id,
        ...data,
        clienteNombre: data.cliente_nombre,
        clienteEmail: data.cliente_email,
        clienteTelefono: data.cliente_telefono,
        fechaInicio: data.fecha_inicio,
        fechaFin: fechaFin,
        fecha_fin: fechaFin,
        tipoTarifa: tarifa.tipo,
        tipo_tarifa: tarifa.tipo,
        unidadesTarifa,
        unidades_tarifa: unidadesTarifa,
      } as any
    });
  };

  if (isLoading && !productoActual) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="bg-gray-200 aspect-square rounded-lg"></div>
          <div className="space-y-6">
            <div className="h-10 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded w-full"></div>
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!productoActual) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Producto no encontrado</h2>
        <p className="text-muted-foreground mb-8">El producto que busca no existe o ya no está disponible.</p>
        <Button asChild>
          <Link href="/catalogo">Volver al catálogo</Link>
        </Button>
      </div>
    );
  }

  const stockAgotado = productoActual.cantidad === 0;
  const tarifaPrincipal = getTarifaPrincipal(productoActual);
  const tarifas = getTarifasProducto(productoActual);
  const tipoTarifa = form.watch("tipo_tarifa");
  const tarifaSeleccionada = tarifas.find((tarifa) => tarifa.tipo === tipoTarifa) ?? tarifaPrincipal;
  const fechaInicio = form.watch("fecha_inicio");
  const fechaFin = tipoTarifa === "dia"
    ? form.watch("fecha_fin")
    : calcularFechaFinPorTarifa(fechaInicio, tipoTarifa, form.watch("unidades_tarifa"));
  const unidadesTarifa = calcularUnidadesTarifa(tipoTarifa, fechaInicio, fechaFin, form.watch("unidades_tarifa"));
  const diasReserva = getDiasEntreFechas(fechaInicio, fechaFin);
  const totalEstimado = tarifaSeleccionada.value * unidadesTarifa * (Number(form.watch("cantidad")) || 1);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b py-4">
        <div className="container mx-auto px-4 md:px-8">
          <Link href="/catalogo" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al catálogo
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12">
        {reservaExitoso ? (
          <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-lg border shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Reserva Confirmada!</h2>
            <p className="text-lg text-gray-600 mb-8">
              Su solicitud para <strong>{productoActual.nombre}</strong> ha sido recibida correctamente. 
              Un asesor se comunicará con usted para coordinar disponibilidad, operador y condiciones de uso.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/catalogo">Seguir explorando</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">Ir al inicio</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(390px,1fr)]">
            {/* Imagen y Detalles Visuales */}
            <div className="space-y-4 lg:sticky lg:top-28">
              <div className="relative overflow-hidden rounded-xl border bg-white shadow-md">
                <div className="aspect-[16/11] max-h-[520px] w-full bg-white lg:aspect-[5/4]">
                  {imageSrc && !imageFailed ? (
                    <img
                      src={imageSrc}
                      alt={productoActual.nombre}
                      className="h-full w-full bg-white object-contain p-4"
                      onError={() => setImageFailed(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-gray-300">
                      {getInitials(productoActual.nombre)}
                    </div>
                  )}
                </div>
                {productoActual.disponibilidad === "pocas_unidades" && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="warning" className="text-sm shadow-sm py-1 px-3">Pocas Unidades</Badge>
                  </div>
                )}
                {productoActual.disponibilidad === "agotado" && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="destructive" className="text-sm shadow-sm py-1 px-3">Agotado</Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Equipo revisado
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Inspeccionamos el equipo antes de cada entrega para que llegue listo para trabajar.
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Reserva guiada
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Te acompañamos en el proceso para confirmar disponibilidad y condiciones.
                  </p>
                </div>
              </div>
            </div>

            {/* Info y Formulario */}
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border bg-white p-6 shadow-sm md:p-7">
                <div className="text-sm font-semibold tracking-wider text-primary uppercase mb-2">
                  {categoriaNombre}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight md:text-4xl">
                  {productoActual.nombre}
                </h1>
                <div className="text-4xl font-bold text-gray-900 mb-2 md:text-5xl">
                  {formatCurrency(tarifaPrincipal.value)}
                  <span className="ml-2 text-base font-semibold text-muted-foreground md:text-lg">por {tarifaPrincipal.suffix}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-6">
                  La coordinación final depende del lugar, horario y tipo de trabajo.
                </p>
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  {tarifas.map((tarifa) => (
                    <div key={tarifa.suffix} className="rounded-lg border bg-gray-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tarifa.label}</div>
                      <div className="mt-1 text-lg font-bold text-primary">{formatCurrency(tarifa.value)}</div>
                    </div>
                  ))}
                </div>
                {productoActual.descripcion && (
                  <div className="prose prose-sm md:prose-base text-gray-600 max-w-none">
                    <p>{productoActual.descripcion}</p>
                  </div>
                )}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      Disponibilidad
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {cantidadDisponible > 0
                        ? `${cantidadDisponible} unidad${cantidadDisponible === 1 ? "" : "es"} disponible${cantidadDisponible === 1 ? "" : "s"}`
                        : "Sin unidades disponibles por el momento"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      Confirmación rápida
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Revisamos tu solicitud y te respondemos con el siguiente paso lo antes posible.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="flex-1 overflow-hidden border-primary/20 shadow-lg">
                <div className="border-b bg-primary/5 px-6 py-5 md:px-7">
                  <h3 className="flex items-center gap-2 text-xl font-bold">
                    <Package className="h-5 w-5 text-primary" /> Solicitar reserva
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Completa tus datos y un asesor confirmará operador, horario y condiciones.
                  </p>
                </div>
                <CardContent className="p-6 md:p-7">

                  {stockAgotado ? (
                    <div className="border border-primary/20 bg-primary/5 rounded-lg p-6 text-center">
                      <AlertTriangle className="h-10 w-10 text-primary mx-auto mb-3" />
                      <h4 className="text-lg font-bold text-primary mb-2">Producto Agotado</h4>
                      <p className="text-primary/80 mb-4">
                        Lo sentimos, actualmente no contamos con existencias de este producto.
                      </p>
                      <Button asChild variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                        <Link href="/contacto">Consultar próxima disponibilidad</Link>
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="cliente_nombre"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre Completo *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ej. Juan Pérez" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="cliente_telefono"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Teléfono *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ej. 55554444" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                          <div>
                            <FormField
                              control={form.control}
                              name="cliente_email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Correo Electrónico *</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="juan@ejemplo.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div>
                            <FormField
                              control={form.control}
                              name="cantidad"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cantidad *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      max={productoActual.cantidad || undefined}
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="tipo_tarifa"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Modalidad *</FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    onChange={(event) => {
                                      field.onChange(event);
                                      form.setValue("unidades_tarifa", 1);
                                      if (event.target.value !== "dia") {
                                        form.setValue("fecha_fin", form.getValues("fecha_inicio"));
                                      }
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  >
                                    {tarifas.map((tarifa) => (
                                      <option key={tarifa.tipo} value={tarifa.tipo}>
                                        {tarifa.label} - {formatCurrency(tarifa.value)}
                                      </option>
                                    ))}
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {tipoTarifa !== "dia" && (
                            <FormField
                              control={form.control}
                              name="unidades_tarifa"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{tarifaSeleccionada.plural} *</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="fecha_inicio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fecha de inicio *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    min={todayDate}
                                    {...field}
                                    onChange={(event) => {
                                      field.onChange(event);
                                      const fechaFin = form.getValues("fecha_fin");
                                      if (fechaFin < event.target.value) {
                                        form.setValue("fecha_fin", event.target.value);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {tipoTarifa === "dia" && (
                          <FormField
                            control={form.control}
                            name="fecha_fin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fecha final *</FormLabel>
                                <FormControl>
                                  <Input type="date" min={form.watch("fecha_inicio") || todayDate} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          )}
                        </div>
                        <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                          Reserva por {diasReserva} día{diasReserva === 1 ? "" : "s"}.
                          <span className="block text-foreground">
                            Estimado: {formatCurrency(totalEstimado)} ({unidadesTarifa} {unidadesTarifa === 1 ? tarifaSeleccionada.suffix : tarifaSeleccionada.plural})
                          </span>
                        </div>

                        <FormField
                          control={form.control}
                          name="notas"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comentarios adicionales (Opcional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Ubicación de trabajo, horario estimado, tipo de operación o datos de facturación." 
                                  className="h-28 resize-none"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="pt-2">
                          <Button 
                            type="submit" 
                            size="lg" 
                            className="h-12 w-full text-base font-bold md:h-14 md:text-lg"
                            disabled={reservaMutation.isPending}
                          >
                            {reservaMutation.isPending ? "Procesando..." : "Confirmar Reserva"}
                          </Button>
                          <p className="text-center text-xs text-muted-foreground mt-4">
                            Al confirmar, un asesor se comunicará para coordinar operador, horario y condiciones del servicio.
                          </p>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
