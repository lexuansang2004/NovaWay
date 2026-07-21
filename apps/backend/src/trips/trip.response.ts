import { Trip } from './trip.entity';
import { TripLog } from './trip-log.entity';
import { VehicleMismatchWarning } from '../mismatch-detection/vehicle-mismatch-warning.entity';

// docs/API_CONTRACT.md §5 GET /trips.
export function toTripListItemResponse(trip: Trip, distanceKm: number) {
  return {
    id: trip.id,
    vehicle_id: trip.vehicleId,
    status: trip.status,
    started_at: trip.startedAt,
    ended_at: trip.endedAt,
    distance_km: distanceKm,
  };
}

function toTripLogResponse(tripLog: TripLog) {
  return {
    distance_km: tripLog.distanceKm,
    duration_minutes: tripLog.durationMinutes,
    mismatch_warning_count: tripLog.mismatchWarningCount,
  };
}

function toWarningResponse(warning: VehicleMismatchWarning) {
  return {
    id: warning.id,
    detected_at: warning.detectedAt,
    declared_vehicle_type: warning.declaredVehicleType,
    observed_behavior_summary: warning.observedBehaviorSummary,
    user_response: warning.userResponse,
  };
}

// docs/API_CONTRACT.md §5 POST /trips/:id/end.
export function toTripWithLogResponse(trip: Trip, tripLog: TripLog) {
  return {
    id: trip.id,
    vehicle_id: trip.vehicleId,
    status: trip.status,
    started_at: trip.startedAt,
    ended_at: trip.endedAt,
    trip_log: toTripLogResponse(tripLog),
  };
}

// docs/API_CONTRACT.md §5 GET /trips/:id.
export function toTripDetailResponse(trip: Trip, tripLog: TripLog | null, warnings: VehicleMismatchWarning[]) {
  return {
    id: trip.id,
    vehicle_id: trip.vehicleId,
    status: trip.status,
    started_at: trip.startedAt,
    ended_at: trip.endedAt,
    trip_log: tripLog ? toTripLogResponse(tripLog) : null,
    warnings: warnings.map(toWarningResponse),
  };
}
