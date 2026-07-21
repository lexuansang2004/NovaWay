import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehicleAuthorizationModule } from '../vehicle-authorization/vehicle-authorization.module';
import { BiometricModule } from '../biometric/biometric.module';
import { MismatchDetectionModule } from '../mismatch-detection/mismatch-detection.module';
import { Trip } from './trip.entity';
import { TripLog } from './trip-log.entity';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripLog]),
    VehiclesModule,
    VehicleAuthorizationModule,
    BiometricModule,
    MismatchDetectionModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
