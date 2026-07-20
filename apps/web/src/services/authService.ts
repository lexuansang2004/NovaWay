// TODO(production): thay bằng gọi Auth API thật (NovaWay_COMPLETE_MICRO_STEP_PLAN.md
// step 2.2 feat/web-auth-integration) — JWT access_token + secure storage.
// Hiện tại chỉ mock 1 tài khoản cứng để dựng layout/routing (step 2.1).

const SESSION_KEY = 'novaway_web_auth';

const MOCK_CREDENTIALS = {
  email: 'demo@novaway.vn',
  password: '123456',
};

export function validateCredentials(email: string, password: string): boolean {
  return email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password;
}

export function persistAuthSession(): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: MOCK_CREDENTIALS.email, loggedInAt: Date.now() }));
}

export function hasAuthSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) !== null;
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
