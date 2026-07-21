import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehicleAuthorizationModule } from '../vehicle-authorization/vehicle-authorization.module';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { ROUTING_PROVIDER } from './routing-provider.interface';
import { MockRoutingProvider } from './providers/mock-routing.provider';

@Module({
  imports: [VehiclesModule, VehicleAuthorizationModule],
  controllers: [RoutingController],
  providers: [RoutingService, { provide: ROUTING_PROVIDER, useClass: MockRoutingProvider }],
})
export class RoutingModule {}
