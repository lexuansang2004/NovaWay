// WEB-12 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.4, WEB-D12) — the local
// "Hiệu ứng giao diện" preference of one signed-in account on this browser.
//
// Plain synchronous functions, no React: read/write one localStorage key per
// account, never anything else. Storage is reached through a getter function
// so that a browser blocking `window.localStorage` itself (SecurityError) is
// handled like a failing getItem/setItem. Nothing here touches sessionStorage,
// the token or the session, and nothing logs ids or stored values.
//
// The namespace is not access control: anyone using the same browser profile
// can read same-origin storage, and the raw account id stays in the key after
// logout (spec §4.4 "Namespace", N01).

export type MotionChoice = 'system' | 'reduced';
export type MotionPreferenceProblem = 'read-failed' | 'invalid' | 'write-failed';

export interface MotionPreferenceState {
  choice: MotionChoice;
  problem: MotionPreferenceProblem | null;
}

const KEY_PREFIX = 'novaway:web:motion-preference:';
const MAX_ID_LENGTH = 128;
const DEFAULT: MotionPreferenceState = { choice: 'system', problem: null };

const browserStorage = () => window.localStorage;

export function motionPreferenceKey(userId: string): string | null {
  if (typeof userId !== 'string' || userId.length === 0 || userId.length > MAX_ID_LENGTH) return null;
  return KEY_PREFIX + userId;
}

function isChoice(value: unknown): value is MotionChoice {
  return value === 'system' || value === 'reduced';
}

// Version 1 is exactly two own keys, `version` (the number 1) and `motion`.
// Anything else — extra or missing keys, wrong types, another version — is an
// invalid record (case (c)). The record is left as it is; only the next
// explicit valid choice overwrites it.
function parseRecord(raw: string): MotionChoice | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('version') || !keys.includes('motion')) return null;
  const record = value as { version: unknown; motion: unknown };
  if (record.version !== 1 || !isChoice(record.motion)) return null;
  return record.motion;
}

export function readMotionPreference(userId: string, storage: () => Storage = browserStorage): MotionPreferenceState {
  const key = motionPreferenceKey(userId);
  if (!key) return DEFAULT;
  let raw: string | null;
  try {
    raw = storage().getItem(key);
  } catch {
    return { choice: 'system', problem: 'read-failed' };
  }
  if (raw === null) return DEFAULT;
  const choice = parseRecord(raw);
  return choice ? { choice, problem: null } : { choice: 'system', problem: 'invalid' };
}

// Returns whether the choice was stored. A failure (quota, blocked storage)
// is reported to the caller, which keeps the choice for this document (b).
export function writeMotionPreference(userId: string, choice: MotionChoice, storage: () => Storage = browserStorage): boolean {
  const key = motionPreferenceKey(userId);
  if (!key || !isChoice(choice)) return false;
  try {
    storage().setItem(key, JSON.stringify({ version: 1, motion: choice }));
    return true;
  } catch {
    return false;
  }
}

// What the app shows for an account: the outcome of the account's own last
// choice in this document when there is one — as a whole, including a
// successful `problem: null` that clears an older read/parse problem (review
// R12-02) — otherwise what was read from storage.
export function resolveMotionPreference(loaded: MotionPreferenceState, override: MotionPreferenceState | undefined): MotionPreferenceState {
  return override ?? loaded;
}
