import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TripsModule } from '../trips/trips.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { MismatchDetectionModule } from '../mismatch-detection/mismatch-detection.module';
import { RealtimeGateway } from './realtime.gateway';
import { GpsEventsService } from './gps-events.service';

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
  providers: [RealtimeGateway, GpsEventsService],
})
export class RealtimeModule {}
