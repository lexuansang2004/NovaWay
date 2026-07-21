import { Global, Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

// @Global — every module that wants to record a metric (RealtimeGateway,
// MismatchDetectionService, the HTTP logging interceptor) injects
// MetricsService without each having to import ObservabilityModule.
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class ObservabilityModule {}
