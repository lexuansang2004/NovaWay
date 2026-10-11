import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getSessionSnapshot,
  releaseSessionCheck,
  startSessionCheck,
  subscribeToSession,
  type SessionCheckOwner,
  type SessionSnapshot,
} from '@/services/authSession';

const NOT_STARTED: SessionSnapshot = { status: 'checking', user: null, failure: null, retrying: false };

// Verifies the session every time the calling page mounts and reports the
// result. Until this mount's own check has started, the shared state is
// whatever an earlier page left behind (e.g. `authenticated` straight after a
// login, or `error` from a guard the user navigated away from), so it is
// reported as `checking` instead of being trusted.
//
// The mount owns the check it starts and every retry made while it is on
// screen; unmounting releases all of them. The owner is created inside the
// effect, so each effect run (StrictMode runs it twice) is its own owner and
// the cleanup of one run can never cancel the check of the next.
export function useSessionCheck(): SessionSnapshot {
  const snapshot = useSyncExternalStore(subscribeToSession, getSessionSnapshot);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const owner: SessionCheckOwner = Symbol('session-check-owner');
    startSessionCheck(owner);
    setStarted(true);
    return () => releaseSessionCheck(owner);
  }, []);

  return started ? snapshot : NOT_STARTED;
}
