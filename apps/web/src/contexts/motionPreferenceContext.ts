import { createContext, useContext, useSyncExternalStore } from 'react';
import type { MotionChoice, MotionPreferenceState } from '@/services/motionPreference';

// WEB-12 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.4, WEB-D13).
//
// Two sources decide whether decorative motion is reduced:
// - the OS `prefers-reduced-motion` setting, followed live (a `change` on the
//   media query) everywhere, signed in or not;
// - the signed-in account's own choice, only inside MotionPreferenceProvider,
//   which AppLayout mounts in its authenticated branch. /login and the
//   session-check/error screens are outside it and follow the OS only.
// Effective reduce = OS reduce OR choice "reduced"; no choice can turn motion
// back on when the OS asks for less.

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(REDUCE_QUERY);
}

function subscribeOs(listener: () => void): () => void {
  const query = mediaQuery();
  if (!query) return () => {};
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

const getOs = () => mediaQuery()?.matches ?? false;

export function useOsReducedMotion(): boolean {
  return useSyncExternalStore(subscribeOs, getOs, () => false);
}

export interface MotionPreferenceValue extends MotionPreferenceState {
  osReduced: boolean;
  effectiveReduced: boolean;
  setChoice: (choice: MotionChoice) => void;
}

export const MotionPreferenceContext = createContext<MotionPreferenceValue | null>(null);

export function useMotionPreference(): MotionPreferenceValue {
  const context = useContext(MotionPreferenceContext);
  if (!context) throw new Error('useMotionPreference must be used inside MotionPreferenceProvider');
  return context;
}

// Whether nonessential motion must be reduced right now: the account's
// effective setting inside the authenticated layout, the OS alone elsewhere.
export function useReducedMotionNow(): boolean {
  const context = useContext(MotionPreferenceContext);
  const osReduced = useOsReducedMotion();
  return context ? context.effectiveReduced : osReduced;
}
