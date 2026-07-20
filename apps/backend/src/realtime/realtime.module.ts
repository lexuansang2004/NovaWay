import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TripsModule } from '../trips/trips.module';
import { RealtimeGateway } from './realtime.gateway';
import { GpsEventsService } from './gps-events.service';

@Module({
  imports: [
    TripsModule,
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
