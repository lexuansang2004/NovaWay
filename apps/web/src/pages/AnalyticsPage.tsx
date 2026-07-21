import { useEffect, useMemo, useState } from 'react';
import { Route, Clock, TriangleAlert } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
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

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Lịch sử &amp; Phân tích chuyến đi</h1>
          <p className="mt-1 text-sm text-slate-400">Quãng đường, thời gian và cảnh báo theo phương tiện.</p>
        </div>

        <div className="flex gap-2" role="group" aria-label="Lọc theo loại phương tiện">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Tổng quãng đường" value={`${totals.distanceKm.toFixed(1)} km`} Icon={Route} accent="cyan" />
              <StatCard label="Tổng thời gian" value={`${totals.durationMinutes} phút`} Icon={Clock} accent="emerald" />
              <StatCard label="Cảnh báo an toàn" value={`${totals.warnings}`} Icon={TriangleAlert} accent="amber" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-xl">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="rgba(148,163,184,0.7)" fontSize={12} />
                  <YAxis yAxisId="left" stroke={CYAN} fontSize={12} unit="km" />
                  <YAxis yAxisId="right" orientation="right" stroke={EMERALD} fontSize={12} unit="p" />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelStyle={{ color: '#f8fafc' }}
                  />
                  <Legend />
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
