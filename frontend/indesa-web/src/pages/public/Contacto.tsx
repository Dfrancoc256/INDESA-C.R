import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function Contacto() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate network request since this is UI-only
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Mensaje enviado",
        description: "Hemos recibido su consulta. Nos pondremos en contacto pronto.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-[#FF2800] text-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Contacto</h1>
          <p className="text-white/90 text-lg md:text-xl">
            Estamos listos para atender sus requerimientos industriales. 
            Contáctenos para cotizaciones, asesoría técnica o soporte.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 gap-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold mb-4">Misión</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Brindar soluciones integrales de alquiler de maquinaria y equipo para la construcción,
                  ofreciendo equipos confiables, seguros y de alta calidad que contribuyan al éxito de los
                  proyectos de nuestros clientes, respaldados por un servicio eficiente, asesoría especializada
                  y un compromiso permanente con la excelencia.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold mb-4">Visión</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ser la empresa líder y referente en el alquiler de maquinaria y equipo para la construcción
                  en Guatemala, reconocida por la calidad de nuestros servicios, la innovación de nuestras
                  soluciones, la confianza de nuestros clientes y nuestra contribución al desarrollo de la
                  infraestructura del país.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto mt-2">
          
          {/* Contact Info */}
          <div>
            <h2 className="text-3xl font-bold mb-8">Información Corporativa</h2>
            
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit text-primary">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Dirección Principal</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    29 calle 14-24 zona 13<br />
                    Colonia La Libertad<br />
                    Ciudad de Guatemala, Guatemala
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit text-primary">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Teléfonos</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Oficina: +502 2298-4932<br />
                    WhatsApp: +502 5214-9029
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Correos Electrónicos</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Ventas: ventas@indesa.com.gt<br />
                    Información: info@indesa.com.gt<br />
                    Proveedores: compras@indesa.com.gt
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 p-3 rounded-full h-fit text-primary">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Horarios de Atención</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Lunes a Viernes: 8:00 AM - 5:00 PM<br />
                    Sábados: 8:00 AM - 12:00 PM<br />
                    Domingos: Cerrado
                  </p>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="mt-10 overflow-hidden rounded-lg border shadow-inner">
              <iframe
                title="Ubicación INDESA"
                src="https://www.google.com/maps?q=29%20calle%2014-24%20zona%2013%20colonia%20la%20libertad%20ciudad%20de%20guatemala&output=embed"
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <Card className="border-0 shadow-xl bg-white h-full">
              <CardContent className="p-8 md:p-10">
                <h2 className="text-2xl font-bold mb-2">Envíenos un mensaje</h2>
                <p className="text-muted-foreground mb-8">
                  Complete el formulario y un asesor se comunicará con usted en menos de 24 horas hábiles.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nombre completo *</label>
                      <Input required placeholder="Ej. Carlos Martínez" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Empresa</label>
                      <Input placeholder="Ej. Constructora S.A." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Correo electrónico *</label>
                      <Input required type="email" placeholder="carlos@empresa.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Teléfono *</label>
                      <Input required placeholder="Ej. 55554444" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asunto *</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" required>
                      <option value="">Seleccione una opción</option>
                      <option value="cotizacion">Solicitud de Cotización</option>
                      <option value="distribucion">Información sobre Distribución</option>
                      <option value="soporte">Soporte Técnico</option>
                      <option value="reclamos">Garantías o Reclamos</option>
                      <option value="otros">Otras Consultas</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensaje *</label>
                    <Textarea 
                      required 
                      className="min-h-[150px] resize-none" 
                      placeholder="Describa su requerimiento o consulta en detalle..."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>Enviar Mensaje <Send className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
