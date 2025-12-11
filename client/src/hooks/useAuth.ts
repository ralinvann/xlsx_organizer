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
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const token = localStorage.getItem("token") || "";

  const isAuthed = useMemo(() => Boolean(token), [token]);

  const persist = useCallback((u: IUser | null, t?: string) => {
    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
    if (t !== undefined) {
      if (t) localStorage.setItem("token", t);
      else localStorage.removeItem("token");
    }
    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/users/login", { email, password });
      persist(data.user, data.token);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Login failed";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const fetchMe = useCallback(async () => {
    if (!localStorage.getItem("token")) { setReady(true); return; }
    setLoading(true);
    try {
      const { data } = await api.get<IUser>("/users/me");
      persist(data);
    } catch {
      persist(null, ""); // drop token on failure
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [persist]);

  const updateProfile = useCallback(async (payload: Partial<Pick<IUser, "firstName" | "middleName" | "lastName">>) => {
    setLoading(true);
    try {
      const { data } = await api.put<IUser>("/users/me", payload);
      persist(data);
      return { ok: true, user: data };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Update failed";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const uploadAvatar = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const { data } = await api.post<IUser>("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      persist(data);
      return { ok: true, user: data };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Upload failed";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, "");
  }, [persist]);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await api.get("/auth/me");
          if (res.data?.user) {
            setUser(res.data.user);
            // Token is valid; ensure it's in localStorage
            localStorage.setItem("token", token);
          }
        } catch (err) {
          // Token is invalid; clear it
          localStorage.removeItem("token");
          setUser(null);
        }
      }
      setReady(true);
    };

    restoreSession();
  }, []);

  return { user, isAuthed, loading, ready, login, fetchMe, updateProfile, uploadAvatar, logout };
}
