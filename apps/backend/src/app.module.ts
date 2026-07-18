import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';

// Domain modules (AuthModule, VehiclesModule, VehicleAuthorizationModule,
// BiometricModule, TripsModule, RealtimeGatewayModule, SyncModule,
// MismatchDetectionModule, TerrainWarningsModule — see docs/ARCHITECTURE.md
// §3.1) are added incrementally in their own micro-steps (1.2 onward), not here.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
