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

// Only what a caller may legitimately need to control per request. There is
// deliberately no client-wide timeout here: WEB-01 puts a 15s limit on the
// session check alone (docs/web/WEB_ACCOUNT_RWD_SPEC.md WEB-D08), not on every
// business API call.
interface RequestControl {
  signal?: AbortSignal;
}

export const apiClient = {
  get: <T>(path: string, token?: string, control: RequestControl = {}) =>
    request<T>(path, { method: 'GET', headers: authHeader(token), signal: control.signal }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: authHeader(token),
    }),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: authHeader(token),
    }),
  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', headers: authHeader(token) }),
};
