import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { MotionPreferenceContext, useOsReducedMotion } from '@/contexts/motionPreferenceContext';
import {
  readMotionPreference,
  resolveMotionPreference,
  writeMotionPreference,
  type MotionChoice,
  type MotionPreferenceState,
} from '@/services/motionPreference';

// The outcome of each account's own last choice in this document (chosen
// value + whether saving it worked). Keyed by user id, so another account
// never inherits it; kept across route/provider remounts and a same-tab
// logout → login of the same account; gone with a reload or a closed tab
// (spec §4.4 case (b), WEB-D13). Only an explicit choice writes here.
const choicesThisDocument = new Map<string, MotionPreferenceState>();

// WEB-12. Mounted by AppLayout in its authenticated branch only, with the
// user that this mount's session check verified.
export function MotionPreferenceProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const osReduced = useOsReducedMotion();
  const [, setRevision] = useState(0);
  // Read synchronously while rendering this account's first frame, so a saved
  // "reduced" applies before any decorative motion starts. Re-read for a new
  // account or a new mount (e.g. after a reload); no live cross-tab sync.
  const loaded = useMemo(() => readMotionPreference(userId), [userId]);
  const state = resolveMotionPreference(loaded, choicesThisDocument.get(userId));
  const effectiveReduced = osReduced || state.choice === 'reduced';

  const setChoice = useCallback(
    (choice: MotionChoice) => {
      const saved = writeMotionPreference(userId, choice);
      choicesThisDocument.set(userId, { choice, problem: saved ? null : 'write-failed' });
      setRevision((revision) => revision + 1);
    },
    [userId],
  );

  // CSS hook for the decorative CSS animations (index.css): set before paint,
  // removed when the authenticated subtree goes away (logout, account switch)
  // so /login falls back to the OS media query alone.
  const accountReduced = state.choice === 'reduced';
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (accountReduced) root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
    return () => root.removeAttribute('data-motion');
  }, [accountReduced]);

  const value = useMemo(
    () => ({ ...state, osReduced, effectiveReduced, setChoice }),
    [state, osReduced, effectiveReduced, setChoice],
  );

  return (
    <MotionPreferenceContext.Provider value={value}>
      <MotionConfig reducedMotion={effectiveReduced ? 'always' : 'never'}>{children}</MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}
