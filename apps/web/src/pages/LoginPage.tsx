import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { LoginForm, type LoginSubmitPayload } from '@/components/auth/LoginForm';
import { MapGridBackdrop } from '@/components/common/MapGridBackdrop';
import { hasAuthSession, persistAuthSession } from '@/services/authService';

// Login UI mock cho step 2.1 — xác thực khuôn mặt gắn phương tiện (FaceScanner,
// FR-BIOMETRIC) là một luồng riêng cho việc chọn xe trước khi bắt đầu chuyến đi,
// không phải cổng đăng nhập tài khoản; sẽ tích hợp ở đúng step làm UI chọn xe/bắt
// đầu chuyến đi, không phải ở đây.
export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (hasAuthSession()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  function handleSuccess(_payload: LoginSubmitPayload) {
    persistAuthSession();
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      <MapGridBackdrop />

      {/* Cột trái: brand + visual (ẩn trên mobile) */}
      <div className="relative z-10 hidden flex-1 flex-col justify-between p-12 lg:flex">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950">
              <Navigation className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="text-lg font-semibold">NovaWay</span>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Trợ lý định tuyến thông minh</h2>
          <p className="mt-3 text-cyan-100/60">
            Theo dõi hành trình, phương tiện và cảnh báo an toàn trong một không gian điều hướng hiện
            đại.
          </p>
        </div>
        <p className="text-xs text-slate-500">NovaWay · Smart Route Preview</p>
      </div>

      {/* Cột phải: form login glass */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key="login-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <LoginForm onSuccess={handleSuccess} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
