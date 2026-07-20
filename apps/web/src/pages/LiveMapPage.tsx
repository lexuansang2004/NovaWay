import { Play, Square, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripMap } from '@/components/map/TripMap';
import { MOCK_ROUTE } from '@/mocks/route';
import { useMockGpsSender } from '@/services/useMockGpsSender';

export default function LiveMapPage() {
  const { position, speedKmh, progressMeters, trail, isRunning, start, stop } = useMockGpsSender(MOCK_ROUTE);

  return (
    <div className="relative h-full min-h-[600px] w-full">
      <TripMap route={MOCK_ROUTE} position={position} progressMeters={progressMeters} trail={trail} />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-4 rounded-xl border border-cyan-400/20 bg-slate-900/80 px-4 py-3 backdrop-blur-xl">
        <div>
          <p className="text-xs text-slate-400">Bắt đầu chuyến đi (mock)</p>
          <p className="flex items-center gap-1.5 text-lg font-semibold text-white">
            <Gauge className="h-4 w-4 text-cyan-300" /> {speedKmh.toFixed(0)} km/h
          </p>
        </div>
        <Button
          onClick={isRunning ? stop : start}
          className={
            isRunning
              ? 'border-0 bg-red-500 font-semibold text-white hover:bg-red-400'
              : 'border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 hover:from-cyan-300 hover:to-emerald-300'
          }
        >
          {isRunning ? (
            <>
              <Square className="h-4 w-4" /> Dừng
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Bắt đầu mô phỏng
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
