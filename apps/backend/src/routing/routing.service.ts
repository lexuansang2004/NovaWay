import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { VehiclesService } from '../vehicles/vehicles.service';
import { VehicleAuthorizationService } from '../vehicle-authorization/vehicle-authorization.service';
import { ROUTING_PROVIDER, RouteResult, RoutingProvider } from './routing-provider.interface';
import { RoutePreviewDto } from './dto/route-preview.dto';

@Injectable()
export class RoutingService {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly vehicleAuthorizationService: VehicleAuthorizationService,
    @Inject(ROUTING_PROVIDER)
    private readonly routingProvider: RoutingProvider,
  ) {}

  async preview(userId: string, dto: RoutePreviewDto): Promise<RouteResult & { vehicleType: string }> {
    const vehicle = await this.vehiclesService.findById(dto.vehicle_id);
    if (!vehicle) {
      throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Phương tiện không tồn tại.' });
    }

    // FR-ROUTING-03: same owner-or-active-borrower check as biometric verify
    // (BiometricService.verify) — reused rather than duplicated.
    const isOwner = vehicle.userId === userId;
    if (!isOwner) {
      const activeAuthorization = await this.vehicleAuthorizationService.findActiveForBorrower(
        dto.vehicle_id,
        userId,
      );
      if (!activeAuthorization) {
        throw new ForbiddenException({
          error_code: 'NOT_AUTHORIZED_FOR_VEHICLE',
          message: 'Bạn không có quyền với phương tiện này.',
        });
      }
    }

    const route = await this.routingProvider.getRoute(vehicle.type, dto.origin, dto.destination);
    return { ...route, vehicleType: vehicle.type };
  }
}
