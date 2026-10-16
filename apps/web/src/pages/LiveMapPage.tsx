import { Gauge, MapPin, WifiOff } from 'lucide-react';
import { TripMap } from '@/components/map/TripMap';
import { useLiveTrip } from '@/services/useLiveTrip';

// R5-9 — connectionStatus values that mean the position on screen may be
// stale, worth telling the user about rather than looking like a live feed.
const STALE_CONNECTION_LABEL: Record<string, string> = {
  disconnected: 'Mất kết nối trực tiếp — đang thử kết nối lại...',
  error: 'Không kết nối được máy chủ — đang thử lại...',
};

export default function LiveMapPage() {
  const { trip, position, speedKmh, trail, connectionStatus } = useLiveTrip();

  if (!trip || !position) {
    return (
      <div className="flex min-h-full w-full min-w-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-slate-900/60 p-6 [overflow-wrap:anywhere]">
        <div className="flex min-w-0 max-w-md flex-col items-center gap-3 text-center">
          <MapPin aria-hidden="true" className="h-8 w-8 shrink-0 text-slate-500" />
          <p className="text-lg font-semibold text-white">Chưa có chuyến đi nào đang diễn ra</p>
          <p className="text-sm text-slate-400">
            Bắt đầu chuyến đi từ ứng dụng di động (xác thực khuôn mặt trên điện thoại) để xem vị trí trực tiếp tại
            đây.
          </p>
        </div>
      </div>
    );
  }

  const staleLabel = STALE_CONNECTION_LABEL[connectionStatus];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      {/* Status participates in layout rather than covering the map. Long
          connection labels can grow vertically at narrow widths/text zoom. */}
      <div className="flex shrink-0 flex-wrap items-start gap-3 border-b border-cyan-400/20 bg-slate-900/90 p-3 [overflow-wrap:anywhere] sm:p-4">
        <div className="min-w-0 flex-[1_1_10rem]">
          <p className="text-xs text-slate-400">Chuyến đi đang diễn ra</p>
          <p className="flex items-center gap-1.5 text-lg font-semibold text-white">
            <Gauge aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" /> {speedKmh.toFixed(0)} km/h
          </p>
        </div>
        {staleLabel && (
          <div className="flex min-w-0 flex-[2_1_18rem] items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-950/80 px-3 py-2 text-sm font-medium text-amber-200">
            <WifiOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">{staleLabel}</span>
          </div>
        )}
      </div>
      <div className="relative min-h-48 min-w-0 flex-1">
        <TripMap route={[]} position={position} trail={trail} />
      </div>
    </div>
  );
}
