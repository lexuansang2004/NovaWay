import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export interface LoginSubmitPayload {
  email: string;
  password: string;
  remember: boolean;
}

interface LoginFormProps {
  onSubmit: (payload: LoginSubmitPayload) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ email, password, remember });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      className="w-full max-w-sm rounded-2xl border border-cyan-400/20 bg-slate-900/60 p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur-xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Đăng nhập NovaWay</h1>
        <p className="mt-1 text-sm text-cyan-100/60">Truy cập không gian điều hướng thông minh</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
            className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
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
            className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
          />
        </div>

        {error && <p className="text-sm font-medium text-red-400">{error}</p>}

        <div className="flex items-center gap-2">
          {/* TODO(production): "remember" chưa có tác dụng — chờ chiến lược
              refresh token trước khi wire hành vi ghi nhớ đăng nhập. */}
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(checked) => setRemember(checked === true)}
            className="border-white/25 data-[state=checked]:border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-slate-950"
          />
          <label htmlFor="remember" className="text-sm text-cyan-100/60">
            Ghi nhớ đăng nhập
          </label>
        </div>

        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:from-cyan-300 hover:to-emerald-300"
          >
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </motion.div>

        <p className="mt-1 text-center text-xs text-slate-500">NovaWay · Trợ lý định tuyến thông minh</p>
      </form>
    </motion.div>
  );
}
