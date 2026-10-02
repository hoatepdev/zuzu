export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3100';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  if (response.status === 401 && path !== '/auth/login' && window.location.pathname !== '/login') {
    window.location.assign('/login');
    throw new Error('Phiên đăng nhập đã hết hạn, đang chuyển về đăng nhập');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(message ?? 'Có lỗi xảy ra');
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
