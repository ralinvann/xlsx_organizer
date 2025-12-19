import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export type AuthUser = {
  id: string;
  email: string;
  role?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
};

type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function safeParseUser(s: string | null): AuthUser | null {
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    const id = String(parsed?.id ?? "");
    const email = String(parsed?.email ?? "");
    if (!id || !email) return null;
    return {
      id,
      email,
      role: parsed?.role,
      name: parsed?.name,
      firstName: parsed?.firstName,
      lastName: parsed?.lastName,
      profilePicture: parsed?.profilePicture,
    };
  } catch {
    return null;
  }
}

function normalizeBackendUser(backendUser: any): AuthUser | null {
  if (!backendUser) return null;

  const id = String(backendUser.id ?? backendUser._id ?? "");
  const email = String(backendUser.email ?? "");
  if (!id || !email) return null;

  return {
    id,
    email,
    role: backendUser.role,
    name: backendUser.name,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    profilePicture: backendUser.profilePicture,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => safeParseUser(localStorage.getItem("user")));
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem("token"), [user]);

  const persistUser = useCallback((u: AuthUser | null) => {
    if (!u) {
      localStorage.removeItem("user");
      setUser(null);
      return;
    }
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    // inform the rest of the app
    window.dispatchEvent(new Event("auth-logout"));
  }, []);

  const refreshMe = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) {
      persistUser(null);
      return;
    }

    // validate token + rehydrate user from backend
    const { data } = await api.get("/auth/me");
    const u = normalizeBackendUser(data?.user);

    if (!u) {
      logout();
      return;
    }

    persistUser(u);
  }, [logout, persistUser]);

  // Single init on app load (the whole point of Provider)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const t = localStorage.getItem("token");
        if (!t) {
          if (!mounted) return;
          persistUser(null);
          setReady(true);
          return;
        }

        // If backend is down, do NOT wipe the cached session here.
        // Only wipe session if backend returns 401 (api interceptor already handles that).
        try {
          await refreshMe();
        } catch {
          // keep cached user
        }

        if (!mounted) return;
        setReady(true);
      } catch {
        if (!mounted) return;
        setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [persistUser, refreshMe]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        setUser(safeParseUser(localStorage.getItem("user")));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Forced logout from api.ts (401 handler)
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("auth-logout", handler);
    return () => window.removeEventListener("auth-logout", handler);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });

      const newToken = data?.token;
      const backendUser = data?.user;

      if (!newToken || !backendUser) {
        return { ok: false, message: "Response login tidak valid dari server." };
      }

      localStorage.setItem("token", String(newToken));

      const normalized = normalizeBackendUser(backendUser);
      if (!normalized) {
        localStorage.removeItem("token");
        return { ok: false, message: "Data user tidak lengkap." };
      }

      persistUser(normalized);
      return { ok: true, user: normalized };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Login gagal.";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  const value: AuthContextValue = {
    user,
    token,
    ready,
    loading,
    login,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be used inside <AuthProvider>.");
  }
  return ctx;
}
