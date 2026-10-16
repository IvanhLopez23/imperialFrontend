import axios from "axios";

// En desarrollo apunta al mismo host desde el que abres la app, en el puerto
// 4000 (así funciona en localhost y también desde otra PC de la LAN).
// En producción define VITE_API_URL (ej. https://api.tudominio.com/api).
function defaultApiBase(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }
  return "http://192.168.0.68:4000/api";
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiBase(),
});

const ACCESS_KEY = "barberia-access";
const REFRESH_KEY = "barberia-refresh";

// Almacén de tokens (access de vida corta + refresh persistente)
export const tokens = {
  get access(): string {
    try {
      return localStorage.getItem(ACCESS_KEY) ?? "";
    } catch {
      return "";
    }
  },
  get refresh(): string {
    try {
      return localStorage.getItem(REFRESH_KEY) ?? "";
    } catch {
      return "";
    }
  },
  set(access: string, refresh: string) {
    try {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      /* noop */
    }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* noop */
    }
  },
};

// Adjunta el access token a cada petición
api.interceptors.request.use((config) => {
  const t = tokens.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Refresco automático: ante un 401, pide un nuevo access token y reintenta
let refreshing: Promise<string> | null = null;

async function refreshAccess(): Promise<string> {
  const rt = tokens.refresh;
  if (!rt) throw new Error("Sin refresh token");
  const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: rt });
  tokens.set(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

const isAuthEndpoint = (url: string) =>
  /\/auth\/(login|refresh|forgot|verify-code|reset|logout)(\?|$)/.test(url);

api.interceptors.response.use(
  (r) => r,
  async (error: any) => {
    const original = error?.config;
    const status = error?.response?.status;
    const url: string = original?.url ?? "";
    if (status === 401 && original && !original._retry && !isAuthEndpoint(url)) {
      original._retry = true;
      try {
        refreshing = refreshing ?? refreshAccess();
        const access = await refreshing;
        refreshing = null;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        tokens.clear();
        if (!window.location.pathname.startsWith("/administrador")) {
          window.location.href = "/administrador";
        }
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export async function get<T = any>(url: string, params?: any, signal?: AbortSignal): Promise<T> {
  const { data } = await api.get(url, { params, signal });
  return data;
}
export async function post<T = any>(url: string, body?: any): Promise<T> {
  const { data } = await api.post(url, body);
  return data;
}
export async function put<T = any>(url: string, body?: any): Promise<T> {
  const { data } = await api.put(url, body);
  return data;
}
export async function del<T = any>(url: string): Promise<T> {
  const { data } = await api.delete(url);
  return data;
}
