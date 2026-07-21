import { VehicleType } from '../../vehicles/vehicle.entity';
import { LatLng, RouteResult, RoutingProvider } from '../routing-provider.interface';
import { durationMinFromDistance } from '../vehicle-speed';

// docs/architecture/TDR-routing-engine.md — dev/test only, always wrapped
// by FallbackRoutingProvider. Never thrown directly to an HTTP client.
export class RoutingEngineUnavailableError extends Error {}

interface OsrmRouteResponse {
  code: string;
  routes: Array<{
    distance: number; // meters
    geometry: { coordinates: [number, number][] }; // [lng, lat][]
  }>;
}

export class OsrmRoutingProvider implements RoutingProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly maxRetries = 1,
  ) {}

  async getRoute(vehicleType: VehicleType, origin: LatLng, destination: LatLng): Promise<RouteResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.fetchRoute(vehicleType, origin, destination);
      } catch (error) {
        lastError = error;
      }
    }

    throw new RoutingEngineUnavailableError(
      lastError instanceof Error ? lastError.message : 'OSRM request failed',
    );
  }

  private async fetchRoute(
    vehicleType: VehicleType,
    origin: LatLng,
    destination: LatLng,
  ): Promise<RouteResult> {
    const url =
      `${this.baseUrl}/route/v1/driving/` +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      `?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new RoutingEngineUnavailableError(`OSRM responded ${response.status}`);
      }

      const body = (await response.json()) as OsrmRouteResponse;
      const route = body.routes?.[0];
      if (body.code !== 'Ok' || !route) {
        throw new RoutingEngineUnavailableError(`OSRM returned code=${body.code}`);
      }

      const distanceKm = route.distance / 1000;
      return {
        distanceKm: Math.round(distanceKm * 100) / 100,
        durationMin: durationMinFromDistance(distanceKm, vehicleType),
        polyline: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
