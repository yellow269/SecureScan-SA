import { clearToken, getToken, TOKEN_KEY } from './token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export function getBackendUrl() {
  if (!BACKEND_URL) throw new Error('NEXT_PUBLIC_BACKEND_URL is not set');
  return BACKEND_URL;
}

export async function apiFetch<T>(path: string, init?: RequestInit & { token?: string }) {
  const token = init?.token ?? getToken();
  const res = await fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json'
    }
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export { TOKEN_KEY };

