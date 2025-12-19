const KEY = "eldercare_token";

export function getToken() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
