import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

  const id = String(u.id ?? u._id ?? u.userId ?? "");
  const email = String(u.email ?? "");
  if (!id || !email) return null;

  const firstName = u.firstName ? String(u.firstName) : undefined;
  const lastName = u.lastName ? String(u.lastName) : undefined;

  const name =
    (u.name ? String(u.name) : "") ||
    [firstName, u.middleName ? String(u.middleName) : "", lastName].filter(Boolean).join(" ").trim() ||
    undefined;

  const profilePictureRaw = u.profilePicture ?? u.avatar ?? u.avatarUrl ?? u.profilePictureUrl ?? "";

  return {
    id,
    email,
    role: u.role ? String(u.role) : undefined,
    name,
    firstName,
    lastName,
    profilePicture: profilePictureRaw ? String(profilePictureRaw) : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => safeParseUser(localStorage.getItem("user")));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setToken(null);
    setUserState(null);
    window.dispatchEvent(new Event("auth-logout"));
  }, []);

  // Restore + validate token on refresh
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const t = localStorage.getItem("token");
      setToken(t);

      if (!t) {
        if (!mounted) return;
        setUser(null);
        setReady(true);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        if (!mounted) return;

        const candidate = (data as any)?.user ?? (data as any)?.data?.user ?? data;
        const backendUser = normalizeBackendUser(candidate);

        if (!backendUser) {
          logout();
          setReady(true);
          return;
        }

        setUser(backendUser);
        setReady(true);
      } catch {
        if (!mounted) return;
        // if backend down, keep session
        setReady(true);
      }
    };

    void init();
    return () => {
      mounted = false;
    };
  }, [logout, setUser]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") setToken(localStorage.getItem("token"));
      if (e.key === "user") setUserState(safeParseUser(localStorage.getItem("user")));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Forced logout (from api.ts interceptor)
  useEffect(() => {
    const handler = () => {
      setToken(null);
      setUserState(null);
    };
    window.addEventListener("auth-logout", handler);
    return () => window.removeEventListener("auth-logout", handler);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/login", { email, password });

        const newToken = (data as any)?.token;
        const candidate = (data as any)?.user ?? (data as any)?.data?.user ?? data;
        const backendUser = normalizeBackendUser(candidate);

        if (!newToken || !backendUser) {
          return { ok: false, message: "Response login tidak valid dari server." };
        }

        localStorage.setItem("token", String(newToken));
        setToken(String(newToken));
        setUser(backendUser);

        return { ok: true, user: backendUser };
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || "Login gagal.";
        return { ok: false, message: msg };
      } finally {
        setLoading(false);
      }
    },
    [setUser]
  );

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
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
