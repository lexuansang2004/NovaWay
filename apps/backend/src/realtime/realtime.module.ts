import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TripsModule } from '../trips/trips.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { MismatchDetectionModule } from '../mismatch-detection/mismatch-detection.module';
import { RealtimeGateway } from './realtime.gateway';
import { GpsEventsService } from './gps-events.service';
import { GpsRateLimiterService } from './gps-rate-limiter.service';

@Module({
  imports: [
    TripsModule,
    VehiclesModule,
    MismatchDetectionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [RealtimeGateway, GpsEventsService, GpsRateLimiterService],
  // GpsEventsService reused by SyncModule (POST /api/trips/sync, R2-2) so
  // the raw_gps_events/gps_event_dedup insert logic isn't duplicated.
  exports: [GpsEventsService],
})
export class RealtimeModule {}
