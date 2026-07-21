import { VehicleType } from '../vehicles/vehicle.entity';

// Shared by every RoutingProvider (mock and real-engine alike) so
// FR-ROUTING-02 ("differs by vehicle type") holds regardless of which
// engine computed the distance — real engines (OSRM public demo, most
// commercial providers) don't expose a motorbike-specific profile, so we
// still derive duration ourselves from real distance + assumed avg speed.
export const AVG_SPEED_KMH_BY_VEHICLE_TYPE: Record<VehicleType, number> = {
  // Motorbikes lane-split through urban traffic in Vietnam; cars don't.
  motorbike: 35,
  car: 28,
};

export function durationMinFromDistance(distanceKm: number, vehicleType: VehicleType): number {
  const speedKmh = AVG_SPEED_KMH_BY_VEHICLE_TYPE[vehicleType];
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}
