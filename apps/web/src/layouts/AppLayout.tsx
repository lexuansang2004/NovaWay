import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { hasAuthSession } from '@/services/authService';

// Layout chính cho các route bảo vệ (sau khi đăng nhập).
// Auth guard: chưa có session thì đá về /login.
// TODO(production): thay session check này bằng token thật + refresh flow (step 2.2).
export function AppLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasAuthSession()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  if (!hasAuthSession()) {
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
