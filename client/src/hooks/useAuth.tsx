// src/hooks/useAuth.tsx
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
  setUser: (u: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function safeParseUser(s: string | null): AuthUser | null {
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    const id = String(parsed?.id ?? "");
    const email = String(parsed?.email ?? "");
    if (!id || !email) return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

function normalizeBackendUser(u: any): AuthUser | null {
  if (!u) return null;
  const id = String(u.id ?? u._id ?? "");
  const email = String(u.email ?? "");
  if (!id || !email) return null;

  return {
    id,
    email,
    role: u.role,
    name: u.name,
    firstName: u.firstName,
    lastName: u.lastName,
    profilePicture: u.profilePicture,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => safeParseUser(localStorage.getItem("user")));
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem("token"), [user]);

  const setUser = useCallback((u: AuthUser | null) => {
    if (!u) {
      localStorage.removeItem("user");
      setUserState(null);
      return;
    }
    localStorage.setItem("user", JSON.stringify(u));
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUserState(null);
    window.dispatchEvent(new Event("auth-logout"));
  }, []);

  // Restore + validate token on refresh
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const t = localStorage.getItem("token");

      // no token = guest
      if (!t) {
        if (!mounted) return;
        setUser(null);
        setReady(true);
        return;
      }

      // token exists: try validate with backend
      try {
        const { data } = await api.get("/auth/me");
        if (!mounted) return;

        const backendUser = normalizeBackendUser(data?.user);
        if (!backendUser) {
          // token invalid -> logout
          logout();
          setReady(true);
          return;
        }

        setUser(backendUser);
        setReady(true);
      } catch (e: any) {
        // IMPORTANT:
        // If backend is down / network issue, DO NOT wipe local session immediately.
        // api.ts will only clear token on 401; so here we just mark ready.
        if (!mounted) return;
        setReady(true);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [logout, setUser]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        setUserState(safeParseUser(localStorage.getItem("user")));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Forced logout (from api.ts interceptor)
  useEffect(() => {
    const handler = () => setUserState(null);
    window.addEventListener("auth-logout", handler);
    return () => window.removeEventListener("auth-logout", handler);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });

      const newToken = data?.token;
      const backendUser = normalizeBackendUser(data?.user);

      if (!newToken || !backendUser) {
        return { ok: false, message: "Response login tidak valid dari server." };
      }

      localStorage.setItem("token", String(newToken));
      setUser(backendUser);

      return { ok: true, user: backendUser };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Login gagal.";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const value: AuthContextValue = {
    user,
    token,
    ready,
    loading,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}
