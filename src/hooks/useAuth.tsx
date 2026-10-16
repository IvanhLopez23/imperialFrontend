import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { get, post, tokens } from "../api/client";

export interface AuthUser {
  id: number;
  username: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  role: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  setUser: (u: AuthUser | null) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokens.access && !tokens.refresh) {
      setUser(null);
      return null;
    }
    try {
      const me = await get<AuthUser>("/auth/me");
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await post<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/login", {
      username,
      password,
    });
    tokens.set(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await post("/auth/logout", { refreshToken: tokens.refresh });
    } catch {
      /* aunque falle, cerramos la sesión local */
    }
    tokens.clear();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refreshUser, setUser }}>{children}</Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

// Envuelve el panel: si no hay sesión, manda a /administrador
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-splash">Cargando…</div>;
  if (!user) return <Navigate to="/administrador" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
