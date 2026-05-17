import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Tüm servislere giden isteklerin geçtiği tek axios client
export const api = axios.create({ baseURL: API_URL });

// Her istekte Cognito token'ını otomatik ekle
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Amplify token'ı localStorage'da CognitoIdentityServiceProvider.xxx.xxx.accessToken key'inde tutar
    const keys = Object.keys(localStorage).filter((k) =>
      k.includes("accessToken")
    );
    if (keys.length > 0) {
      config.headers.Authorization = `Bearer ${localStorage.getItem(keys[0])}`;
    }
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
