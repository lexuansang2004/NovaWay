import { Navigate, Outlet } from 'react-router-dom';
import { ResponsiveNavigation } from '@/components/layout/ResponsiveNavigation';
import { SessionCheckErrorScreen } from '@/components/auth/SessionCheckError';
import { endLocalSession, retrySessionCheck } from '@/services/authSession';
import { useSessionCheck } from '@/services/useSessionCheck';

// Layout chính cho các route bảo vệ (sau khi đăng nhập).
// Auth guard: xác thực token với backend qua GET /api/auth/me mỗi lần mount
// (kể cả sau khi reload trang) — không chỉ tin vào việc có token trong
// sessionStorage, vì token có thể đã hết hạn hoặc không còn hợp lệ.
//
// WEB-01 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.1): lỗi khác 401 (mạng, 5xx,
// 403, 429, quá 15 giây) không còn treo ở màn hình chờ và không tự đăng xuất —
// hiện màn lỗi có "Thử lại" và "Đăng nhập lại", token vẫn được giữ. Route đang
// mở không đổi trong lúc đó, nên thử lại thành công là vào đúng trang đã yêu cầu.
export function AppLayout() {
  const session = useSessionCheck();

  if (session.status === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-sm text-slate-400">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (session.status === 'error') {
    return (
      <SessionCheckErrorScreen
        failure={session.failure}
        onRetry={retrySessionCheck}
        onRelogin={endLocalSession}
      />
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-100 min-[1024px]:flex-row">
      <ResponsiveNavigation />
      <main id="main-content" className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
