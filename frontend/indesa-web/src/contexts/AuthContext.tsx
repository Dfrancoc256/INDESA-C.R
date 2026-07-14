import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { setAuthTokenGetter, setUnauthorizedHandler } from "@workspace/api-client-react";
import { useGetMe, logout as apiLogout, refreshToken as apiRefreshToken, LoginInput, UsuarioMe, getGetMeQueryKey, type AuthResponse } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";
import { errorMessages } from "@/lib/errorMessages";
import { apiFetch, resetSessionExpiredEvent, SESSION_EXPIRED_EVENT } from "@/lib/apiFetch";
import { getAdminHomePath } from "@/lib/adminNavigation";

const SESSION_MARKER_KEY = "indesa_session_active";
const LAST_ACTIVITY_KEY = "indesa_last_activity_at";
const LAST_REFRESH_KEY = "indesa_last_refresh_at";
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
const SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const ACTIVITY_REFRESH_THROTTLE_MS = 5 * 60 * 1000;

const clearLegacyVisibleTokens = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("indesa_access_token");
  window.localStorage.removeItem("indesa_refresh_token");
};

const hasSessionMarker = () => {
  if (typeof window === "undefined") return null;
  clearLegacyVisibleTokens();
  return window.localStorage.getItem(SESSION_MARKER_KEY) === "true";
};

const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  clearLegacyVisibleTokens();
  window.localStorage.removeItem(SESSION_MARKER_KEY);
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  window.localStorage.removeItem(LAST_REFRESH_KEY);
};

const markSessionActive = () => {
  if (typeof window === "undefined") return;
  clearLegacyVisibleTokens();
  window.localStorage.setItem(SESSION_MARKER_KEY, "true");
};

const markActivity = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
};

const markRefresh = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
};

const getLastActivity = () => {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
};

const getLastRefresh = () => {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(LAST_REFRESH_KEY) || 0);
};

setAuthTokenGetter(null);

interface AuthContextType {
  usuario: UsuarioMe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<UsuarioMe | null>(null);
  const [hasStoredToken, setHasStoredToken] = useState(() => Boolean(hasSessionMarker()));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const unauthorizedHandledRef = useRef(false);
  const logoutInProgressRef = useRef(false);
  const refreshInProgressRef = useRef(false);
  const [, setLocation] = useLocation();

  const { data: meData, error, isLoading: isMeLoading } = useGetMe({
    query: {
      enabled: hasStoredToken && !usuario,
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  const logout = useCallback((options?: { remote?: boolean; redirect?: boolean }) => {
    const shouldCallRemoteLogout = options?.remote ?? true;
    const shouldRedirect = options?.redirect ?? true;

    logoutInProgressRef.current = true;
    unauthorizedHandledRef.current = false;

    clearStoredSession();
    queryClient.clear();
    resetSessionExpiredEvent();
    setHasStoredToken(false);
    setUsuario(null);
    setIsLoading(false);

    if (shouldRedirect) {
      setLocation("/admin/login");
    }

    if (shouldCallRemoteLogout) {
      void apiLogout().catch(() => {
        // La sesión local ya quedó cerrada; la revocación remota es secundaria.
      });
    }

    window.setTimeout(() => {
      logoutInProgressRef.current = false;
    }, 0);
  }, [queryClient, setLocation]);

  const refreshSession = useCallback(async (options?: { notifyOnFailure?: boolean }) => {
    if (refreshInProgressRef.current) {
      return true;
    }

    if (!hasSessionMarker()) {
      if (options?.notifyOnFailure) {
        toast({
          variant: "destructive",
          title: "Sesión finalizada",
          description: errorMessages.sessionExpired,
        });
      }
      logout({ remote: false });
      return false;
    }

    try {
      refreshInProgressRef.current = true;
      setIsRefreshingSession(true);
      const response = await apiRefreshToken({ refresh_token: "" });
      markSessionActive();
      markRefresh();
      resetSessionExpiredEvent();
      unauthorizedHandledRef.current = false;
      setHasStoredToken(true);
      setUsuario(response.usuario);
      setIsLoading(false);
      return true;
    } catch {
      if (options?.notifyOnFailure) {
        toast({
          variant: "destructive",
          title: "Sesión finalizada",
          description: errorMessages.sessionExpired,
        });
      }
      logout({ remote: false });
      return false;
    } finally {
      refreshInProgressRef.current = false;
      setIsRefreshingSession(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!hasStoredToken) {
      setUsuario(null);
      setIsLoading(false);
      return;
    }

    const lastActivity = getLastActivity();
    if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
      clearStoredSession();
      setHasStoredToken(false);
      setUsuario(null);
      setIsLoading(false);
      setLocation("/admin/login");
      return;
    }

    if (!hasStoredToken) {
      setUsuario(null);
      setIsLoading(false);
      return;
    }

    if (meData) {
      setUsuario(meData);
      setIsLoading(false);
      return;
    }

    if (error) {
      if (!isRefreshingSession) {
        void refreshSession({ notifyOnFailure: true });
        return;
      }

      logout({ remote: false });
      return;
    }

    setIsLoading(isMeLoading);
  }, [error, hasStoredToken, isMeLoading, isRefreshingSession, logout, meData, refreshSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredToken || !usuario) return;

    markActivity();

    const events: Array<keyof WindowEventMap> = ["click", "keydown", "mousemove", "scroll", "touchstart", "input", "pointerdown", "focus"];
    let timeoutId = window.setTimeout(() => {
      toast({
        variant: "destructive",
        title: "Sesión finalizada",
        description: "Cerramos la sesión por 20 minutos de inactividad.",
      });
      logout({ remote: false });
    }, INACTIVITY_TIMEOUT_MS);

    const resetTimer = () => {
      markActivity();
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Sesión finalizada",
          description: "Cerramos la sesión por 20 minutos de inactividad.",
        });
        logout({ remote: false });
      }, INACTIVITY_TIMEOUT_MS);

      const lastRefresh = getLastRefresh();
      if (!lastRefresh || Date.now() - lastRefresh > ACTIVITY_REFRESH_THROTTLE_MS) {
        void refreshSession();
      }
    };

    const documentEvents: Array<keyof DocumentEventMap> = [
      "click",
      "keydown",
      "mousedown",
      "mousemove",
      "pointerdown",
      "pointermove",
      "scroll",
      "touchstart",
      "touchmove",
      "wheel",
      "input",
      "focusin",
    ];

    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true, capture: true }));
    documentEvents.forEach((eventName) => document.addEventListener(eventName, resetTimer, { passive: true, capture: true }));

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer, { capture: true }));
      documentEvents.forEach((eventName) => document.removeEventListener(eventName, resetTimer, { capture: true }));
    };
  }, [hasStoredToken, logout, refreshSession, usuario]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredToken) return;

    const intervalId = window.setInterval(() => {
      const lastActivity = getLastActivity();
      if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        toast({
          variant: "destructive",
          title: "Sesión expirada",
          description: errorMessages.sessionExpired,
        });
        logout({ remote: false });
        return;
      }

      void refreshSession();
    }, SESSION_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasStoredToken, logout, refreshSession]);

  useEffect(() => {
    setUnauthorizedHandler((error) => {
      if (logoutInProgressRef.current || unauthorizedHandledRef.current) {
        return;
      }

      unauthorizedHandledRef.current = true;
      const lastActivity = getLastActivity();
      if (!lastActivity || Date.now() - lastActivity <= INACTIVITY_TIMEOUT_MS) {
        void refreshSession({ notifyOnFailure: true });
        return;
      }

      toast({
        variant: "destructive",
        title: "Sesión expirada",
        description: errorMessages.sessionExpired,
      });
      logout({ remote: false });
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout, refreshSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSessionExpired = () => {
      if (logoutInProgressRef.current || unauthorizedHandledRef.current) {
        return;
      }

      unauthorizedHandledRef.current = true;
      void refreshSession({ notifyOnFailure: true });
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [refreshSession]);

  const login = async (data: LoginInput) => {
    try {
      const loginResponse = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const responseData = await loginResponse.json().catch(() => null);
      const retryAfterSeconds = Number(loginResponse.headers.get("retry-after") || 0);

      if (!loginResponse.ok) {
        const errorData = responseData && typeof responseData === "object"
          ? { ...responseData, retryAfterSeconds }
          : { retryAfterSeconds };
        throw Object.assign(new Error(responseData?.error || "No fue posible iniciar sesión"), {
          status: loginResponse.status,
          data: errorData,
        });
      }

      if (responseData?.requires_password_change) {
        throw Object.assign(new Error(responseData.message || "Debe cambiar la contraseña temporal"), {
          status: 428,
          data: responseData,
        });
      }

      if (responseData?.login_failed) {
        throw Object.assign(new Error(responseData.message || "Credenciales inválidas"), {
          status: 401,
          data: responseData,
        });
      }

      const response = responseData as AuthResponse;
      queryClient.clear();
      markSessionActive();
      markRefresh();
      markActivity();
      resetSessionExpiredEvent();
      unauthorizedHandledRef.current = false;
      setHasStoredToken(true);
      setUsuario(response.usuario);
      setIsLoading(false);
      setLocation(getAdminHomePath(response.usuario));
    } catch (err) {
      throw err;
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
