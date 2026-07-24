import { Gauge, MapPin } from 'lucide-react';
import { TripMap } from '@/components/map/TripMap';
import { useLiveTrip } from '@/services/useLiveTrip';

export default function LiveMapPage() {
  const { trip, position, speedKmh, trail } = useLiveTrip();

  if (!trip || !position) {
    return (
      <div className="flex h-full min-h-[600px] w-full items-center justify-center rounded-xl border border-cyan-400/20 bg-slate-900/60">
        <div className="flex max-w-md flex-col items-center gap-3 px-6 text-center">
          <MapPin className="h-8 w-8 text-slate-500" />
          <p className="text-lg font-semibold text-white">Chưa có chuyến đi nào đang diễn ra</p>
          <p className="text-sm text-slate-400">
            Bắt đầu chuyến đi từ ứng dụng di động (xác thực khuôn mặt trên điện thoại) để xem vị trí trực tiếp tại
            đây.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[600px] w-full">
      <TripMap route={[]} position={position} trail={trail} />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-4 rounded-xl border border-cyan-400/20 bg-slate-900/80 px-4 py-3 backdrop-blur-xl">
        <div>
          <p className="text-xs text-slate-400">Chuyến đi đang diễn ra</p>
          <p className="flex items-center gap-1.5 text-lg font-semibold text-white">
            <Gauge className="h-4 w-4 text-cyan-300" /> {speedKmh.toFixed(0)} km/h
          </p>
        </div>
      </div>
    </div>
  );
}
