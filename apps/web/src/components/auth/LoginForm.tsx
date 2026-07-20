import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { validateCredentials } from '@/services/authService';

export interface LoginSubmitPayload {
  email: string;
  password: string;
  remember: boolean;
}

interface LoginFormProps {
  onSuccess: (payload: LoginSubmitPayload) => void;
  notice?: string | null;
}

export function LoginForm({ onSuccess, notice }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateCredentials(email, password)) {
      setError('Email hoặc mật khẩu không đúng.');
      return;
    }

    setError(null);
    onSuccess({ email, password, remember });
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

      {notice && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          {notice}
        </div>
      )}

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
              refresh token/session thật ở step 2.2 trước khi wire hành vi ghi nhớ. */}
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
            className="mt-1 w-full border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:from-cyan-300 hover:to-emerald-300"
          >
            Đăng nhập
          </Button>
        </motion.div>

        <p className="mt-1 text-center text-xs text-slate-500">NovaWay · Trợ lý định tuyến thông minh</p>
      </form>
    </motion.div>
  );
}
