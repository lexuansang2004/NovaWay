const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

// Matches docs/API_CONTRACT.md §8 error body shape.
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

interface ErrorBody {
  error_code?: string;
  message?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    const body: ErrorBody | null = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error_code ?? 'UNKNOWN_ERROR',
      body?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function authHeader(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const apiClient = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET', headers: authHeader(token) }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: authHeader(token),
    }),
};
