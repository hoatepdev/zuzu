export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3100';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(message ?? 'Có lỗi xảy ra');
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
