import { Button } from '@/components/ui/button';
import type { SessionCheckFailure } from '@/services/authSession';

// None of these is worded as a credentials problem: the session check failed
// to get an answer, it did not get a "wrong password" (a 401 never reaches
// this component — it goes straight to /login).
const FAILURE_MESSAGE: Record<SessionCheckFailure, string> = {
  network: 'Không kết nối được tới máy chủ để kiểm tra phiên đăng nhập. Hãy kiểm tra kết nối mạng rồi thử lại.',
  timeout: 'Kiểm tra phiên đăng nhập mất quá nhiều thời gian nên đã dừng lại. Hãy thử lại.',
  server: 'Máy chủ đang gặp sự cố nên chưa kiểm tra được phiên đăng nhập. Hãy thử lại sau ít phút.',
  forbidden: 'Máy chủ từ chối yêu cầu kiểm tra phiên đăng nhập. Hãy thử lại, hoặc đăng nhập lại nếu vẫn không được.',
  rate_limited: 'Có quá nhiều yêu cầu trong thời gian ngắn. Hãy đợi một lát rồi thử lại.',
};

interface SessionCheckErrorScreenProps {
  failure: SessionCheckFailure | null;
  onRetry: () => void;
  onRelogin: () => void;
}

// Shown by the auth guard in place of a protected page. The session is still
// there at this point; only "Đăng nhập lại" gives it up.
export function SessionCheckErrorScreen({ failure, onRetry, onRelogin }: SessionCheckErrorScreenProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div
        role="alert"
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-amber-400/30 bg-slate-900/70 p-6"
      >
        <h1 className="text-lg font-semibold text-white">Chưa kiểm tra được phiên đăng nhập</h1>
        <p className="text-sm text-slate-300">{FAILURE_MESSAGE[failure ?? 'network']}</p>
        <p className="text-xs text-slate-400">
          Phiên đăng nhập của bạn vẫn được giữ. Chọn “Đăng nhập lại” nếu bạn muốn bỏ phiên này trên trình
          duyệt và đăng nhập từ đầu.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={onRetry}>
            Thử lại
          </Button>
          <Button type="button" variant="outline" onClick={onRelogin}>
            Đăng nhập lại
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SessionCheckNoticeProps {
  failure: SessionCheckFailure | null;
  onRetry: () => void;
  onRelogin: () => void;
}

// Shown on /login above a login form that stays usable. "Đăng nhập lại" here
// gives up the old session in place (the form is already on screen); signing
// in through the form replaces it as well.
export function SessionCheckNotice({ failure, onRetry, onRelogin }: SessionCheckNoticeProps) {
  return (
    <div
      role="alert"
      className="mb-4 flex w-full max-w-sm flex-col gap-3 rounded-xl border border-amber-400/30 bg-slate-900/70 p-4"
    >
      <p className="text-sm text-slate-200">{FAILURE_MESSAGE[failure ?? 'network']}</p>
      <p className="text-xs text-slate-400">
        Phiên đăng nhập trước đó vẫn được giữ. Bạn có thể thử lại, hoặc đăng nhập bằng biểu mẫu bên dưới.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRelogin}>
          Đăng nhập lại
        </Button>
      </div>
    </div>
  );
}
