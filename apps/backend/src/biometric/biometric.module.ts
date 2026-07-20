import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehicleAuthorizationModule } from '../vehicle-authorization/vehicle-authorization.module';
import { BiometricVerification } from './biometric-verification.entity';
import { BiometricController } from './biometric.controller';
import { BiometricService } from './biometric.service';
import { BIOMETRIC_PROVIDER } from './biometric-provider.interface';
import { MockBiometricProvider } from './providers/mock-biometric.provider';

@Module({
  imports: [TypeOrmModule.forFeature([BiometricVerification]), VehiclesModule, VehicleAuthorizationModule],
  controllers: [BiometricController],
  providers: [BiometricService, { provide: BIOMETRIC_PROVIDER, useClass: MockBiometricProvider }],
})
export class BiometricModule {}
