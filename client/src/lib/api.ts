// src/lib/api.ts
import axios from "axios";

/**
 * Resolve API base URL robustly:
 * - LOCAL: http://localhost:3001
 * - PROD: env var VITE_API_BASE if present
 * - FALLBACK: relative /api (works behind reverse proxies)
 */
function resolveBaseUrl(): string {
  const env =
        window.location.hostname === "localhost"
          ? "http://localhost:3001/api"
          : "https://xlsx-organizer-server.onrender.com";
  if (env) return env;

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3001/api";
  }
  // deploy fallback
  const guess = [
    "/api", // reverse-proxy path
    "https://xlsx-organizer-server.onrender.com/api", // your listed server
  ];
  return guess[0];
}

export const API_BASE = resolveBaseUrl();

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15000,
});

// attach token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// basic 401 handling & retry-once for network hiccups
let isRetrying = false;
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (!original) throw err;

    // Retry once on network error/timeouts
    const netErr = err.code === "ECONNABORTED" || err.message?.includes("Network Error");
    if (netErr && !isRetrying) {
      isRetrying = true;
      try {
        const retry = await api(original);
        isRetrying = false;
        return retry;
      } catch (e) {
        isRetrying = false;
        throw e;
      }
    }

    // 401 → nuke token
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    throw err;
  }
);
