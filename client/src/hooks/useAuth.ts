import { useEffect, useState } from "react";
import { api } from "../lib/api";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  name?: string;
};

type LoginResult = { ok: true } | { ok: false; message: string };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Restore session on app load
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          setUser(null);
          setReady(true);
          return;
        }

        // validate token + get user
        const { data } = await api.get("/auth/me");
        setUser(data?.user ?? null);
      } catch {
        // token invalid/expired
        localStorage.removeItem("auth_token");
        setUser(null);
      } finally {
        setReady(true);
      }
    };

    init();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });

      if (!data?.token || !data?.user) {
        return { ok: false, message: "Response auth tidak valid." };
      }

      localStorage.setItem("auth_token", data.token);
      setUser(data.user);

      return { ok: true };
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Login gagal.";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  return { user, ready, loading, login, logout };
}
