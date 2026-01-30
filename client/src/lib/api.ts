// src/lib/api.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";

/**
 * Resolve API base URL safely:
 * 1. VITE_API_BASE (preferred)
 * 2. localhost fallback
 * 3. production fallback
 */
function resolveBaseUrl(): string {

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3001/api";
  }

  // production default
  return "https://xlsx-organizer-server.onrender.com/api";
}

export const API_BASE = resolveBaseUrl();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/* ---------------- REQUEST INTERCEPTOR ---------------- */

api.interceptors.request.use((config) => {
  // Add JWT token to Authorization header if available
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------- RESPONSE INTERCEPTOR ---------------- */

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (!original) throw error;

    // Retry once on network / timeout errors
    const isNetworkError =
      error.code === "ECONNABORTED" ||
      error.message?.includes("Network Error");

    if (isNetworkError && !original._retry) {
      original._retry = true;
      return api(original);
    }

    // 401 → force logout (but don't remove tokens from localStorage since we use cookies now)
    if (error.response?.status === 401) {
      localStorage.removeItem("user");

      // optional but recommended
      window.dispatchEvent(new Event("auth-logout"));
    }

    throw error;
  }
);
