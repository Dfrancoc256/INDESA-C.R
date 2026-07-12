import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export function Contacto() {
  const googleMapsUrl = "https://maps.app.goo.gl/thbNvAJQZdETskmB7?g_st=ic";
  const embeddedMapUrl = "https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3861.604553806485!2d-90.53107002489455!3d14.56459208591748!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTTCsDMzJzUyLjUiTiA5MMKwMzEnNDIuNiJX!5e0!3m2!1ses!2sgt!4v1783893165764!5m2!1ses!2sgt";

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#FF2800] py-16 text-white md:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center md:px-8">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Nosotros</h1>
          <p className="text-lg text-white/90 md:text-xl">
            Conozca quiénes somos, nuestra misión, visión y la información corporativa de INDESA.
          </p>
        </div>
      </div>

      <div className="container mx-auto flex flex-col gap-10 px-4 py-12 md:px-8 md:py-20">
        <section className="mx-auto w-full max-w-6xl">
          <div className="mb-6">
            <h2 className="text-3xl font-bold">¿Quiénes somos?</h2>
            <p className="mt-2 text-muted-foreground">
              Nuestra razón de ser se resume en estas dos bases que guían el trabajo de INDESA.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <Card className="group border-0 shadow-lg animate-card-float transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl">
              <CardContent className="p-8 transition-all duration-300 group-hover:shadow-[0_24px_48px_rgba(0,0,0,0.14)]">
                <h3 className="mb-4 text-2xl font-bold">Misión</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Brindar soluciones integrales de alquiler de maquinaria y equipo para la construcción,
                  ofreciendo equipos confiables, seguros y de alta calidad que contribuyan al éxito de los
                  proyectos de nuestros clientes, respaldados por un servicio eficiente, asesoría especializada
                  y un compromiso permanente con la excelencia.
                </p>
              </CardContent>
            </Card>

            <Card className="group border-0 shadow-lg animate-card-float transition-transform duration-300 [animation-delay:-2.4s] hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl">
              <CardContent className="p-8 transition-all duration-300 group-hover:shadow-[0_24px_48px_rgba(0,0,0,0.14)]">
                <h3 className="mb-4 text-2xl font-bold">Visión</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Ser la empresa líder y referente en el alquiler de maquinaria y equipo para la construcción
                  en Guatemala, reconocida por la calidad de nuestros servicios, la innovación de nuestras
                  soluciones, la confianza de nuestros clientes y nuestra contribución al desarrollo de la
                  infraestructura del país.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl">
          <div className="mb-6">
            <h2 className="text-3xl font-bold">Información Corporativa</h2>
            <p className="mt-2 text-muted-foreground">
              Aquí encontrarás nuestros datos de contacto y ubicación principal.
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="grid gap-8 p-8 md:grid-cols-2">
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="h-fit rounded-full bg-primary/10 p-3 text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-bold">Dirección Principal</h3>
                    <p className="leading-relaxed text-muted-foreground">
                    29 calle 14-24, zona 13. Col. La libertad ll<br />
                    Ciudad de Guatemala, Guatemala
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-fit rounded-full bg-primary/10 p-3 text-primary">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-bold">Teléfonos</h3>
                    <p className="leading-relaxed text-muted-foreground">
                      Oficina: +502 2298-4932<br />
                      WhatsApp: +502 5214-9029
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="h-fit rounded-full bg-primary/10 p-3 text-primary">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-bold">Correos Electrónicos</h3>
                    <p className="leading-relaxed text-muted-foreground">
                      Rentas: rentas@somosindesa.com<br />
                      Gerencia: gerencia@somosindesa.com
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-fit rounded-full bg-primary/10 p-3 text-primary">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-bold">Horarios de Atención</h3>
                    <p className="leading-relaxed text-muted-foreground">
                      Lunes a Viernes: 8:00 AM - 5:00 PM<br />
                      Sábados: 8:00 AM - 12:00 PM<br />
                      Domingos: Cerrado
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-10 overflow-hidden rounded-lg border shadow-inner">
            <iframe
              title="Ubicación INDESA"
              src={embeddedMapUrl}
              className="h-[340px] w-full border-0 md:h-[420px]"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Abrir en Google Maps
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
