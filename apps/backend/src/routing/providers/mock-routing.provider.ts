import { Injectable } from '@nestjs/common';
import { VehicleType } from '../../vehicles/vehicle.entity';
import { LatLng, RouteResult, RoutingProvider } from '../routing-provider.interface';
import { durationMinFromDistance } from '../vehicle-speed';

// docs/DATA_MODEL.md doesn't govern this (no persistence) — mock only,
// swapped for OSRM/GraphHopper at step 5.2 behind the same interface.
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

@Injectable()
export class MockRoutingProvider implements RoutingProvider {
  async getRoute(vehicleType: VehicleType, origin: LatLng, destination: LatLng): Promise<RouteResult> {
    const distanceKm = haversineKm(origin, destination);
    const durationMin = durationMinFromDistance(distanceKm, vehicleType);

    const midpoint: LatLng = {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin,
      polyline: [
        [origin.lat, origin.lng],
        [midpoint.lat, midpoint.lng],
        [destination.lat, destination.lng],
      ],
    };
  }
}
