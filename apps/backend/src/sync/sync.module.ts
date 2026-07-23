import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

// docs/ARCHITECTURE.md §3.1 — "SyncModule | REST batch sync /api/trips/sync,
// idempotency | TripsModule". Also imports RealtimeModule to reuse
// GpsEventsService's insert/dedup transaction instead of duplicating it.
@Module({
  imports: [TripsModule, RealtimeModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
