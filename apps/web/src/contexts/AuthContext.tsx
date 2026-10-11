import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { AuthUser } from '@/services/authService';
import { getSessionSnapshot, subscribeToSession } from '@/services/authSession';

interface AuthContextValue {
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The user comes from the session store, not from a setter each page calls:
// a page can no longer put a user here on behalf of a session check that has
// since been superseded (WEB-01, docs/web/WEB_ACCOUNT_RWD_SPEC.md WEB-D10).
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user } = useSyncExternalStore(subscribeToSession, getSessionSnapshot);
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
