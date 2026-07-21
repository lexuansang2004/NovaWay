import { Logger } from '@nestjs/common';
import { VehicleType } from '../../vehicles/vehicle.entity';
import { LatLng, RouteResult, RoutingProvider } from '../routing-provider.interface';

// docs/architecture/TDR-routing-engine.md — a primary engine failure must
// never fail the user's request; always fall through to `fallback`.
export class FallbackRoutingProvider implements RoutingProvider {
  private readonly logger = new Logger(FallbackRoutingProvider.name);

  constructor(
    private readonly primary: RoutingProvider,
    private readonly fallback: RoutingProvider,
  ) {}

  async getRoute(vehicleType: VehicleType, origin: LatLng, destination: LatLng): Promise<RouteResult> {
    try {
      return await this.primary.getRoute(vehicleType, origin, destination);
    } catch (error) {
      this.logger.warn(
        `Primary routing provider failed, falling back to mock: ${error instanceof Error ? error.message : error}`,
      );
      return this.fallback.getRoute(vehicleType, origin, destination);
    }
  }
}
