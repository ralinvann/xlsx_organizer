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
  lastLoginAt?: string;
  lastLoginIP?: string;
  lastUserAgent?: string;
}

/** Helper: accept either { user: IUser } or IUser */
function extractUser(payload: any): IUser | null {
  if (!payload) return null;
  if (payload.user) return payload.user as IUser;
  return payload as IUser;
}

export function useAuth() {
  const [user, setUser] = useState<IUser | null>(() => {
    const cached = localStorage.getItem("user");
    try { return cached ? JSON.parse(cached) : null; } catch { return null; }
  });

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const isAuthed = useMemo(() => Boolean(user), [user]);

  const persist = useCallback((u: IUser | null, token?: string) => {
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
      if (token) localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }

    setUser(u);
  }, []);

  /**
   * LOGIN
   * Backend expects POST /api/auth/login and returns { user }
   */
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const nextUser = extractUser(data);
      persist(nextUser, data.token);
      setReady(true);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Login failed";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persist]);

  /**
   * fetchMe: restore session on page refresh
   * GET /api/auth/me -> { user }
   */
  const fetchMe = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/me");
      const nextUser = extractUser(data);
      if (!nextUser) {
        // backend weirdness -> clear session
        persist(null);
      } else {
        persist(nextUser);
      }
    } catch {
      // invalid token or network error -> clear session
      persist(null);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [persist]);

  /**
   * updateProfile: PATCH/PUT /api/users/me -> may return { user } or user
   */
  const updateProfile = useCallback(async (payload: Partial<Pick<IUser, "firstName" | "middleName" | "lastName">>) => {
    setLoading(true);
    try {
      const { data } = await api.put("/users/me", payload);
      const nextUser = extractUser(data);
      persist(nextUser);
      return { ok: true, user: nextUser };
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
      const { data } = await api.post("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const nextUser = extractUser(data);
      persist(nextUser);
      return { ok: true, user: nextUser };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Upload failed";
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Even if the logout request fails, we should clear local state
      console.warn("Logout request failed:", error);
    } finally {
      persist(null);
      setReady(true);
      // optional: notify other tabs
      window.dispatchEvent(new Event("auth-logout"));
    }
  }, [persist]);

  // Single restore flow
  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  return { user, isAuthed, loading, ready, login, fetchMe, updateProfile, uploadAvatar, logout };
}
