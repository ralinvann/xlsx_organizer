// src/lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

function resolveBaseUrl(): string {
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
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------- RESPONSE INTERCEPTOR ---------------- */
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // If config missing, just throw
    if (!original) throw error;

    // Retry once on network / timeout errors
    const isNetworkError =
      error.code === "ECONNABORTED" ||
      (typeof error.message === "string" && error.message.includes("Network Error")) ||
      (!error.response && !!error.request); // request made, no response

    if (isNetworkError && !original._retry) {
      original._retry = true;
      return api(original);
    }

    // 401 → force logout
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-logout"));
    }

    throw error;
  }
);
