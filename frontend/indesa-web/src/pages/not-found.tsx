import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Wrench, Phone, CheckCircle, Package } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <div className="flex items-center justify-center text-primary mb-6">
        <Wrench className="h-16 w-16" />
      </div>
      <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">Página no encontrada</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Lo sentimos, la página que buscas no existe o ha sido movida. Verifica la URL e intenta nuevamente.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <button onClick={() => window.history.back()}>Regresar</button>
        </Button>
        <Button asChild>
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
