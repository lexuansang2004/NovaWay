import { useId } from 'react';
import { useMotionPreference } from '@/contexts/motionPreferenceContext';
import type { MotionChoice } from '@/services/motionPreference';

const OPTIONS: { value: MotionChoice; label: string; description: string }[] = [
  { value: 'system', label: 'Theo hệ thống', description: 'Dùng thiết lập giảm chuyển động của hệ điều hành.' },
  {
    value: 'reduced',
    label: 'Giảm chuyển động',
    description: 'Tắt hiệu ứng trang trí và chuyển cảnh không cần thiết trên NovaWay. Dữ liệu bản đồ và cảnh báo vẫn cập nhật bình thường.',
  },
];

// WEB-12 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.4, FR-WEBSETTINGS-01…05).
// One setting, two native radios: a change (click, tap, arrow keys, Space)
// applies and saves at once — there is no Save button and no third option.
// Storage problems are shown by the shared status region in AppLayout's main
// content, not by a second region here.
export default function SettingsPage() {
  const { choice, osReduced, setChoice } = useMotionPreference();
  const id = useId();

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-3 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-white [overflow-wrap:anywhere]">Cài đặt</h1>

      <div className="min-w-0 rounded-2xl border border-cyan-400/20 bg-slate-900/50 p-4 sm:p-6">
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="text-lg font-semibold text-white [overflow-wrap:anywhere]">Hiệu ứng giao diện</legend>
          <div className="mt-2 flex min-w-0 flex-col gap-4">
            <p className="text-sm text-slate-300 [overflow-wrap:anywhere]">Chỉ áp dụng cho tài khoản này trên trình duyệt này.</p>
            {OPTIONS.map((option) => {
              const descriptionId = `${id}-${option.value}`;
              return (
                <div key={option.value} className="flex min-w-0 flex-col gap-1">
                  <label className="flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-3 text-base text-white [overflow-wrap:anywhere]">
                    <input
                      type="radio"
                      name={`${id}-motion`}
                      value={option.value}
                      checked={choice === option.value}
                      onChange={() => setChoice(option.value)}
                      aria-describedby={descriptionId}
                      className="h-5 w-5 shrink-0 accent-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                    />
                    <span className="min-w-0">{option.label}</span>
                  </label>
                  <p id={descriptionId} className="pl-8 text-sm text-slate-400 [overflow-wrap:anywhere]">{option.description}</p>
                </div>
              );
            })}
            {osReduced && (
              <p className="text-sm text-cyan-100 [overflow-wrap:anywhere]">Hệ điều hành đang bật giảm chuyển động, nên hiệu ứng luôn được giảm.</p>
            )}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
