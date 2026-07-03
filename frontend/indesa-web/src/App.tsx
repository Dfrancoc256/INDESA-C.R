import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useEffect } from 'react';

// Pages
import NotFound from '@/pages/not-found';
import { Home } from '@/pages/public/Home';
import { Catalogo } from '@/pages/public/Catalogo';
import { ProductoDetalle } from '@/pages/public/ProductoDetalle';
import { Reservar } from '@/pages/public/Reservar';
import { Contacto } from '@/pages/public/Contacto';
import { Login } from '@/pages/admin/Login';
import { Dashboard } from '@/pages/admin/Dashboard';
import { ProductosList } from '@/pages/admin/ProductosList';
import { ProductoNuevo } from '@/pages/admin/ProductoNuevo';
import { ProductoEditar } from '@/pages/admin/ProductoEditar';
import { Inventario } from '@/pages/admin/Inventario';
import { Reservas } from '@/pages/admin/Reservas';
import { Usuarios } from '@/pages/admin/Usuarios';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);

  return null;
}

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location]);

  return null;
}

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/catalogo">
        <Catalogo />
      </Route>
      <Route path="/productos/:id">
        <ProductoDetalle />
      </Route>
      <Route path="/productos">
        <Catalogo />
      </Route>
      <Route path="/producto/:id">
        <ProductoDetalle />
      </Route>
      <Route path="/reservar">
        <Reservar />
      </Route>
      <Route path="/reserva">
        <Reservar />
      </Route>
      <Route path="/contacto">
        <Contacto />
      </Route>
      <Route path="/inicio">
        <Home />
      </Route>
      <Route path="/">
        <Home />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function Router() {
  return (
    <Switch>
      {/* Admin Auth Route */}
      <Route path="/admin/login">
        <Login />
      </Route>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/acceso">
        <Login />
      </Route>

      {/* Admin Protected Routes */}
      <Route path="/admin/dashboard">
        <AdminLayout><Dashboard /></AdminLayout>
      </Route>
      <Route path="/admin/productos/nuevo">
        <AdminLayout><ProductoNuevo /></AdminLayout>
      </Route>
      <Route path="/admin/productos/editar/:id">
        <AdminLayout><ProductoEditar /></AdminLayout>
      </Route>
      <Route path="/admin/productos">
        <AdminLayout><ProductosList /></AdminLayout>
      </Route>
      <Route path="/admin/inventario">
        <AdminLayout><Inventario /></AdminLayout>
      </Route>
      <Route path="/admin/reservas">
        <AdminLayout><Reservas /></AdminLayout>
      </Route>
      <Route path="/admin/usuarios">
        <AdminLayout><Usuarios /></AdminLayout>
      </Route>
      <Route path="/admin">
        <Redirect to="/admin/dashboard" />
      </Route>

      {/* Public routes keep one shared layout mounted */}
      <Route>
        <PublicLayout>
          <PublicRoutes />
        </PublicLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <ScrollToTop />
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
