import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehicleAuthorizationModule } from '../vehicle-authorization/vehicle-authorization.module';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { ROUTING_PROVIDER } from './routing-provider.interface';
import { MockRoutingProvider } from './providers/mock-routing.provider';
import { OsrmRoutingProvider } from './providers/osrm-routing.provider';
import { FallbackRoutingProvider } from './providers/fallback-routing.provider';

@Module({
  imports: [VehiclesModule, VehicleAuthorizationModule, ConfigModule],
  controllers: [RoutingController],
  providers: [
    RoutingService,
    {
      provide: ROUTING_PROVIDER,
      inject: [ConfigService],
      // docs/architecture/TDR-routing-engine.md — ROUTING_PROVIDER=osrm
      // wraps the (dev/test only) OSRM public demo call with a fallback
      // to the mock provider; default 'mock' never calls out at all.
      useFactory: (configService: ConfigService) => {
        const mock = new MockRoutingProvider();
        if (configService.get<string>('ROUTING_PROVIDER') !== 'osrm') {
          return mock;
        }

        const osrm = new OsrmRoutingProvider(
          configService.get<string>('ROUTING_ENGINE_BASE_URL')!,
          configService.get<number>('ROUTING_ENGINE_TIMEOUT_MS')!,
        );
        return new FallbackRoutingProvider(osrm, mock);
      },
    },
  ],
})
export class RoutingModule {}
