import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { LoginForm, type LoginSubmitPayload } from '@/components/auth/LoginForm';
import { MapGridBackdrop } from '@/components/common/MapGridBackdrop';
import { SessionCheckNotice } from '@/components/auth/SessionCheckError';
import { endLocalSession, retrySessionCheck, signIn } from '@/services/authSession';
import { useSessionCheck } from '@/services/useSessionCheck';

// Xác thực khuôn mặt gắn phương tiện (FaceScanner, FR-BIOMETRIC) là luồng chọn
// xe trước khi bắt đầu chuyến đi, không phải cổng đăng nhập tài khoản — sẽ tích
// hợp ở đúng step làm UI chọn xe/bắt đầu chuyến đi, không phải ở đây.
export default function LoginPage() {
  const navigate = useNavigate();
  const session = useSessionCheck();

  // Covers both ways of ending up signed in on this page: the token already
  // in storage turned out to be valid, or the form below just signed in.
  useEffect(() => {
    if (session.status === 'authenticated') {
      navigate('/dashboard', { replace: true });
    }
  }, [session.status, navigate]);

  async function handleSubmit({ email, password }: LoginSubmitPayload) {
    await signIn(email, password);
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
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6">
        {/* WEB-01: kiểm tra phiên cũ lỗi (không phải 401) thì báo ở đây; form
            bên dưới vẫn dùng được và token cũ chưa bị xoá. */}
        {session.status === 'error' && (
          <SessionCheckNotice
            failure={session.failure}
            onRetry={retrySessionCheck}
            onRelogin={endLocalSession}
          />
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key="login-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <LoginForm onSubmit={handleSubmit} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
