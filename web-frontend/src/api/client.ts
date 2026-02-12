const getBaseUrl = () => window.__ENV__?.API_BASE_URL ?? "";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    credentials: "include", // Envoie le cookie de session au BFF
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  // Redirection si la session est expirée
  if (res.status === 401) {
    window.location.href = "/bff/login";
    throw new Error("Session expirée");
  }

  // Cas d'indisponibilité temporaire
  if (res.status === 503) {
    throw new Error("Service temporairement indisponible.");
  }

  if (!res.ok) throw new Error(`Erreur API : ${res.status}`);
  if (res.status === 204) return undefined as T;

  return res.json();
}
