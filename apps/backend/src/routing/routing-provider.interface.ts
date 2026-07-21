import { VehicleType } from '../vehicles/vehicle.entity';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
}

// docs/ARCHITECTURE.md §3.2 — mock now (step 5.1), OSRM/GraphHopper later
// (step 5.2) without changing this contract or the HTTP contract it backs.
export const ROUTING_PROVIDER = Symbol('ROUTING_PROVIDER');

export interface RoutingProvider {
  getRoute(vehicleType: VehicleType, origin: LatLng, destination: LatLng): Promise<RouteResult>;
}
