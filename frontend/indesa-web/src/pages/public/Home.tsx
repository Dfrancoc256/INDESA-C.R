import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Clock,
  ClipboardList,
  MessageCircle,
  Package,
  Shield,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useEffect, useState, type FormEvent } from "react";
import { useCreateReserva, useListProductos, type Producto } from "@workspace/api-client-react";
import bannerTools from "@/assets/images/banner-tools.png";
import bannerWarehouse from "@/assets/images/banner-warehouse.png";
import bannerMaterials from "@/assets/images/banner-materials.png";

type HomeProduct = Producto;

type ReservaFormState = {
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  cantidad: string;
  fecha_inicio: string;
  fecha_fin: string;
  notas: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDiasReserva(fechaInicio: string, fechaFin: string) {
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  const diff = fin.getTime() - inicio.getTime();

  if (Number.isNaN(diff) || diff < 0) return 1;
  return Math.floor(diff / 86_400_000) + 1;
}

const whatsappPhone = "50222223333";
const todayDate = getTodayDate();

const emptyReservaForm: ReservaFormState = {
  cliente_nombre: "",
  cliente_email: "",
  cliente_telefono: "",
  cantidad: "1",
  fecha_inicio: todayDate,
  fecha_fin: todayDate,
  notas: "",
};

const heroSlides = [
  {
    image: bannerTools,
    label: "Maquinaria industrial",
    title: "Maquinaria y Equipo Industrial de Alto Rendimiento",
    description:
      "Conectamos a empresas y profesionales con maquinaria, equipos y componentes listos para trabajo pesado.",
  },
  {
    image: bannerWarehouse,
    label: "Inventario de maquinaria",
    title: "Equipos organizados para reservas más rápidas",
    description:
      "Consulte disponibilidad, prepare solicitudes y reserve equipos desde una experiencia clara y dinámica.",
  },
  {
    image: bannerMaterials,
    label: "Repuestos y componentes",
    title: "Componentes listos para industria, obra y mantenimiento",
    description:
      "Apoye sus operaciones con repuestos, accesorios y maquinaria auxiliar de disponibilidad visible.",
  },
];

function getDisponibilidadLabel(producto: HomeProduct) {
  const cantidad = producto.cantidad ?? 0;
  if (cantidad <= 0) return "Agotado";
  if (cantidad === 1) return "1 unidad disponible";
  return `${cantidad} unidades disponibles`;
}

function buildWhatsAppUrl(producto: HomeProduct, form?: ReservaFormState) {
  const lines = [
    "Hola, quiero información para reservar este equipo:",
    `Producto: ${producto.nombre}`,
    `Disponibles: ${producto.cantidad ?? "Consultar"}`,
  ];

  if (form) {
    lines.push(
      `Cantidad solicitada: ${form.cantidad || "1"}`,
      `Fechas: ${form.fecha_inicio} al ${form.fecha_fin}`,
      `Nombre: ${form.cliente_nombre || "Pendiente"}`,
      `Teléfono: ${form.cliente_telefono || "Pendiente"}`,
      `Correo: ${form.cliente_email || "Pendiente"}`
    );

    if (form.notas.trim()) {
      lines.push(`Notas: ${form.notas.trim()}`);
    }
  }

  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function Home() {
  const { toast } = useToast();
  const [activeSlide, setActiveSlide] = useState(0);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(null);
  const [reservaForm, setReservaForm] = useState<ReservaFormState>(emptyReservaForm);
  const { data: productosResponse, isLoading: isLoadingCatalogo, isError: isCatalogoError } = useListProductos({
    page: 1,
    limit: 6,
    orden: "nombre_asc",
  });
  const productosCatalogo = productosResponse?.data ?? [];
  const diasReserva = getDiasReserva(reservaForm.fecha_inicio, reservaForm.fecha_fin);

  const reservaMutation = useCreateReserva({
    mutation: {
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "No se pudo registrar la reserva",
          description: err?.message || "Verifique los datos e intente nuevamente.",
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

  const scrollToCatalog = () => {
    const catalogSection = document.getElementById("catalogo-productos");
    if (!catalogSection) return;

    const headerOffset = 112;
    const top = catalogSection.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top, behavior: "smooth" });
    window.history.replaceState(null, "", "#catalogo-productos");
  };

  const openReservaModal = (producto: HomeProduct) => {
    setSelectedProduct(producto);
    setReservaForm({ ...emptyReservaForm, cantidad: (producto.cantidad ?? 0) > 0 ? "1" : "0" });
    setReservaOpen(true);
  };

  const handleReservaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) return;

    reservaMutation.mutate({
      data: {
        producto_id: selectedProduct.id,
        cliente_nombre: reservaForm.cliente_nombre,
        cliente_email: reservaForm.cliente_email,
        cliente_telefono: reservaForm.cliente_telefono,
        cantidad: Number(reservaForm.cantidad) || 1,
        fecha_inicio: reservaForm.fecha_inicio,
        fecha_fin: reservaForm.fecha_fin,
        notas: reservaForm.notas || undefined,
      },
    }, {
      onSuccess: () => {
        window.open(buildWhatsAppUrl(selectedProduct, reservaForm), "_blank", "noopener,noreferrer");
        setReservaOpen(false);
        toast({
          title: "Solicitud registrada",
          description: "La reserva quedó en administración y se abrió WhatsApp para seguimiento.",
        });
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[430px] items-center overflow-hidden bg-zinc-950 py-12 text-white md:min-h-[500px] md:py-16 lg:min-h-[540px]">
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <img
              key={slide.label}
              src={slide.image}
              alt={slide.label}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-out ${
                activeSlide === index ? "scale-100 opacity-45" : "scale-105 opacity-0"
              }`}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />

        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <Badge className="mb-5 border-0 bg-primary py-1 text-sm text-white shadow-md hover:bg-primary">
              {heroSlides[activeSlide].label}
            </Badge>
            <h1 className="mb-5 text-3xl font-bold leading-tight tracking-tight transition-all duration-500 md:text-5xl">
              {heroSlides[activeSlide].title}
            </h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">
              {heroSlides[activeSlide].description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                onClick={scrollToCatalog}
                className="h-12 px-6 text-base shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                Ver Catálogo <ArrowRight className="ml-2 h-5 w-5" />
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
      <section id="catalogo-productos" className="bg-gray-50 py-10 md:py-14">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h2>
              <p className="mt-2 text-muted-foreground">
                Equipos disponibles para consulta rápida, WhatsApp o reserva inmediata.
              </p>
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
              No se pudo cargar el catálogo. Verifica que el backend esté activo.
            </div>
          ) : productosCatalogo.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
              Aún no hay productos publicados en el catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {productosCatalogo.map((producto) => {
              const agotado = (producto.cantidad ?? 0) <= 0;

              return (
                <Card key={producto.id} className="group relative overflow-hidden border bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                  <span className="absolute inset-x-0 top-0 z-10 h-1 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                  <span className="pointer-events-none absolute -left-1/2 top-0 z-20 h-full w-1/3 -skew-x-12 bg-white/20 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    {producto.imagen_url ? (
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[0.4deg]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-4xl font-bold text-gray-300 transition-transform duration-500 group-hover:scale-105">
                        {getInitials(producto.nombre)}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-75" />

                    <div className="absolute left-3 top-3 transition-transform duration-300 group-hover:-translate-y-0.5">
                      <Badge className={agotado ? "bg-destructive text-white shadow-sm" : "bg-white text-foreground shadow-sm hover:bg-white"}>
                        {getDisponibilidadLabel(producto)}
                      </Badge>
                    </div>

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
                        disabled={agotado}
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
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xl font-bold text-primary">{formatCurrency(producto.precio)}</div>
                      <Link href={`/producto/${producto.id}`} className="text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-primary group-hover:translate-x-1">
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
                <h3 className="mb-2 text-lg font-bold">Inventario Visible</h3>
                <p className="text-muted-foreground">Consulta unidades disponibles antes de solicitar o reservar.</p>
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
      <section className="bg-primary py-14 text-white">
        <div className="container mx-auto px-4 text-center md:px-8">
          <h2 className="mb-4 text-3xl font-bold">¿Necesita un pedido especial o a granel?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-primary-foreground/80">
            Nuestro equipo está preparado para atender las necesidades específicas de su operación.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="text-primary">
              <Link href="/contacto">Contactar a Ventas</Link>
            </Button>
            <Button asChild size="lg" className="border-0 bg-black text-white hover:bg-zinc-800">
              <Link href="/catalogo">Ver más equipos</Link>
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={reservaOpen} onOpenChange={setReservaOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Datos de reserva</DialogTitle>
            <DialogDescription>
              Completa los datos y los enviaremos por WhatsApp para confirmar disponibilidad.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <form onSubmit={handleReservaSubmit} className="space-y-5">
              <div className="grid gap-4 rounded-md border bg-muted/40 p-4 sm:grid-cols-[120px_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-gray-100">
                  {selectedProduct.imagen_url ? (
                    <img src={selectedProduct.imagen_url} alt={selectedProduct.nombre} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-300">
                      {getInitials(selectedProduct.nombre)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">{selectedProduct.categoria_nombre}</div>
                  <h3 className="mt-1 text-lg font-bold leading-tight">{selectedProduct.nombre}</h3>
                  <div className="mt-2 text-primary font-bold">{formatCurrency(selectedProduct.precio)}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{getDisponibilidadLabel(selectedProduct)}</div>
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
                    max={selectedProduct.cantidad || undefined}
                    value={reservaForm.cantidad}
                    onChange={(event) => setReservaForm((current) => ({ ...current, cantidad: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="home-reserva-fecha-inicio">Inicio</label>
                  <Input
                    id="home-reserva-fecha-inicio"
                    type="date"
                    min={todayDate}
                    value={reservaForm.fecha_inicio}
                    onChange={(event) => {
                      const nextInicio = event.target.value;
                      setReservaForm((current) => ({
                        ...current,
                        fecha_inicio: nextInicio,
                        fecha_fin: current.fecha_fin < nextInicio ? nextInicio : current.fecha_fin,
                      }));
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="home-reserva-fecha-fin">Fin</label>
                  <Input
                    id="home-reserva-fecha-fin"
                    type="date"
                    min={reservaForm.fecha_inicio || todayDate}
                    value={reservaForm.fecha_fin}
                    onChange={(event) => setReservaForm((current) => ({ ...current, fecha_fin: event.target.value }))}
                    required
                  />
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary sm:col-span-2">
                  Reserva por {diasReserva} día{diasReserva === 1 ? "" : "s"}.
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
                  <a href={buildWhatsAppUrl(selectedProduct)} target="_blank" rel="noreferrer">
                    <FaWhatsapp className="h-4 w-4" />
                    Consultar por WhatsApp
                  </a>
                </Button>
                <Button type="submit" className="gap-2" disabled={reservaMutation.isPending}>
                  <ClipboardList className="h-4 w-4" />
                  {reservaMutation.isPending ? "Enviando..." : "Enviar datos de reserva"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
