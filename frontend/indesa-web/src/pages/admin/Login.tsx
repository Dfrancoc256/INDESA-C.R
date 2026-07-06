import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginValues } from "./schemas";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { errorMessages } from "@/lib/errorMessages";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logoIndesa from "@/assets/logo-indesa-lockup.png";
import maquinariaLogin from "@/assets/images/banner-tools.png";

export function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginValues) => {
    try {
      setIsLoading(true);
      await login(data);
    } catch (error: any) {
      const apiStatus = Number(error?.status) || 0;
      let friendlyMessage = error?.message || errorMessages.generic;

      if (apiStatus === 401) {
        friendlyMessage = errorMessages.login401;
      } else if (apiStatus >= 500) {
        friendlyMessage = errorMessages.login500;
      }

      if (apiStatus === 401) {
        form.setError("password", {
          type: "manual",
          message: friendlyMessage,
        });
      }

      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: friendlyMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(255,40,0,0.30),transparent_28%),radial-gradient(circle_at_center,rgba(255,40,0,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,40,0,0.18),transparent_26%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)))] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="w-full max-w-[440px]">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al sitio
          </Link>

          <div className="mb-5 flex justify-center">
            <img
              src={logoIndesa}
              alt="INDESA renta de equipo"
              className="h-auto w-[255px] max-w-full object-contain drop-shadow-md sm:w-[310px]"
            />
          </div>

          <Card className="overflow-hidden border shadow-xl">
            <CardHeader className="space-y-2 border-b bg-card px-6 pb-6 pt-7 text-center sm:px-8">
              <CardTitle className="text-2xl font-bold tracking-tight">Acceso administrativo</CardTitle>
              <CardDescription>Ingresa tus credenciales para continuar.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-7 sm:px-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="admin@indesa.com.gt"
                              type="email"
                              autoComplete="email"
                              disabled={isLoading}
                              className="h-12 pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Ingresa tu contraseña"
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
                              disabled={isLoading}
                              className="h-12 pl-10 pr-11"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              onClick={() => setShowPassword((value) => !value)}
                              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              disabled={isLoading}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="h-12 w-full gap-2 text-base font-semibold" disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isLoading ? "Validando..." : "Ingresar"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

        </div>
      </section>

      <aside className="relative hidden min-h-[100dvh] overflow-hidden border-l bg-foreground lg:block">
        <img
          src={maquinariaLogin}
          alt=""
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55),rgba(0,0,0,0.18))]" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <div className="mb-4 h-1 w-16 rounded-full bg-primary" />
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Administración de catálogo, inventario y reservas.
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/75">
            Control interno para mantener la operación de INDESA organizada.
          </p>
        </div>
      </aside>
    </div>
  );
}
