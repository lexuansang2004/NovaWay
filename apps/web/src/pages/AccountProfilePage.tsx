import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// WEB-09 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.2, FR-WEBPROFILE-01…03).
// Read-only: it shows the email of the user AppLayout has just verified with
// GET /api/auth/me, read from AuthContext. It makes no request of its own and
// has nothing to edit — /me only returns id and email (docs/API_CONTRACT.md
// §1), so there is no name, phone, avatar or join date to show, and no API to
// save them. The email wraps anywhere instead of being truncated, so a long
// address stays fully readable at 320 CSS px and with enlarged text.
export default function AccountProfilePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-3 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-white [overflow-wrap:anywhere]">Hồ sơ cá nhân</h1>

      <dl className="min-w-0 rounded-2xl border border-cyan-400/20 bg-slate-900/50 p-4 sm:p-6">
        <dt className="text-sm font-medium text-slate-400">Email đăng nhập</dt>
        <dd className="mt-1 min-w-0 text-base text-white [overflow-wrap:anywhere]">{user?.email}</dd>
      </dl>

      <Link
        to="/dashboard"
        className="inline-flex min-h-11 w-fit max-w-full items-center rounded-lg border border-cyan-400/30 px-4 py-2 text-sm font-medium text-cyan-200 [overflow-wrap:anywhere] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        Về Dashboard
      </Link>
    </div>
  );
}
