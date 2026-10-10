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

// Thrown instead of a result when the answer no longer belongs to the session
// that is current by the time it arrives (the stored token changed, or the
// caller says the check was superseded). A superseded answer must have no
// effect at all — not even a 401's clearAuthSession — so it is reported as
// its own error rather than as a user or as null. Callers ignore it.
export class StaleSessionCheckError extends Error {
  constructor() {
    super('Session check result no longer applies to the current session.');
    this.name = 'StaleSessionCheckError';
  }
}

interface FetchCurrentUserOptions {
  // Lets the caller abandon the request (timeout, unmount, superseded check).
  signal?: AbortSignal;
  // Extra validity check owned by the caller, evaluated when the answer
  // arrives. The token comparison below always applies on top of it.
  isCurrent?: () => boolean;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { access_token, user } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  sessionStorage.setItem(TOKEN_KEY, access_token);
  return user;
}

// Validates the stored token against the backend (docs/API_CONTRACT.md §1
// GET /api/auth/me) rather than just checking presence — this is what makes
// "reload session" actually verify the session is still valid, not just cached.
//
// WEB-01 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.1, WEB-D10): the answer only
// counts for the token it was sent with. If another login, a logout or a
// newer check replaced that session while the request was in flight, the
// answer is dropped here, in the service, before it can touch storage — a 401
// for the old token must never clear the new one, and a 200 for the old token
// must never be handed back as the current user.
export async function fetchCurrentUser(options: FetchCurrentUserOptions = {}): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;

  const stillCurrent = () => getToken() === token && (options.isCurrent?.() ?? true);

  let user: AuthUser;
  try {
    user = await apiClient.get<AuthUser>('/auth/me', token, { signal: options.signal });
  } catch (error) {
    if (!stillCurrent()) throw new StaleSessionCheckError();
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession();
      return null;
    }
    throw error;
  }

  if (!stillCurrent()) throw new StaleSessionCheckError();
  return user;
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
