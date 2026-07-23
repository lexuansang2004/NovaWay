import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehicleAuthorizationModule } from '../vehicle-authorization/vehicle-authorization.module';
import { BiometricVerification } from './biometric-verification.entity';
import { BiometricController } from './biometric.controller';
import { BiometricService } from './biometric.service';
import { BIOMETRIC_PROVIDER } from './biometric-provider.interface';
import { MockBiometricProvider } from './providers/mock-biometric.provider';
import { AwsRekognitionBiometricProvider } from './providers/aws-rekognition-biometric.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([BiometricVerification]),
    VehiclesModule,
    VehicleAuthorizationModule,
    ConfigModule,
  ],
  controllers: [BiometricController],
  providers: [
    BiometricService,
    {
      provide: BIOMETRIC_PROVIDER,
      inject: [ConfigService],
      // docs/architecture/TDR-biometric-provider-spike.md (R2-6) — stays on
      // the mock unless BIOMETRIC_PROVIDER=aws-rekognition is explicitly
      // set, which itself is only meant to be flipped once the AWS ToS/DPA
      // video-retention opt-out has been confirmed for that environment.
      useFactory: (configService: ConfigService) => {
        if (configService.get<string>('BIOMETRIC_PROVIDER') !== 'aws-rekognition') {
          return new MockBiometricProvider();
        }

        const client = new RekognitionClient({ region: configService.get<string>('AWS_REGION') });
        return new AwsRekognitionBiometricProvider(
          client,
          configService.get<number>('AWS_REKOGNITION_LIVENESS_MIN_CONFIDENCE')!,
        );
      },
    },
  ],
  exports: [BiometricService],
})
export class BiometricModule {}
