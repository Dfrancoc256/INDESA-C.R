import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { setAuthTokenGetter, setUnauthorizedHandler } from "@workspace/api-client-react";
import { useGetMe, login as apiLogin, logout as apiLogout, refreshToken as apiRefreshToken, LoginInput, UsuarioMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";
import { errorMessages } from "@/lib/errorMessages";

const ACCESS_TOKEN_KEY = "indesa_access_token";
const REFRESH_TOKEN_KEY = "indesa_refresh_token";
const LAST_ACTIVITY_KEY = "indesa_last_activity_at";
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

const getStoredAccessToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
};

const markActivity = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
};

const getLastActivity = () => {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
};

const getTokenExpiryAt = (token: string | null) => {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded =
      typeof window !== "undefined"
        ? window.atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const data = JSON.parse(decoded) as { exp?: number };
    return typeof data.exp === "number" ? data.exp * 1000 : null;
  } catch {
    return null;
  }
};

setAuthTokenGetter(getStoredAccessToken);

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
  const [hasStoredToken, setHasStoredToken] = useState(() => Boolean(getStoredAccessToken()));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const unauthorizedHandledRef = useRef(false);
  const logoutInProgressRef = useRef(false);
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
    const token = getStoredAccessToken();

    logoutInProgressRef.current = true;
    unauthorizedHandledRef.current = false;

    clearStoredSession();
    setHasStoredToken(false);
    setUsuario(null);
    setIsLoading(false);

    if (shouldRedirect) {
      setLocation("/admin/login");
    }

    if (shouldCallRemoteLogout && token) {
      void apiLogout({ headers: { Authorization: `Bearer ${token}` } }).catch(() => {
        // La sesión local ya quedó cerrada; la revocación remota es secundaria.
      });
    }

    window.setTimeout(() => {
      logoutInProgressRef.current = false;
    }, 0);
  }, [setLocation]);

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
      const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

      if (refreshToken && !isRefreshingSession) {
        setIsRefreshingSession(true);
        void (async () => {
          try {
            const response = await apiRefreshToken({ refresh_token: refreshToken });
            localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
            localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
            unauthorizedHandledRef.current = false;
            setHasStoredToken(true);
            setUsuario(response.usuario);
            setIsLoading(false);
          } catch {
            logout({ remote: false });
          } finally {
            setIsRefreshingSession(false);
          }
        })();
        return;
      }

      logout({ remote: false });
      return;
    }

    setIsLoading(isMeLoading);
  }, [error, hasStoredToken, isMeLoading, isRefreshingSession, logout, meData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredToken || !usuario) return;

    markActivity();

    const events: Array<keyof WindowEventMap> = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    let timeoutId = window.setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT_MS);

    const resetTimer = () => {
      markActivity();
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [hasStoredToken, usuario]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredToken) return;

    const accessToken = getStoredAccessToken();
    const expiresAt = getTokenExpiryAt(accessToken);
    if (!expiresAt) return;

    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      toast({
        variant: "destructive",
        title: "Sesión expirada",
        description: errorMessages.sessionExpired,
      });
      logout({ remote: false });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      toast({
        variant: "destructive",
        title: "Sesión expirada",
        description: errorMessages.sessionExpired,
      });
      logout({ remote: false });
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasStoredToken, logout]);

  useEffect(() => {
    setUnauthorizedHandler((error) => {
      if (logoutInProgressRef.current || unauthorizedHandledRef.current) {
        return;
      }

      unauthorizedHandledRef.current = true;
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
  }, [logout]);

  const login = async (data: LoginInput) => {
    try {
      const response = await apiLogin(data);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      markActivity();
      unauthorizedHandledRef.current = false;
      setHasStoredToken(true);
      setUsuario(response.usuario);
      setIsLoading(false);
      setLocation("/admin/dashboard");
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
