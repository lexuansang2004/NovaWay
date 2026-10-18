import { useEffect, useMemo, useState } from 'react';
import { Route, Clock, TriangleAlert } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MapGridBackdrop } from '@/components/common/MapGridBackdrop';
import { StatCard } from '@/components/dashboard/StatCard';
import { cn } from '@/lib/utils';
import { listTrips, type Trip } from '@/services/tripsService';
import { listVehicles, type Vehicle, type VehicleType } from '@/services/vehiclesService';

type TypeFilter = 'all' | VehicleType;

const FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'motorbike', label: 'Xe máy' },
  { value: 'car', label: 'Ô tô' },
];

const CYAN = '#22d3ee';
const EMERALD = '#34d399';
const RED = '#f87171';

function formatChartLabel(trip: Trip): string {
  return new Date(trip.started_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function AnalyticsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tripsResult, vehiclesResult] = await Promise.all([listTrips(), listVehicles()]);
        if (cancelled) return;
        setTrips(tripsResult);
        setVehicles(vehiclesResult);
      } catch {
        if (!cancelled) setError('Không tải được dữ liệu chuyến đi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const vehicleTypeById = useMemo(() => new Map(vehicles.map((v) => [v.id, v.type])), [vehicles]);

  // Only ended trips have a real trip_log summary (distance/duration/
  // warnings) — active trips always report 0 (API_CONTRACT.md §5), so they'd
  // just show as empty bars.
  const endedTrips = useMemo(() => trips.filter((t) => t.status === 'ended'), [trips]);

  const filteredTrips = useMemo(() => {
    const byDate = [...endedTrips].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    );
    if (filter === 'all') return byDate;
    return byDate.filter((t) => vehicleTypeById.get(t.vehicle_id) === filter);
  }, [endedTrips, filter, vehicleTypeById]);

  const chartData = useMemo(
    () =>
      filteredTrips.map((trip) => ({
        name: formatChartLabel(trip),
        distance_km: Math.round(trip.distance_km * 100) / 100,
        duration_minutes: trip.duration_minutes,
        mismatch_warning_count: trip.mismatch_warning_count,
      })),
    [filteredTrips],
  );

  const totals = useMemo(
    () =>
      filteredTrips.reduce(
        (acc, t) => ({
          distanceKm: acc.distanceKm + t.distance_km,
          durationMinutes: acc.durationMinutes + t.duration_minutes,
          warnings: acc.warnings + t.mismatch_warning_count,
        }),
        { distanceKm: 0, durationMinutes: 0, warnings: 0 },
      ),
    [filteredTrips],
  );

  return (
    <div className="relative min-h-full">
      <MapGridBackdrop className="opacity-70" withRadar={false} />

      <div className="relative z-10 mx-auto flex min-w-0 max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8 [overflow-wrap:anywhere]">
        <div>
          <h1 className="text-2xl font-semibold text-white">Lịch sử &amp; Phân tích chuyến đi</h1>
          <p className="mt-1 text-sm text-slate-400">Quãng đường, thời gian và cảnh báo theo phương tiện.</p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo loại phương tiện">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                'min-h-11 min-w-11 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300',
                filter === value
                  ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                  : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Đang tải dữ liệu...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : filteredTrips.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có chuyến đi nào đã kết thúc phù hợp bộ lọc.</p>
        ) : (
          <>
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
              <StatCard label="Tổng quãng đường" value={`${totals.distanceKm.toFixed(1)} km`} Icon={Route} accent="cyan" />
              <StatCard label="Tổng thời gian" value={`${totals.durationMinutes} phút`} Icon={Clock} accent="emerald" />
              <StatCard label="Cảnh báo an toàn" value={`${totals.warnings}`} Icon={TriangleAlert} accent="amber" />
            </div>

            <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/50 p-3 backdrop-blur-xl sm:p-4">
              <ul aria-label="Chú giải biểu đồ" className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                <li className="flex min-w-0 items-start gap-2">
                  <span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-cyan-400" />
                  <span>Quãng đường (km, trục trái)</span>
                </li>
                <li className="flex min-w-0 items-start gap-2">
                  <span aria-hidden="true" className="mt-2 h-0.5 w-3 shrink-0 bg-emerald-400" />
                  <span>Thời gian (phút, trục phải)</span>
                </li>
              </ul>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 32, right: 4, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="rgba(148,163,184,0.7)" fontSize="0.75rem" height={48} minTickGap={40} />
                  <YAxis yAxisId="left" stroke={CYAN} fontSize="0.75rem" width="auto" tickFormatter={(value: number) => Math.abs(value) >= 10000 ? value.toExponential(1) : `${value}`} />
                  <YAxis yAxisId="right" orientation="right" stroke={EMERALD} fontSize="0.75rem" width="auto" tickFormatter={(value: number) => Math.abs(value) >= 10000 ? value.toExponential(1) : `${value}`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                    wrapperStyle={{ maxWidth: '100%' }}
                    labelStyle={{ color: '#f8fafc' }}
                  />
                  <Bar yAxisId="left" dataKey="distance_km" name="Quãng đường (km)" fill={CYAN} radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.mismatch_warning_count > 0 ? RED : CYAN} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="duration_minutes"
                    name="Thời gian (phút)"
                    stroke={EMERALD}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-slate-500">Cột màu đỏ = chuyến đi có cảnh báo an toàn.</p>
              <details className="mt-4 rounded-xl border border-white/10">
                <summary className="min-h-11 cursor-pointer rounded-xl px-3 py-3 text-sm text-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
                  Đọc số liệu từng chuyến ({chartData.length})
                </summary>
                <ol aria-label="Số liệu từng chuyến" className="space-y-3 p-3 pt-0">
                  {chartData.map((entry, index) => (
                    <li key={filteredTrips[index].id} className="min-w-0 rounded-lg bg-white/[0.03] p-3">
                      <h2 className="text-sm font-medium text-white">Chuyến {index + 1} — {entry.name}</h2>
                      <dl className="mt-2 grid gap-2 text-sm text-slate-300">
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                          <dt>Quãng đường</dt><dd>{entry.distance_km} km</dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                          <dt>Thời gian</dt><dd>{entry.duration_minutes} phút</dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                          <dt>Số cảnh báo an toàn</dt><dd>{entry.mismatch_warning_count}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ol>
              </details>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
