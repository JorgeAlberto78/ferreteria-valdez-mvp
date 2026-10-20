import axios from "axios";

// Cliente HTTP: todas las peticiones salen con el token JWT en la cabecera Authorization.
export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL: `${API_URL}/api/v1` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    // Token vencido o inválido: se limpia la sesión y vuelve al login
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export function mensajeError(error) {
  const d = error.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(". ");
  return "No se pudo conectar con el servidor. Si la API está en Render, espera unos segundos y vuelve a intentar.";
}

export const bs = (n) => `Bs ${Number(n || 0).toFixed(2)}`;

export default api;
