import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Bare foundation module for step 0.2 (chore/repo-foundation). Domain modules
// (AuthModule, VehiclesModule, VehicleAuthorizationModule, BiometricModule,
// TripsModule, RealtimeGatewayModule, SyncModule, MismatchDetectionModule,
// TerrainWarningsModule, ObservabilityModule — see docs/ARCHITECTURE.md §3.1)
// are added incrementally in their own micro-steps (1.1 onward), not here.
@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
