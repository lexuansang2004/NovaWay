import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Route, Car, CloudUpload, TriangleAlert } from 'lucide-react';
import { MapGridBackdrop } from '@/components/common/MapGridBackdrop';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';

// Dashboard landing đúng brand NovaWay (dark futuristic). Số liệu bên dưới là
// placeholder tĩnh — sẽ đọc từ Trip Logs API thật ở step 7.x, không dựng mock
// data source riêng ở đây để tránh trùng lặp/throwaway.
const STATS = [
  { label: 'Chuyến đi hôm nay', value: '—', Icon: Route, accent: 'cyan' as const },
  { label: 'Phương tiện hoạt động', value: '—', Icon: Car, accent: 'emerald' as const },
  { label: 'Đồng bộ offline', value: '—', Icon: CloudUpload, accent: 'cyan' as const },
  { label: 'Cảnh báo an toàn', value: '—', Icon: TriangleAlert, accent: 'amber' as const },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-full">
      <MapGridBackdrop className="opacity-70" withRadar={false} />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Sẵn sàng cho hành trình thông minh tiếp theo.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Online
            </span>
          </div>
        </div>

        {/* Hero: Vị trí trực tiếp */}
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-900/50 p-6 backdrop-blur-xl"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="relative z-10 max-w-md">
            <h2 className="text-xl font-semibold text-white">Vị trí trực tiếp</h2>
            <p className="mt-2 text-sm text-cyan-100/60">
              Theo dõi hành trình, phương tiện và cảnh báo an toàn theo thời gian thực.
            </p>
            <Button
              onClick={() => navigate('/start-trip')}
              className="mt-5 border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:from-cyan-300 hover:to-emerald-300"
            >
              <MapPin className="h-4 w-4" /> Xem vị trí trực tiếp
            </Button>
          </div>

          {/* Visual route/radar bên phải */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <MapGridBackdrop />
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}
