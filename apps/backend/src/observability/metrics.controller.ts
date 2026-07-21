import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

// Excluded from the /api prefix (main.ts), same as /health — an ops
// endpoint, not part of the client-facing API surface.
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  get(): string {
    return this.metricsService.render();
  }
}
