import { useListProductos, useCreateReserva } from "@workspace/api-client-react";
import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  calcularFechaFinPorTarifa,
  calcularUnidadesTarifa,
  formatCurrency,
  getDiasEntreFechas,
  getTarifaPrincipal,
  getTarifasProducto,
  getPrecioReferenciaProducto,
  getTodayDate,
} from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCatalogData } from "@/lib/queryInvalidation";
import { FaWhatsapp } from "react-icons/fa";

const reservaGlobalSchema = z.object({
  cliente_nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  cliente_email: z.string().email("Correo electrónico inválido"),
  cliente_telefono: z.string().min(8, "El teléfono debe tener al menos 8 dígitos"),
  producto_id: z.coerce.number().min(1, "Debe seleccionar un producto"),
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

type ReservaGlobalValues = z.infer<typeof reservaGlobalSchema>;
const todayDate = getTodayDate();
const whatsappPhone = "50252149029";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function Reservar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const productoPreseleccionado = searchParams.get("productoId");
  
  const [reservaExitoso, setReservaExitoso] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);

  // Obtener productos disponibles para el select
  const { data: productosResponse, isLoading: isLoadingProductos } = useListProductos({ 
    limit: 100, // Cargar suficientes para el select
    orden: 'nombre_asc' as any
  });
  const productosDisponibles = useMemo(() => {
    return productosResponse?.data?.filter((producto) => producto.activo !== false) ?? [];
  }, [productosResponse]);
  const catalogoCargando = isLoadingProductos && !productosDisponibles.length;

  const form = useForm<ReservaGlobalValues>({
    resolver: zodResolver(reservaGlobalSchema),
    defaultValues: {
      cliente_nombre: "",
      cliente_email: "",
      cliente_telefono: "",
      producto_id: productoPreseleccionado ? parseInt(productoPreseleccionado) : 0,
      cantidad: 1,
      fecha_inicio: todayDate,
      fecha_fin: todayDate,
      tipo_tarifa: "dia",
      unidades_tarifa: 1,
      notas: ""
    },
  });

  // Actualizar info del producto seleccionado cuando cambia el select
  useEffect(() => {
    const sub = form.watch((value, { name }) => {
      if (name === "producto_id") {
        const prod = productosDisponibles.find(p => p.id === value.producto_id);
        setProductoSeleccionado(prod);
        if (prod) {
          form.setValue("tipo_tarifa", getTarifaPrincipal(prod).tipo);
          form.setValue("unidades_tarifa", 1);
        }
      }
    });
    return () => sub.unsubscribe();
  }, [form.watch, productosDisponibles]);

  // Si hay producto preseleccionado, inicializarlo
  useEffect(() => {
    if (productoPreseleccionado && productosDisponibles.length) {
      const prod = productosDisponibles.find(p => p.id.toString() === productoPreseleccionado);
      if (prod) {
        setProductoSeleccionado(prod);
        form.setValue("producto_id", prod.id);
        form.setValue("tipo_tarifa", getTarifaPrincipal(prod).tipo);
      }
    }
  }, [productoPreseleccionado, productosDisponibles, form]);

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

  const onSubmit = (data: ReservaGlobalValues) => {
    // Validar stock antes de enviar si tenemos la info
    if (productoSeleccionado && productoSeleccionado.cantidad !== null) {
      if (data.cantidad > productoSeleccionado.cantidad) {
        form.setError("cantidad", {
          type: "manual",
          message: `Solo hay ${productoSeleccionado.cantidad} unidades disponibles`
        });
        return;
      }
      if (productoSeleccionado.cantidad === 0) {
        toast({
          variant: "destructive",
          title: "Producto agotado",
          description: "No se puede reservar este producto porque no hay existencias."
        });
        return;
      }
    }

    if (!productoSeleccionado) return;

    const tarifa = getTarifasProducto(productoSeleccionado).find((item) => item.tipo === data.tipo_tarifa) ?? getTarifaPrincipal(productoSeleccionado);
    const fechaFin = data.tipo_tarifa === "dia"
      ? data.fecha_fin
      : calcularFechaFinPorTarifa(data.fecha_inicio, data.tipo_tarifa, data.unidades_tarifa);
    const unidadesTarifa = calcularUnidadesTarifa(data.tipo_tarifa, data.fecha_inicio, fechaFin, data.unidades_tarifa);

    reservaMutation.mutate({
      data: {
        ...data,
        productoId: data.producto_id,
        clienteNombre: data.cliente_nombre,
        clienteEmail: data.cliente_email,
        clienteTelefono: data.cliente_telefono,
        fechaInicio: data.fecha_inicio,
        fechaFin,
        fecha_fin: fechaFin,
        tipoTarifa: tarifa.tipo,
        tipo_tarifa: tarifa.tipo,
        unidadesTarifa,
        unidades_tarifa: unidadesTarifa,
      } as any,
    });
  };
  const tarifasProducto = productoSeleccionado ? getTarifasProducto(productoSeleccionado) : [];
  const tipoTarifa = form.watch("tipo_tarifa");
  const tarifaSeleccionada = tarifasProducto.find((tarifa) => tarifa.tipo === tipoTarifa) ?? (productoSeleccionado ? getTarifaPrincipal(productoSeleccionado) : null);
  const fechaInicio = form.watch("fecha_inicio");
  const fechaFin = tipoTarifa === "dia"
    ? form.watch("fecha_fin")
    : calcularFechaFinPorTarifa(fechaInicio, tipoTarifa, form.watch("unidades_tarifa"));
  const unidadesTarifa = calcularUnidadesTarifa(tipoTarifa, fechaInicio, fechaFin, form.watch("unidades_tarifa"));
  const diasReserva = getDiasEntreFechas(fechaInicio, fechaFin);
  const totalEstimado = productoSeleccionado && tarifaSeleccionada
    ? tarifaSeleccionada.value * unidadesTarifa * (Number(form.watch("cantidad")) || 1)
    : 0;
  const productImage = productoSeleccionado?.imagen_url;
  const whatsappUrl = productoSeleccionado
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent([
        "Hola, quiero información para reservar este equipo:",
        `Producto: ${productoSeleccionado.nombre}`,
        `Tarifa: ${formatCurrency(getTarifaPrincipal(productoSeleccionado).value)} por ${getTarifaPrincipal(productoSeleccionado).suffix}`,
        `Disponibles: ${productoSeleccionado.cantidad ?? "Consultar"}`,
        `Nombre: ${form.watch("cliente_nombre") || "Pendiente"}`,
        `Teléfono: ${form.watch("cliente_telefono") || "Pendiente"}`,
        `Correo: ${form.watch("cliente_email") || "Pendiente"}`,
      ].join("\n"))}`
    : `https://wa.me/${whatsappPhone}`;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 md:py-20 mb-8">
        <div className="container mx-auto px-4 md:px-8 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Solicitud de Reserva</h1>
          <p className="text-primary-foreground/90 text-lg md:text-xl">
            Asegure los suministros que necesita completando el formulario. Nuestro equipo confirmará existencias y procesará su solicitud a la brevedad.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        {reservaExitoso ? (
          <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-lg border shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Solicitud Recibida!</h2>
            <p className="text-lg text-gray-600 mb-8">
              Su reserva ha sido registrada exitosamente. Hemos enviado una confirmación a su correo electrónico.
              Un asesor de ventas se comunicará pronto para finalizar el proceso.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" variant="outline">
                <button onClick={() => {
                  setReservaExitoso(false);
                  form.reset();
                  setProductoSeleccionado(null);
                }}>Nueva Reserva</button>
              </Button>
              <Button asChild size="lg">
                <Link href="/catalogo">Volver al Catálogo</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <Card className="shadow-lg border-0 overflow-hidden">
              <div className="bg-muted p-6 flex items-center gap-4 border-b">
                <div className="bg-background p-3 rounded-full shadow-sm">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Datos de la Reserva</h2>
                  <p className="text-sm text-muted-foreground">Complete todos los campos obligatorios (*)</p>
                </div>
              </div>
              <CardContent className="p-6 md:p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg border-b pb-2">1. Selección de Producto</h3>
                      
                      <FormField
                        control={form.control}
                        name="producto_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Producto Requerido *</FormLabel>
                            <Select 
                              onValueChange={(val) => field.onChange(parseInt(val))} 
                              value={field.value ? field.value.toString() : ""}
                              disabled={catalogoCargando}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder={catalogoCargando ? "Cargando catálogo..." : "Seleccione un producto del catálogo"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {productosDisponibles.map(prod => (
                                  <SelectItem key={prod.id} value={prod.id.toString()}>
                                    {prod.nombre} - {formatCurrency(getTarifaPrincipal(prod).value)} / {getTarifaPrincipal(prod).suffix}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {productoSeleccionado && (
                        <div className="grid gap-4 rounded-md border bg-gray-50 p-4 md:grid-cols-[180px_1fr]">
                          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-white shadow-sm">
                            {productImage ? (
                              <img
                                src={productImage}
                                alt={productoSeleccionado.nombre}
                                className="max-h-full max-w-full object-contain p-2"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-gray-300">
                                {productoSeleccionado.nombre.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground">{productoSeleccionado.categoria_nombre}</div>
                            <div className="text-2xl font-bold leading-tight">{productoSeleccionado.nombre}</div>
                            <div className="mt-2 text-primary font-bold">
                              {formatCurrency(getTarifaPrincipal(productoSeleccionado).value)}
                              <span className="ml-1 text-xs font-medium text-muted-foreground">
                                por {getTarifaPrincipal(productoSeleccionado).suffix}
                              </span>
                            </div>
                            {getPrecioReferenciaProducto(productoSeleccionado) > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Precio base de referencia: {formatCurrency(getPrecioReferenciaProducto(productoSeleccionado))}
                              </div>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {tarifasProducto.map((tarifa) => (
                                <span key={tarifa.tipo} className="rounded-full border border-black/15 bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-black">
                                  {tarifa.label}: {formatCurrency(tarifa.value)}
                                </span>
                              ))}
                            </div>
                            <div className="mt-3 text-sm text-muted-foreground">
                              {productoSeleccionado.cantidad === 0 ? (
                                <span className="font-bold text-destructive">Agotado</span>
                              ) : (
                                <span className="font-semibold text-green-600">Disponibles: {productoSeleccionado.cantidad}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {productoSeleccionado && (
                        <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Opciones de reserva</span>
                            <span>Elige producto, modalidad, fechas y cantidad.</span>
                          </div>
                        </div>
                      )}

                      {productoSeleccionado && (
                        <div className="grid gap-4 rounded-md border bg-gray-50 p-4 md:grid-cols-2">
                          <div>
                            <div className="text-sm font-semibold">Acción rápida</div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Puedes enviar la consulta por WhatsApp con los datos de esta reserva o guardar la solicitud desde aquí.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button asChild type="button" variant="outline" className="gap-2">
                              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                                <FaWhatsapp className="h-4 w-4 text-[#128C7E]" />
                                Consultar por WhatsApp
                              </a>
                            </Button>
                            <Button type="submit" className="gap-2">
                              <ClipboardList className="h-4 w-4" />
                              Enviar solicitud
                            </Button>
                          </div>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="cantidad"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad *</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                min="1" 
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="w-full sm:w-1/3"
                                {...field}
                                onChange={(event) => field.onChange(onlyDigits(event.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {productoSeleccionado && tarifaSeleccionada && (
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
                                    {tarifasProducto.map((tarifa) => (
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
                                <Input
                                  type="text"
                                  min="1"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  {...field}
                                  onChange={(event) => field.onChange(onlyDigits(event.target.value))}
                                />
                              </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}

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
                        {tarifaSeleccionada && (
                          <span className="block text-foreground">
                            Estimado: {formatCurrency(totalEstimado)} ({unidadesTarifa} {unidadesTarifa === 1 ? tarifaSeleccionada.suffix : tarifaSeleccionada.plural})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 mt-6 border-t">
                      <h3 className="font-semibold text-lg border-b pb-2">2. Información de Contacto</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cliente_nombre"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre Completo / Empresa *</FormLabel>
                              <FormControl>
                                <Input placeholder="Razón social o nombre" {...field} />
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
                              <FormLabel>Teléfono Celular *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Solo números"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  {...field}
                                  onChange={(event) => field.onChange(onlyDigits(event.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="cliente_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo Electrónico *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="usuario@empresa.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 pt-6 mt-6 border-t">
                      <h3 className="font-semibold text-lg border-b pb-2">3. Detalles Adicionales</h3>
                      <FormField
                        control={form.control}
                        name="notas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comentarios (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Ubicación del trabajo, horario estimado, datos de facturación (NIT), u otras especificaciones..." 
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-8">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          className="h-14 w-full gap-2 sm:w-1/2"
                        >
                          <a href={whatsappUrl} target="_blank" rel="noreferrer">
                            <FaWhatsapp className="h-4 w-4 text-[#128C7E]" />
                            Consultar por WhatsApp
                          </a>
                        </Button>
                        <Button 
                          type="submit" 
                          size="lg" 
                          className="h-14 w-full text-lg sm:w-1/2"
                          disabled={reservaMutation.isPending || (productoSeleccionado && productoSeleccionado.cantidad === 0)}
                        >
                          {reservaMutation.isPending ? "Procesando Solicitud..." : "Enviar Solicitud de Reserva"}
                        </Button>
                      </div>
                      <p className="mt-4 text-center text-sm text-muted-foreground">
                        Esta reserva no requiere pago inmediato. Un asesor le enviará la cotización final y los métodos de pago.
                      </p>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

