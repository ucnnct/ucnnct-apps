const getBaseUrl = () => window.__ENV__?.API_BASE_URL ?? "";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options, credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (res.status === 401) { window.location.href = "/bff/login"; throw new Error("Session expired"); }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}
