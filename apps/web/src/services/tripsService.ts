import { apiClient } from '@/lib/apiClient';
import { getToken } from '@/services/authService';

export type TripStatus = 'active' | 'ended';

export interface Trip {
  id: string;
  vehicle_id: string;
  status: TripStatus;
  started_at: string;
  ended_at: string | null;
  distance_km: number;
  duration_minutes: number;
  mismatch_warning_count: number;
}

function requireToken(): string {
  const token = getToken();
  if (!token) {
    throw new Error('Chưa đăng nhập.');
  }
  return token;
}

// docs/API_CONTRACT.md §5 GET /trips — no vehicleId fetches every trip of
// the current user, matching AnalyticsPage's client-side type filter
// (vehicle type isn't queryable server-side; only a specific vehicle_id is).
export async function listTrips(vehicleId?: string): Promise<Trip[]> {
  const query = vehicleId ? `?vehicle_id=${encodeURIComponent(vehicleId)}` : '';
  const { trips } = await apiClient.get<{ trips: Trip[] }>(`/trips${query}`, requireToken());
  return trips;
}
