import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// R5-1 (docs/roadmap/SPRINT_R5_DEPENDENCY_AND_COVERAGE.md): a "Ghi nhớ đăng
// nhập" checkbox used to sit below the password field. It was a dead control
// — LoginPage dropped the flag and authService always writes the token to
// sessionStorage — so it was removed rather than left promising something the
// app does not do.
//
// Điều kiện để làm lại tính năng này (đừng wire lại trước khi có ít nhất một
// trong số đó): có refresh token để phiên dài không phải là một JWT sống lâu
// nằm sẵn trên máy; hoặc có chỗ lưu access token an toàn hơn localStorage
// (localStorage đọc được bằng XSS, và token ở lại trên máy dùng chung); hoặc
// dự án ra khỏi giai đoạn pilot và chấp nhận đánh đổi đó một cách có chủ đích.
export interface LoginSubmitPayload {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit: (payload: LoginSubmitPayload) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      className="w-full min-w-0 rounded-2xl border border-cyan-400/20 bg-slate-900/60 p-4 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur-xl [overflow-wrap:anywhere] sm:p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Đăng nhập NovaWay</h1>
        <p className="mt-1 text-sm text-cyan-100/60">Truy cập không gian điều hướng thông minh</p>
      </div>

      <form className="flex min-w-0 flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-cyan-50/80">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="demo@novaway.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="h-auto min-h-11 border-white/10 bg-slate-950/60 py-2 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30 md:text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-cyan-50/80">
            Mật khẩu
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-auto min-h-11 border-white/10 bg-slate-950/60 py-2 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30 md:text-base"
          />
        </div>

        {error && <p className="min-w-0 text-sm font-medium text-red-400 [overflow-wrap:anywhere]">{error}</p>}

        <motion.div tabIndex={-1} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={submitting}
            className="mt-1 h-auto min-h-11 w-full whitespace-normal border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] [overflow-wrap:anywhere] hover:from-cyan-300 hover:to-emerald-300"
          >
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </motion.div>

        <p className="mt-1 text-center text-xs text-slate-500">NovaWay · Trợ lý định tuyến thông minh</p>
      </form>
    </motion.div>
  );
}
