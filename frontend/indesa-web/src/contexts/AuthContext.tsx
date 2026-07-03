import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetMe, login as apiLogin, logout as apiLogout, useRefreshToken, LoginInput, UsuarioMe, getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  usuario: UsuarioMe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Configure API client to use our token
    setAuthTokenGetter(() => localStorage.getItem("indesa_access_token"));
  }, []);

  const { data: meData, error, isLoading: isMeLoading } = useGetMe({
    query: {
      enabled: !!localStorage.getItem("indesa_access_token"),
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  useEffect(() => {
    if (meData) {
      setUsuario(meData);
    }
    if (error) {
      // Si el token es inválido, deberíamos intentar el refresh token.
      // Por simplicidad, limpiaremos la sesión aquí.
      localStorage.removeItem("indesa_access_token");
      localStorage.removeItem("indesa_refresh_token");
      setUsuario(null);
    }
    setIsLoading(isMeLoading);
  }, [meData, error, isMeLoading]);

  // Si no hay token de inicio, terminamos el loading rápido
  useEffect(() => {
    if (!localStorage.getItem("indesa_access_token")) {
      setIsLoading(false);
    }
  }, []);

  const login = async (data: LoginInput) => {
    try {
      const response = await apiLogin(data);
      localStorage.setItem("indesa_access_token", response.access_token);
      localStorage.setItem("indesa_refresh_token", response.refresh_token);
      setUsuario(response.usuario);
      setLocation("/admin/dashboard");
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (localStorage.getItem("indesa_access_token")) {
        await apiLogout();
      }
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem("indesa_access_token");
      localStorage.removeItem("indesa_refresh_token");
      setUsuario(null);
      setLocation("/admin/login");
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, isAuthenticated: !!usuario, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
