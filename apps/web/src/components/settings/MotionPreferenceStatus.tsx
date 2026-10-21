import { useMotionPreference } from '@/contexts/motionPreferenceContext';
import type { MotionPreferenceProblem } from '@/services/motionPreference';

// Approved copy (Lead design baseline D5, spec §4.4 "Thông báo (a)(b)(c)").
const MESSAGES: Record<MotionPreferenceProblem, string> = {
  'read-failed': 'Không đọc được lựa chọn đã lưu trên trình duyệt này. Đang dùng ‘Theo hệ thống’.',
  'write-failed': 'Không lưu được lựa chọn trên trình duyệt này. Lựa chọn vẫn áp dụng tới khi bạn tải lại trang.',
  invalid: 'Lựa chọn đã lưu không đọc được. Đang dùng ‘Theo hệ thống’. Chọn lại để lưu.',
};

// WEB-12 (WEB-D13): the one status region for the signed-in account's
// preference problem, at the top of the authenticated main content, so it is
// visible on whichever route is open (deep links included). Polite, never
// moves focus or navigates; /settings has no second live region. Always in the
// DOM so a later message is announced; takes no space while empty.
export function MotionPreferenceStatus() {
  const { problem } = useMotionPreference();
  const message = problem ? MESSAGES[problem] : null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={message ? 'mx-auto w-full min-w-0 max-w-5xl px-3 pt-4 sm:px-6 lg:px-8' : undefined}
    >
      {message && (
        <p className="min-w-0 rounded-xl border border-amber-400/30 bg-amber-950/60 px-4 py-3 text-sm text-amber-100 [overflow-wrap:anywhere]">
          {message}
        </p>
      )}
    </div>
  );
}
