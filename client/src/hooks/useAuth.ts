// src/hooks/useAuth.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export type Role = "superadmin" | "admin" | "officer";

export interface IUser {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: Role;
  profilePicture?: string;
  createdAt?: string;
}

export function useAuth() {
  const [user, setUser] = useState<IUser | null>(() => {
    const cached = localStorage.getItem("user");
    try { return cached ? JSON.parse(cached) : null; } catch { return null; }
  });

  const [token, setToken] = useState<string>(() => localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  const persist = useCallback((u: IUser | null, t?: string) => {
    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");

    if (t !== undefined) {
      if (t) localStorage.setItem("token", t);
      else localStorage.removeItem("token");
      setToken(t || "");
    }

    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/users/login", { email, password });
      persist(data.user, data.token);
      setReady(true);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Login failed";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const fetchMe = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) { setReady(true); return; }

    setLoading(true);
    try {
      // IMPORTANT: ensure your api instance attaches Authorization header from localStorage token
      const { data } = await api.get<IUser>("/users/me");
      // keep token as-is (but ensure state sync)
      persist(data, t);
    } catch {
      // token invalid -> drop
      persist(null, "");
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [persist]);

  const updateProfile = useCallback(async (payload: Partial<Pick<IUser, "firstName" | "middleName" | "lastName">>) => {
    setLoading(true);
    try {
      const { data } = await api.put<IUser>("/users/me", payload);
      persist(data, token);
      return { ok: true, user: data };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Update failed";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persist, token]);

  const uploadAvatar = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const { data } = await api.post<IUser>("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      persist(data, token);
      return { ok: true, user: data };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Upload failed";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persist, token]);

  const logout = useCallback(() => {
    persist(null, "");
    setReady(true);
  }, [persist]);

  // Single restore flow
  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  return { user, token, isAuthed, loading, ready, login, fetchMe, updateProfile, uploadAvatar, logout };
}
