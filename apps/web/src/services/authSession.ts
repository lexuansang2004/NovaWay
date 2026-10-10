import { ApiError } from '@/lib/apiClient';
import {
  clearAuthSession,
  fetchCurrentUser,
  getToken,
  login,
  StaleSessionCheckError,
  type AuthUser,
} from '@/services/authService';

// WEB-01 — single owner of the web session state (docs/web/
// WEB_ACCOUNT_RWD_SPEC.md §4.1, FR-WEBSESSION-01→04).
//
// Before this module, AppLayout and LoginPage each called fetchCurrentUser()
// with a bare `.then()`: anything other than 200/401 left the guard on its
// "checking" screen forever and surfaced as an unhandled rejection, and an
// answer for an old token could still act on whatever session was current by
// then. Session state now lives here, outside React, so that every side
// effect (token, user, the state the UI routes on) goes through one place
// that knows which check is still the valid one.

// WEB-D08: applies to the session check only. Do not reuse as a general API
// timeout, and do not change the value without a spec change.
export const SESSION_CHECK_TIMEOUT_MS = 15_000;

export type SessionStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error';

// Why a check ended in `error`. Never 401 — that is `unauthenticated`.
export type SessionCheckFailure = 'network' | 'timeout' | 'server' | 'forbidden' | 'rate_limited';

export interface SessionSnapshot {
  status: SessionStatus;
  user: AuthUser | null;
  failure: SessionCheckFailure | null;
}

// Opaque to callers: only useful to hand back to cancelSessionCheck().
export type SessionCheckHandle = number;

interface ActiveCheck {
  generation: number;
  controller: AbortController;
  timer: ReturnType<typeof setTimeout>;
}

let snapshot: SessionSnapshot = { status: 'checking', user: null, failure: null };
const listeners = new Set<() => void>();

// "Thế hệ phiên" (WEB-D10). Bumped by everything that makes an in-flight
// check obsolete: a newer check, a successful login, a logout / "Đăng nhập
// lại", a timeout and a cancel. A check may only act while the generation it
// started in is still the current one.
let generation = 0;
let active: ActiveCheck | null = null;

function publish(next: SessionSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function supersede(): void {
  generation += 1;
  if (!active) return;
  clearTimeout(active.timer);
  active.controller.abort();
  active = null;
}

function settle(): void {
  if (!active) return;
  clearTimeout(active.timer);
  active = null;
}

function classifyFailure(error: unknown): SessionCheckFailure {
  if (!(error instanceof ApiError)) return 'network';
  if (error.status === 403) return 'forbidden';
  if (error.status === 429) return 'rate_limited';
  return 'server';
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot;
}

// Verifies the stored token with GET /api/auth/me. Starting a check always
// supersedes the previous one, so at most one check is ever valid.
export function startSessionCheck(): SessionCheckHandle {
  supersede();

  if (!getToken()) {
    publish({ status: 'unauthenticated', user: null, failure: null });
    return generation;
  }

  const checkGeneration = generation;
  const isCurrent = () => generation === checkGeneration;
  const controller = new AbortController();

  const timer = setTimeout(() => {
    if (!isCurrent()) return;
    // supersede() first: it aborts the request and makes any answer that
    // still arrives (a server that ignores the abort included) a stale one.
    supersede();
    publish({ status: 'error', user: null, failure: 'timeout' });
  }, SESSION_CHECK_TIMEOUT_MS);

  active = { generation: checkGeneration, controller, timer };
  publish({ status: 'checking', user: null, failure: null });

  fetchCurrentUser({ signal: controller.signal, isCurrent }).then(
    (user) => {
      if (!isCurrent()) return;
      settle();
      // null here means a 401 for the token this check verified; the service
      // has already cleared exactly that token.
      publish(
        user
          ? { status: 'authenticated', user, failure: null }
          : { status: 'unauthenticated', user: null, failure: null },
      );
    },
    (error: unknown) => {
      if (error instanceof StaleSessionCheckError || !isCurrent()) return;
      settle();
      // Anything but a 401 keeps the token: a network blip, a 5xx, a 403 or a
      // 429 says nothing about whether the session itself is still good.
      publish({ status: 'error', user: null, failure: classifyFailure(error) });
    },
  );

  return checkGeneration;
}

// For the component that started a check and is going away. A no-op when a
// newer check, a login or a logout has already taken over.
export function cancelSessionCheck(handle: SessionCheckHandle): void {
  if (active?.generation === handle) supersede();
}

// "Thử lại". Ignored while a check is already running, so repeated clicks
// never produce parallel checks (and never hammer a server that answered 429).
export function retrySessionCheck(): void {
  if (active) return;
  startSessionCheck();
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const user = await login(email, password);
  // login() has just replaced the stored token. Whatever check was running
  // belonged to the previous one.
  supersede();
  publish({ status: 'authenticated', user, failure: null });
  return user;
}

// Logout and the explicit "Đăng nhập lại" action (WEB-D09). Local only: there
// is no revoke endpoint, so the token is not invalidated on the server, a trip
// running on mobile is unaffected, and nothing but the session is removed
// from this browser.
export function endLocalSession(): void {
  supersede();
  clearAuthSession();
  publish({ status: 'unauthenticated', user: null, failure: null });
}
