import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { fetchCurrentUser } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

type SessionState = 'checking' | 'authenticated' | 'unauthenticated';

// Layout chính cho các route bảo vệ (sau khi đăng nhập).
// Auth guard: xác thực token với backend qua GET /api/auth/me mỗi lần mount
// (kể cả sau khi reload trang) — không chỉ tin vào việc có token trong
// sessionStorage, vì token có thể đã hết hạn hoặc không còn hợp lệ.
export function AppLayout() {
  const { user, setUser } = useAuth();
  const [state, setState] = useState<SessionState>('checking');

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser().then((fetchedUser) => {
      if (cancelled) return;
      setUser(fetchedUser);
      setState(fetchedUser ? 'authenticated' : 'unauthenticated');
    });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  if (state === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-sm text-slate-400">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (state === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
