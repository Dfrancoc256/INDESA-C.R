import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  calcularFechaFinPorTarifa,
  calcularUnidadesTarifa,
  formatCurrency,
  getDiasEntreFechas,
  getInitials,
  getTarifaPrincipal,
  getTarifasProducto,
  getTodayDate,
  PRODUCT_PRICE_WARNING,
} from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReservationDatePicker } from "@/components/reservation-date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useReservaDisponibilidad } from "@/hooks/use-reserva-disponibilidad";
import { useReservaCalendarioDisponibilidad } from "@/hooks/use-reserva-calendario-disponibilidad";
import { getFriendlyApiErrorMessage } from "@/lib/apiErrorMessage";
import {
  ArrowRight,
  AlertTriangle,
  Clock,
  ClipboardList,
  MessageCircle,
  Package,
  Shield,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useEffect, useState, type FormEvent } from "react";
import { listProductos, useCreateReserva, useListProductos, type Producto, getListProductosQueryKey, getGetProductoQueryKey, getProducto } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCatalogData } from "@/lib/queryInvalidation";
import { errorMessages } from "@/lib/errorMessages";
import bannerPrincipal1 from "@/assets/images/banner-principal-1.png";
import bannerPrincipal2 from "@/assets/images/banner-principal-2.png";
import bannerPrincipal3 from "@/assets/images/banner-principal-3.png";
import bannerPrincipal4 from "@/assets/images/banner-principal-4.png";

type HomeProduct = Producto;

type ReservaFormState = {
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  cantidad: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_tarifa: "dia" | "semana" | "mes" | "base";
  unidades_tarifa: string;
  notas: string;
};

const whatsappPhone = "50252149029";
const pendingWhatsAppField = "Pendiente por completar";
const todayDate = getTodayDate();
const calendarLimitDate = (() => {
  const date = new Date(`${todayDate}T00:00:00`);
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
})();

const emptyReservaForm: ReservaFormState = {
  cliente_nombre: "",
  cliente_email: "",
  cliente_telefono: "",
  cantidad: "1",
  fecha_inicio: todayDate,
  fecha_fin: todayDate,
  tipo_tarifa: "dia",
  unidades_tarifa: "1",
  notas: "",
};

const heroSlides = [
  {
    image: bannerPrincipal1,
    label: "Maquinaria industrial",
    title: "¿Necesitas rentar maquinaria o un servicio?",
    description:
      "Conectamos a empresas y profesionales con maquinaria lista para trabajo pesado.",
  },
  {
    image: bannerPrincipal2,
    label: "Inventario de maquinaria",
    title: "Equipos organizados para reservas más rápidas",
    description:
      "Consulte disponibilidad y reserve equipos desde una experiencia clara y dinámica.",
  },
  {
    image: bannerPrincipal3,
    label: "Repuestos y componentes",
    title: "Componentes listos para industria, obra y mantenimiento",
    description:
      "Apoye sus operaciones con repuestos, accesorios y maquinaria auxiliar.",
  },
];

function buildWhatsAppUrl(producto: HomeProduct, form?: ReservaFormState) {
  const tarifaPrincipal = getTarifaPrincipal(producto);
  const tarifaForm = form
    ? getTarifasProducto(producto).find((tarifa) => tarifa.tipo === form.tipo_tarifa) ?? tarifaPrincipal
    : tarifaPrincipal;
  const fechaFin = form
    ? form.tipo_tarifa === "dia"
      ? form.fecha_fin
      : calcularFechaFinPorTarifa(form.fecha_inicio, form.tipo_tarifa, Number(form.unidades_tarifa) || 1)
    : "";
  const unidades = form
    ? calcularUnidadesTarifa(form.tipo_tarifa, form.fecha_inicio, fechaFin, Number(form.unidades_tarifa) || 1)
    : 1;
  const cantidad = form ? Number(form.cantidad) || 1 : 1;
  const total = tarifaForm.value * unidades * cantidad;
  const lines = [
    "Hola, quiero información para reservar este equipo:",
    `Producto: ${producto.nombre}`,
    `Tarifa: ${formatCurrency(tarifaForm.value)} por ${tarifaForm.suffix}`,
  ];

  if (form) {
    lines.push(
      `Cantidad solicitada: ${form.cantidad || "1"}`,
      `Modalidad: ${tarifaForm.label} x ${unidades}`,
      `Fechas: ${form.fecha_inicio} al ${fechaFin}`,
      `Total estimado: ${formatCurrency(total)}`,
      `Nombre: ${form.cliente_nombre || pendingWhatsAppField}`,
      `Teléfono: ${form.cliente_telefono || pendingWhatsAppField}`,
      `Correo: ${form.cliente_email || pendingWhatsAppField}`
    );

    if (form.notas.trim()) {
      lines.push(`Notas: ${form.notas.trim()}`);
    }
  }

  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSlide, setActiveSlide] = useState(0);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(null);
  const [reservaForm, setReservaForm] = useState<ReservaFormState>(emptyReservaForm);
  const { data: productosResponse, isLoading: isLoadingCatalogo, isError: isCatalogoError, refetch: refetchCatalogo } = useListProductos({
    page: 1,
    limit: 6,
    orden: "nombre_asc",
  });
  const productosCatalogo = productosResponse?.data ?? [];
  const tarifasReserva = selectedProduct ? getTarifasProducto(selectedProduct) : [];
  const tarifaSeleccionada = tarifasReserva.find((tarifa) => tarifa.tipo === reservaForm.tipo_tarifa) ?? tarifasReserva[0];
  const fechaFinCalculada = tarifaSeleccionada?.tipo === "dia"
    ? reservaForm.fecha_fin
    : calcularFechaFinPorTarifa(reservaForm.fecha_inicio, tarifaSeleccionada?.tipo ?? "dia", Number(reservaForm.unidades_tarifa) || 1);
  const unidadesTarifa = calcularUnidadesTarifa(
    tarifaSeleccionada?.tipo ?? "dia",
    reservaForm.fecha_inicio,
    fechaFinCalculada,
    Number(reservaForm.unidades_tarifa) || 1
  );
  const diasReserva = getDiasEntreFechas(reservaForm.fecha_inicio, fechaFinCalculada);
  const cantidadSolicitada = Number(reservaForm.cantidad) || 1;
  const totalEstimado = selectedProduct && tarifaSeleccionada
    ? tarifaSeleccionada.value * unidadesTarifa * cantidadSolicitada
    : 0;
  const calendarioDisponibilidad = useReservaCalendarioDisponibilidad({
    productoId: selectedProduct?.id,
    desde: todayDate,
    hasta: calendarLimitDate,
  });
  const disponibilidadReserva = useReservaDisponibilidad({
    productoId: selectedProduct?.id,
    fechaInicio: reservaForm.fecha_inicio,
    fechaFin: fechaFinCalculada,
    cantidad: cantidadSolicitada,
  });
  const fechasBloqueadas = calendarioDisponibilidad.data?.fechasBloqueadas ?? [];
  const disponibilidadActual = disponibilidadReserva.data;

  const reservaMutation = useCreateReserva({
    mutation: {
      onError: (err: any) => {
        const message = getFriendlyApiErrorMessage(err, errorMessages.createReservation);
        const shouldRefreshCatalog = /producto no encontrado|desactivado|no disponible/i.test(message);

        if (shouldRefreshCatalog) {
          void refetchCatalogo();
          setReservaOpen(false);
        }

        toast({
          variant: "destructive",
          title: "No fue posible registrar la reserva",
          description: shouldRefreshCatalog
            ? `${message} Actualizamos el catálogo para mostrar la disponibilidad real.`
            : message,
        });
      },
    },
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sources = [
      ...heroSlides.map((slide) => slide.image),
      ...productosCatalogo.slice(0, 6).map((producto) => producto.imagen_url).filter(Boolean) as string[],
    ];

    sources.forEach((src) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = src;
    });
  }, [productosCatalogo]);

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: getListProductosQueryKey({
        page: 1,
        limit: 12,
        orden: "nombre_asc",
      }),
      queryFn: () =>
        listProductos({
          page: 1,
          limit: 12,
          orden: "nombre_asc",
        }),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  useEffect(() => {
    if (!productosCatalogo.length) return;

    const visibleProducts = productosCatalogo.slice(0, 3);
    void Promise.allSettled(
      visibleProducts.map((producto) =>
        queryClient.prefetchQuery({
          queryKey: getGetProductoQueryKey(Number(producto.id)),
          queryFn: () => getProducto(Number(producto.id)),
          staleTime: 5 * 60 * 1000,
        })
      ),
    );
  }, [productosCatalogo, queryClient]);

  const openReservaModal = (producto: HomeProduct) => {
    const tarifaPrincipal = getTarifaPrincipal(producto);
    setSelectedProduct(producto);
    setReservaForm({
      ...emptyReservaForm,
      cantidad: (producto.cantidad ?? 0) > 0 ? "1" : "0",
      tipo_tarifa: tarifaPrincipal.tipo,
      unidades_tarifa: "1",
    });
    setReservaOpen(true);
  };

  const handleReservaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) return;

    const productoId = Number(selectedProduct.id);
    const cantidadSolicitada = Number(reservaForm.cantidad) || 1;

    if (!Number.isInteger(productoId) || productoId < 1) {
      toast({
        variant: "destructive",
        title: "Producto no válido",
        description: "Actualice el catálogo y vuelva a seleccionar el producto.",
      });
      void refetchCatalogo();
      setReservaOpen(false);
      return;
    }

    if (selectedProduct.activo === false) {
      toast({
        variant: "destructive",
        title: "Producto no disponible",
        description: "Este producto está desactivado para reservas. Actualizamos el catálogo.",
      });
      void refetchCatalogo();
      setReservaOpen(false);
      return;
    }

    if (disponibilidadActual && !disponibilidadActual.permitido) {
      toast({
        variant: "destructive",
        title: "Fechas no disponibles",
        description: `No hay stock suficiente para ese rango. Disponible: ${disponibilidadActual.stockDisponible}.`,
      });
      return;
    }

    reservaMutation.mutate({
      data: {
        productoId,
        producto_id: productoId,
        clienteNombre: reservaForm.cliente_nombre,
        cliente_nombre: reservaForm.cliente_nombre,
        clienteEmail: reservaForm.cliente_email,
        cliente_email: reservaForm.cliente_email,
        clienteTelefono: reservaForm.cliente_telefono,
        cliente_telefono: reservaForm.cliente_telefono,
        cantidad: cantidadSolicitada,
        fechaInicio: reservaForm.fecha_inicio,
        fecha_inicio: reservaForm.fecha_inicio,
        fechaFin: fechaFinCalculada,
        fecha_fin: fechaFinCalculada,
        tipoTarifa: tarifaSeleccionada?.tipo ?? "dia",
        tipo_tarifa: tarifaSeleccionada?.tipo ?? "dia",
        unidadesTarifa,
        unidades_tarifa: unidadesTarifa,
        notas: reservaForm.notas || undefined,
      } as any,
    }, {
      onSuccess: async () => {
        await invalidateCatalogData(queryClient);
        await refetchCatalogo();
        setReservaOpen(false);
        toast({
          title: "Reserva confirmada",
          description: "Tu solicitud fue registrada correctamente. Te enviaremos la confirmación por correo.",
        });
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[330px] items-center overflow-hidden bg-zinc-950 py-8 text-white md:min-h-[390px] md:py-10 lg:min-h-[420px]">
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
              <img
                key={slide.label}
                src={slide.image}
                alt={slide.label}
                loading={index === activeSlide ? "eager" : "eager"}
                fetchPriority={index === activeSlide ? "high" : "low"}
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-out ${
                  activeSlide === index ? "scale-100 opacity-80" : "scale-105 opacity-0"
                }`}
              />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-zinc-950/10" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-950 to-transparent" />

        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <h1 className="mb-5 text-3xl font-bold leading-tight tracking-tight transition-all duration-500 md:text-5xl">
              {heroSlides[activeSlide].title}
            </h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">
              {heroSlides[activeSlide].description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6 text-base shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                <Link href="/catalogo">
                  Ver Catálogo <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 bg-white/10 px-6 text-base text-white border-white/30 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:text-white">
                <Link href="/reservar">Reservar</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-3">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.label}
                  type="button"
                  aria-label={`Ver ${slide.label}`}
                  onClick={() => setActiveSlide(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    activeSlide === index ? "w-10 bg-primary" : "w-2.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Product Catalog */}
      <section id="catalogo-productos" className="bg-gray-50 py-7 md:py-10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h2>
            </div>
            <Button asChild variant="ghost" className="w-fit">
              <Link href="/catalogo">
                Ver catálogo completo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoadingCatalogo ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="aspect-[4/3] animate-pulse bg-gray-200" />
                  <div className="space-y-3 p-4">
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : isCatalogoError ? (
            <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
              No pudimos cargar el catálogo en este momento. Intenta nuevamente en unos segundos.
            </div>
          ) : productosCatalogo.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
              Aún no hay productos publicados en el catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {productosCatalogo.map((producto, index) => {
              const tarifasDisponibles = getTarifasProducto(producto);
              const tarifa = getTarifaPrincipal(producto);

              return (
                <Card key={producto.id} className="group relative overflow-hidden border bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                  <span className="absolute inset-x-0 top-0 z-10 h-1 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                  <span className="pointer-events-none absolute -left-1/2 top-0 z-20 h-full w-1/3 -skew-x-12 bg-white/20 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
                  <div className="relative aspect-[16/11] overflow-hidden bg-white">
                    {producto.imagen_url ? (
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        loading={index < 2 ? "eager" : "lazy"}
                        fetchPriority={index < 2 ? "high" : "low"}
                        decoding="async"
                        className="h-full w-full bg-white object-contain p-4 transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-4xl font-bold text-gray-300 transition-transform duration-500 group-hover:scale-105">
                        {getInitials(producto.nombre)}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-75" />

                    <div className="absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2 transition-transform duration-300 group-hover:-translate-y-1">
                      <Button asChild size="sm" variant="outline" className="gap-1.5 border-[#128C7E]/70 bg-white text-[#128C7E] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#075E54] hover:bg-[#128C7E]/10 hover:text-[#075E54] hover:shadow-md">
                        <a href={buildWhatsAppUrl(producto)} target="_blank" rel="noreferrer">
                          <FaWhatsapp className="h-4 w-4" />
                          WhatsApp
                        </a>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5 bg-primary text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md"
                        onClick={() => openReservaModal(producto)}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Reservar
                      </Button>
                    </div>
                  </div>

                  <CardHeader className="p-4 pb-2 transition-transform duration-300 group-hover:-translate-y-0.5">
                    <div className="mb-1 text-xs text-muted-foreground">{producto.categoria_nombre}</div>
                    <CardTitle className="line-clamp-2 text-lg leading-tight transition-colors duration-300 group-hover:text-primary" title={producto.nombre}>
                      {producto.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 transition-transform duration-300 group-hover:-translate-y-0.5">
                    <p className="mb-4 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                      {producto.descripcion}
                    </p>
                    <div className="mb-2 text-xl font-bold text-primary">
                      {formatCurrency(tarifa.value)}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">/{tarifa.suffix}</span>
                    </div>
                    {producto.advertencia_precio && (
                      <div className="mb-3 flex gap-2 rounded-md border border-black/10 bg-black/[0.03] p-2 text-xs leading-snug text-black">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{PRODUCT_PRICE_WARNING}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {tarifasDisponibles.length > 1 && tarifasDisponibles
                          .filter((item) => item.tipo !== "dia")
                          .map((item) => (
                            <span
                              key={item.tipo}
                              className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black"
                            >
                              {item.label}: {formatCurrency(item.value)}
                            </span>
                          ))}
                      </div>
                      <Link
                        href={`/producto/${producto.id}`}
                        className="relative z-30 -mr-2 inline-flex min-h-10 items-center rounded-md px-2 text-sm font-semibold text-muted-foreground touch-manipulation transition-all duration-200 hover:text-primary active:text-primary group-hover:translate-x-1"
                      >
                        Detalle
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="border-y bg-white py-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-bold">Calidad Industrial</h3>
                <p className="text-muted-foreground">Productos diseñados para resistir el uso intensivo y continuo.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-bold">Reservas Flexibles</h3>
                <p className="text-muted-foreground">Solicita equipos sin fricciones y recibe confirmación por correo.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-bold">Atención Rápida</h3>
                <p className="text-muted-foreground">Contacta por WhatsApp o envía la reserva con los datos completos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-white">
        <div className="container mx-auto max-w-4xl px-4 text-center md:px-8">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">¿Necesita un pedido especial o a granel?</h2>
          <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-primary-foreground/90 md:text-xl">
            Nuestro equipo está preparado para atender las necesidades específicas de su operación.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="h-14 min-w-[240px] px-8 text-base text-primary">
              <Link href="/contacto">Contactar a Ventas</Link>
            </Button>
            <Button asChild size="lg" className="h-14 min-w-[220px] border-0 bg-black px-8 text-base text-white hover:bg-zinc-800">
              <Link href="/catalogo">Ver más equipos</Link>
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={reservaOpen} onOpenChange={setReservaOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Datos de reserva</DialogTitle>
            <DialogDescription>
              Completa los datos y confirma tu reserva. La solicitud quedará registrada y recibirás la confirmación por correo.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <form onSubmit={handleReservaSubmit} className="space-y-5">
              <div className="grid gap-5 rounded-md border bg-muted/40 p-4 sm:grid-cols-[330px_1fr]">
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-white shadow-sm">
                  {selectedProduct.imagen_url ? (
                    <img
                      src={selectedProduct.imagen_url}
                      alt={selectedProduct.nombre}
                      className="h-full w-full object-contain p-0.5 scale-[1.12] md:scale-[1.18]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-300">
                      {getInitials(selectedProduct.nombre)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">{selectedProduct.categoria_nombre}</div>
                  <h3 className="mt-1 text-lg font-bold leading-tight">{selectedProduct.nombre}</h3>
                  <div className="mt-2 text-primary font-bold">
                    {formatCurrency(getTarifaPrincipal(selectedProduct).value)}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">por {getTarifaPrincipal(selectedProduct).suffix}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tarifasReserva.map((tarifa) => (
                      <span key={tarifa.tipo} className="rounded-full border border-black/15 bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-black">
                        {tarifa.label}: {formatCurrency(tarifa.value)}
                      </span>
                    ))}
                  </div>
                  {selectedProduct.advertencia_precio && (
                    <div className="mt-3 flex gap-2 rounded-md border border-black/10 bg-white p-2 text-xs leading-snug text-black">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{PRODUCT_PRICE_WARNING}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="home-reserva-nombre">Nombre completo</label>
                  <Input
                    id="home-reserva-nombre"
                    value={reservaForm.cliente_nombre}
                    onChange={(event) => setReservaForm((current) => ({ ...current, cliente_nombre: event.target.value }))}
                    placeholder="Nombre o empresa"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="home-reserva-telefono">Teléfono</label>
                  <Input
                    id="home-reserva-telefono"
                    value={reservaForm.cliente_telefono}
                    onChange={(event) => setReservaForm((current) => ({ ...current, cliente_telefono: event.target.value }))}
                    placeholder="Para confirmar por WhatsApp"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="home-reserva-email">Correo electrónico</label>
                  <Input
                    id="home-reserva-email"
                    type="email"
                    value={reservaForm.cliente_email}
                    onChange={(event) => setReservaForm((current) => ({ ...current, cliente_email: event.target.value }))}
                    placeholder="correo@empresa.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="home-reserva-cantidad">Cantidad</label>
                  <Input
                    id="home-reserva-cantidad"
                    type="number"
                    min="1"
                                        value={reservaForm.cantidad}
                    onChange={(event) => setReservaForm((current) => ({ ...current, cantidad: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="home-reserva-tarifa">Modalidad</label>
                  <select
                    id="home-reserva-tarifa"
                    value={reservaForm.tipo_tarifa}
                    onChange={(event) => {
                      const nextTipo = event.target.value as ReservaFormState["tipo_tarifa"];
                      setReservaForm((current) => ({
                        ...current,
                        tipo_tarifa: nextTipo,
                        unidades_tarifa: "1",
                        fecha_fin: nextTipo === "dia" ? current.fecha_fin : current.fecha_inicio,
                      }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {tarifasReserva.map((tarifa) => (
                      <option key={tarifa.tipo} value={tarifa.tipo}>
                        {tarifa.label} - {formatCurrency(tarifa.value)}
                      </option>
                    ))}
                  </select>
                </div>
                {tarifaSeleccionada?.tipo !== "dia" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="home-reserva-unidades">
                      {tarifaSeleccionada?.plural ?? "Períodos"}
                    </label>
                    <Input
                      id="home-reserva-unidades"
                      type="number"
                      min="1"
                      value={reservaForm.unidades_tarifa}
                      onChange={(event) => setReservaForm((current) => ({ ...current, unidades_tarifa: event.target.value }))}
                      required
                    />
                  </div>
                )}
                <ReservationDatePicker
                  label="Inicio"
                  value={reservaForm.fecha_inicio}
                  onChange={(nextInicio) => {
                    setReservaForm((current) => ({
                      ...current,
                      fecha_inicio: nextInicio,
                      fecha_fin: current.fecha_fin < nextInicio ? nextInicio : current.fecha_fin,
                    }));
                  }}
                  minDate={todayDate}
                  blockedDates={fechasBloqueadas}
                />
                {tarifaSeleccionada?.tipo === "dia" && (
                <ReservationDatePicker
                  label="Fin"
                  value={reservaForm.fecha_fin}
                  onChange={(fecha_fin) => setReservaForm((current) => ({ ...current, fecha_fin }))}
                  minDate={reservaForm.fecha_inicio || todayDate}
                  blockedDates={fechasBloqueadas}
                />
                )}
                {disponibilidadActual && !disponibilidadActual.permitido ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive sm:col-span-2">
                    No hay stock suficiente para esas fechas. Disponible: {disponibilidadActual.stockDisponible}.
                  </div>
                ) : null}
                <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary sm:col-span-2">
                  Reserva por {diasReserva} día{diasReserva === 1 ? "" : "s"}.
                  {tarifaSeleccionada && (
                    <span className="block text-foreground">
                      Estimado: {formatCurrency(totalEstimado)} ({unidadesTarifa} {unidadesTarifa === 1 ? tarifaSeleccionada.suffix : tarifaSeleccionada.plural})
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="home-reserva-notas">Comentarios</label>
                <Textarea
                  id="home-reserva-notas"
                  value={reservaForm.notas}
                  onChange={(event) => setReservaForm((current) => ({ ...current, notas: event.target.value }))}
                  placeholder="Ubicación del trabajo, horario o cualquier detalle adicional."
                  className="min-h-24"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild type="button" variant="outline" className="gap-2 border-[#128C7E]/70 bg-white text-[#128C7E] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#075E54] hover:bg-[#128C7E]/10 hover:text-[#075E54] hover:shadow-md">
                  <a href={buildWhatsAppUrl(selectedProduct, reservaForm)} target="_blank" rel="noreferrer">
                    <FaWhatsapp className="h-4 w-4" />
                    Consultar por WhatsApp
                  </a>
                </Button>
                <Button type="submit" className="gap-2" disabled={reservaMutation.isPending || disponibilidadReserva.isFetching}>
                  <ClipboardList className="h-4 w-4" />
                  {reservaMutation.isPending || disponibilidadReserva.isFetching ? "Validando..." : "Confirmar reserva"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}




