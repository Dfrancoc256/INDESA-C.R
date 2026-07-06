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
      <div className="bg-zinc-900 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Contacto</h1>
          <p className="text-zinc-300 text-lg md:text-xl">
            Estamos listos para atender sus requerimientos industriales. 
            Contáctenos para cotizaciones, asesoría técnica o soporte.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          
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
                    Avenida Reforma 9-55, Zona 10<br />
                    Edificio Reforma 10, Nivel 5<br />
                    Ciudad de Guatemala, Guatemala 01010
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
                    PBX: +502 2222-3333<br />
                    Ventas Directas: +502 5555-4444<br />
                    Soporte Técnico: +502 5843-3796
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

            {/* Simulated Map */}
            <div className="mt-10 bg-gray-200 h-64 rounded-lg w-full flex items-center justify-center border text-muted-foreground shadow-inner">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Mapa de Ubicación
              </span>
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
