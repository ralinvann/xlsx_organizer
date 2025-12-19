import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

function resolveBaseUrl(): string {
  // Prefer env override if available (Vite)
  const envBase = (import.meta as any)?.env?.VITE_API_BASE;
  if (envBase) return String(envBase).replace(/\/+$/, "");

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3001/api";
  }
  return "https://xlsx-organizer-server.onrender.com/api";
}

export const API_BASE = resolveBaseUrl();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/* ---------------- REQUEST INTERCEPTOR ---------------- */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------- RESPONSE INTERCEPTOR ---------------- */
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!original) throw error;

    const isNetworkError =
      error.code === "ECONNABORTED" ||
      (typeof error.message === "string" && error.message.includes("Network Error")) ||
      (!error.response && !!error.request);

    if (isNetworkError && !original._retry) {
      original._retry = true;
      return api(original);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-logout"));
    }

    throw error;
  }
);
