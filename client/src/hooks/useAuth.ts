// src/hooks/useAuth.ts
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export type AuthUser = {
  id: string;
  email: string;
  role?: string;
  name?: string;
};

type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

function safeParseUser(s: string | null): AuthUser | null {
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    const id = String(parsed?.id ?? "");
    const email = String(parsed?.email ?? "");
    if (!id || !email) return null;
    return { id, email, role: parsed?.role, name: parsed?.name };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() =>
    safeParseUser(localStorage.getItem("user"))
  );
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const persistUser = (u: AuthUser | null) => {
    if (!u) {
      localStorage.removeItem("user");
      setUser(null);
      return;
    }
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.dispatchEvent(new Event("auth-logout"));
  }, []);

  // Restore + validate session on refresh
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const token = localStorage.getItem("token");

      // no token = not logged in
      if (!token) {
        if (!mounted) return;
        persistUser(null);
        setReady(true);
        return;
      }

      // token exists: validate with backend
      try {
        const { data } = await api.get("/auth/me");
        const backendUser = data?.user ?? null;

        if (!mounted) return;

        if (!backendUser) {
          // backend says no user -> treat as logout
          logout();
          setReady(true);
          return;
        }

        const normalized: AuthUser = {
          id: String(backendUser.id ?? backendUser._id ?? ""),
          email: String(backendUser.email ?? ""),
          role: backendUser.role,
          name: backendUser.name,
        };

        if (!normalized.id || !normalized.email) {
          logout();
          setReady(true);
          return;
        }

        persistUser(normalized);
        setReady(true);
      } catch (e: any) {
        // IMPORTANT:
        // - if 401, api.ts will already clear token and dispatch auth-logout
        // - if network/server down, DO NOT wipe session; keep cached user and mark ready
        if (!mounted) return;
        setReady(true);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [logout]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        const u = safeParseUser(localStorage.getItem("user"));
        setUser(u);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Forced logout (from api.ts interceptor)
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
      const u = data?.user;

      if (!newToken || !u) {
        return { ok: false, message: "Response login tidak valid dari server." };
      }

      localStorage.setItem("token", String(newToken));

      const normalized: AuthUser = {
        id: String(u.id ?? u._id ?? ""),
        email: String(u.email ?? ""),
        role: u.role,
        name: u.name,
      };

      if (!normalized.id || !normalized.email) {
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
  }, []);

  return {
    user,
    token: localStorage.getItem("token"),
    ready,
    loading,
    login,
    logout,
  };
}
