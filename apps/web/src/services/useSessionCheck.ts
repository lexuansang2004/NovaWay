import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  cancelSessionCheck,
  getSessionSnapshot,
  startSessionCheck,
  subscribeToSession,
  type SessionSnapshot,
} from '@/services/authSession';

const NOT_STARTED: SessionSnapshot = { status: 'checking', user: null, failure: null };

// Verifies the session every time the calling page mounts and reports the
// result. Until this mount's own check has started, the shared state is
// whatever an earlier page left behind (e.g. `authenticated` straight after a
// login, or `error` from a guard the user navigated away from), so it is
// reported as `checking` instead of being trusted.
export function useSessionCheck(): SessionSnapshot {
  const snapshot = useSyncExternalStore(subscribeToSession, getSessionSnapshot);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const check = startSessionCheck();
    setStarted(true);
    return () => cancelSessionCheck(check);
  }, []);

  return started ? snapshot : NOT_STARTED;
}
