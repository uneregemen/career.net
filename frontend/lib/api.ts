import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";
import "@/lib/amplify"; // Amplify yapılandırmasını başlat

// baseURL boş — next.config.ts'deki rewrite kuralı /api/v1/* isteklerini Gateway'e yönlendirir
export const api = axios.create({ baseURL: "" });

// Her istekte Amplify v6 üzerinden Cognito token'ı al ve header'a ekle
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {
    // Kullanıcı giriş yapmamış — token eklenmeden devam et
  }
  return config;
});

// ── Job Service ───────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (page = 0) => api.get(`/api/v1/jobs?page=${page}`),
  getById: (id: string) => api.get(`/api/v1/jobs/${id}`),
  nearby: (city: string) => api.get(`/api/v1/jobs/nearby?city=${city}`),
  autocompletePosition: (q: string) => api.get(`/api/v1/jobs/autocomplete/position?q=${q}`),
  autocompleteCity: (q: string) => api.get(`/api/v1/jobs/autocomplete/city?q=${q}`),
  apply: (id: string) => api.post(`/api/v1/jobs/${id}/apply`),
};

// ── Search Service ────────────────────────────────────────────────────────────
export const searchApi = {
  search: (params: SearchParams) => api.post("/api/v1/search", params),
  recent: (sessionId?: string) =>
    api.get(`/api/v1/search/recent${sessionId ? `?sessionId=${sessionId}` : ""}`),
};

// ── Notification Service ──────────────────────────────────────────────────────
export const notificationsApi = {
  getUnread: () => api.get("/api/v1/notifications"),
  markRead: (id: string) => api.put(`/api/v1/notifications/${id}/read`),
  getAlerts: () => api.get("/api/v1/alerts"),
  createAlert: (data: AlertData) => api.post("/api/v1/alerts", data),
  deleteAlert: (id: string) => api.delete(`/api/v1/alerts/${id}`),
};

// ── Applications ─────────────────────────────────────────────────────────────
export const applicationsApi = {
  myApplications: () => api.get("/api/v1/jobs/my-applications"),
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get("/api/v1/profile"),
  update: (data: Record<string, unknown>) => api.put("/api/v1/profile", data),
};

// ── AI Agent Service ──────────────────────────────────────────────────────────
export const aiApi = {
  chat: (sessionId: string, message: string) =>
    api.post("/api/v1/ai/chat", { sessionId, message }),
  history: (sessionId: string) => api.get(`/api/v1/ai/chat/${sessionId}`),
};

// ── Tipler ────────────────────────────────────────────────────────────────────
export interface SearchParams {
  position?: string;
  city?: string;
  country?: string;
  town?: string;
  workingPreference?: string;
  sessionId?: string;
  page?: number;
  size?: number;
}

export interface AlertData {
  positionKeywords?: string;
  city?: string;
  workingPreference?: string;
}
