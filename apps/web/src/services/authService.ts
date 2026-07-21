import { apiClient, ApiError } from '@/lib/apiClient';

const TOKEN_KEY = 'novaway_web_token';

export interface AuthUser {
  id: string;
  email: string;
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { access_token, user } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  sessionStorage.setItem(TOKEN_KEY, access_token);
  return user;
}

// Validates the stored token against the backend (docs/API_CONTRACT.md §1
// GET /api/auth/me) rather than just checking presence — this is what makes
// "reload session" actually verify the session is still valid, not just cached.
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;

  try {
    return await apiClient.get<AuthUser>('/auth/me', token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession();
      return null;
    }
    throw error;
  }
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
