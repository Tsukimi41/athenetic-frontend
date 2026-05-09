export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  accessToken: string | null,
  onToken?: (token: string | null) => void,
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const attempt = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (attempt.status !== 401) return attempt;

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    if (onToken) onToken(null);
    return attempt;
  }

  if (onToken) onToken(refreshed);
  headers.set('Authorization', `Bearer ${refreshed}`);
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}
