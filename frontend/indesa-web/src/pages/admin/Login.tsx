import { useEffect, useMemo, useState } from "react";
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
import { getFriendlyApiErrorMessage } from "@/lib/apiErrorMessage";
import { apiFetch } from "@/lib/apiFetch";
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [temporaryLogin, setTemporaryLogin] = useState<LoginValues | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [retryCountdown, setRetryCountdown] = useState(0);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (retryCountdown <= 0) return;

    const intervalId = window.setInterval(() => {
      setRetryCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [retryCountdown]);

  const retryCountdownLabel = useMemo(() => {
    const minutes = Math.floor(retryCountdown / 60);
    const seconds = retryCountdown % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [retryCountdown]);

  const onSubmit = async (data: LoginValues) => {
    try {
      setIsLoading(true);
      form.clearErrors();
      await login(data);
    } catch (error: any) {
      const apiStatus = Number(error?.status || error?.response?.status) || 0;
      const requiresPasswordChange = apiStatus === 428 || error?.data?.requires_password_change;

      if (requiresPasswordChange) {
        setTemporaryLogin(data);
        setNewPassword("");
        setConfirmPassword("");
        toast({
          title: "Contraseña temporal detectada",
          description: "Por seguridad, crea una nueva contraseña para continuar.",
        });
        return;
      }

      const friendlyMessage =
        apiStatus === 401
          ? errorMessages.login401
          : getFriendlyApiErrorMessage(error, errorMessages.generic);

      if (apiStatus === 429) {
        const retrySeconds = Number(error?.data?.retryAfterSeconds || 15 * 60);
        const safeRetrySeconds = Math.max(1, retrySeconds);
        setRetryCountdown(safeRetrySeconds);
        const minutes = Math.floor(safeRetrySeconds / 60);
        const seconds = safeRetrySeconds % 60;
        const retryLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;
        toast({
          variant: "destructive",
          title: "Acceso pausado temporalmente",
          description: `Por seguridad, espera ${retryLabel} antes de volver a intentar.`,
        });
        return;
      }

      if (apiStatus === 401) {
        form.setError("email", {
          type: "manual",
          message: errorMessages.login401,
        });
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

  const handlePasswordChange = async () => {
    if (!temporaryLogin) return;

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Contraseña muy corta",
        description: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Las contraseñas no coinciden",
        description: "Confirma nuevamente la contraseña para continuar.",
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await apiFetch("/api/auth/complete-password-change", {
        method: "POST",
        body: JSON.stringify({
          email: temporaryLogin.email,
          current_password: temporaryLogin.password,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw Object.assign(new Error(data?.error || "No fue posible actualizar la contraseña"), {
          status: response.status,
          data,
        });
      }

      await login({ email: temporaryLogin.email, password: newPassword });
      toast({
        title: "Contraseña cambiada",
        description: "La contraseña se cambió correctamente. Ya puedes continuar con tu sesión.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "No fue posible cambiar la contraseña",
        description: getFriendlyApiErrorMessage(error, "Intenta nuevamente con una contraseña válida."),
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(255,40,0,0.30),transparent_28%),radial-gradient(circle_at_center,rgba(255,40,0,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,40,0,0.18),transparent_26%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)))] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:px-6 lg:px-10 animate-route-enter">
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

          <Card className="overflow-hidden border shadow-xl animate-route-enter">
            <CardHeader className="space-y-2 border-b bg-card px-6 pb-6 pt-7 text-center sm:px-8">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {temporaryLogin ? "Crear nueva contraseña" : "Acceso administrativo"}
              </CardTitle>
              <CardDescription>
                {temporaryLogin
                  ? "Esta contraseña será la definitiva para tus próximos ingresos."
                  : "Ingresa tus credenciales para continuar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-7 sm:px-8">
              {temporaryLogin ? (
                <div className="space-y-5">
                  <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                    Usuario: <span className="font-semibold text-foreground">{temporaryLogin.email}</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="new-password">Nueva contraseña</label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="new-password"
                        placeholder="Mínimo 8 caracteres"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        disabled={isChangingPassword}
                        className="h-12 pl-10 pr-11"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => setShowNewPassword((value) => !value)}
                        aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        disabled={isChangingPassword}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="confirm-password">Confirmar contraseña</label>
                    <Input
                      id="confirm-password"
                      placeholder="Repite la nueva contraseña"
                      type="password"
                      autoComplete="new-password"
                      disabled={isChangingPassword}
                      className="h-12"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                  <Button type="button" className="h-12 w-full gap-2 text-base font-semibold" disabled={isChangingPassword} onClick={handlePasswordChange}>
                    {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isChangingPassword ? "Guardando..." : "Guardar y continuar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={isChangingPassword}
                    onClick={() => setTemporaryLogin(null)}
                  >
                    Volver al login
                  </Button>
                </div>
              ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {retryCountdown > 0 && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-foreground">Demasiados intentos de acceso</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Podrás intentar nuevamente en <span className="font-bold text-primary">{retryCountdownLabel}</span>.
                      </p>
                    </div>
                  )}
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
                              placeholder="Ingresa tu usuario"
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

                  <Button type="submit" className="h-12 w-full gap-2 text-base font-semibold transition-transform duration-200 active:scale-[0.98]" disabled={isLoading || retryCountdown > 0}>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {retryCountdown > 0 ? `Espera ${retryCountdownLabel}` : isLoading ? "Validando..." : "Ingresar"}
                  </Button>
                </form>
              </Form>
              )}
            </CardContent>
          </Card>

        </div>
      </section>

      <aside className="relative hidden min-h-[100dvh] overflow-hidden border-l bg-foreground lg:block animate-route-enter">
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
