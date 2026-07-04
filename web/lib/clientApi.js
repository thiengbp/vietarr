const CLIENT_API_BASE = process.env.NEXT_PUBLIC_CORE_API_URL || "/api/v1";

export function getToken() {
  if (typeof window === "undefined") return "";
  const stored = window.localStorage.getItem("vietarr_token");
  if (stored) return stored;
  const cookie = document.cookie.split("; ").find((part) => part.startsWith("vietarr_token="));
  return cookie ? decodeURIComponent(cookie.slice("vietarr_token=".length)) : "";
}

export function saveSession({ token, user }) {
  window.localStorage.setItem("vietarr_token", token);
  window.localStorage.setItem("vietarr_user", JSON.stringify(user));
  document.cookie = `vietarr_token=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
}

export function clearSession() {
  window.localStorage.removeItem("vietarr_token");
  window.localStorage.removeItem("vietarr_user");
  document.cookie = "vietarr_token=; path=/; max-age=0; samesite=lax";
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("vietarr_user") || "null");
  } catch (_error) {
    return null;
  }
}

export async function apiFetch(path, { method = "GET", body, token = getToken() } = {}) {
  const res = await fetch(`${CLIENT_API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || `Core API error ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function wsUrl(token = getToken()) {
  const configured = process.env.NEXT_PUBLIC_CORE_WS_URL;
  if (configured) return `${configured}${configured.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}
