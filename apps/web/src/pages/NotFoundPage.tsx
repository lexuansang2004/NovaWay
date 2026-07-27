import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Catch-all cho URL không khớp route nào. Nằm trong AppLayout (App.tsx) nên
// người đã đăng nhập vẫn giữ Sidebar để đi tiếp, còn người chưa đăng nhập bị
// auth guard đẩy về /login giống hệt mọi route bảo vệ khác.
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Compass className="h-8 w-8 text-cyan-300/60" />
      <h1 className="text-xl font-semibold text-white">Không tìm thấy trang</h1>
      <p className="max-w-sm text-sm text-slate-400">
        Đường dẫn bạn mở không tồn tại hoặc đã được đổi. Kiểm tra lại địa chỉ hoặc quay về Dashboard.
      </p>
      <Button
        onClick={() => navigate('/dashboard')}
        className="mt-2 border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:from-cyan-300 hover:to-emerald-300"
      >
        Về Dashboard
      </Button>
    </div>
  );
}
