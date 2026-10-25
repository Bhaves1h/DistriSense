export const DASHBOARD_URL =
  import.meta.env.VITE_DASHBOARD_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? `${window.location.origin}/dashboard.html`
    : "http://localhost:8000/");

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
  }
  if (import.meta.env.VITE_DASHBOARD_URL) {
    try {
      const parsed = new URL(import.meta.env.VITE_DASHBOARD_URL);
      return parsed.origin;
    } catch (_) {}
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return window.location.origin;
  }
  return "http://localhost:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();

export function getDashboardUrl(companyName) {
  if (typeof window === "undefined") return DASHBOARD_URL;
  const company = companyName || localStorage.getItem("ds_company");
  if (company && company.trim()) {
    const separator = DASHBOARD_URL.includes("?") ? "&" : "?";
    return `${DASHBOARD_URL}${separator}company=${encodeURIComponent(company.trim())}`;
  }
  return DASHBOARD_URL;
}

