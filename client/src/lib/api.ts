/// <reference types="vite/client" />

import axios, { AxiosError, AxiosRequestConfig } from "axios";

function ensureApiPath(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, "");
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

function resolveBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim()) {
    return ensureApiPath(envBase);
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3001/api";
  }

  return "https://sahabat-lansia-server.onrender.com/api";
}

export const API_BASE = resolveBaseUrl();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (!original) throw error;

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

      window.dispatchEvent(new Event("auth-logout"));
    }

    throw error;
  }
);
