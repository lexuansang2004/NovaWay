import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';

// docs/REVIEW_NOTES.md §17 — every GPS insert on/after 2026-08-01 was
// failing ("no partition of relation raw_gps_events found for row") because
// nothing ever created a partition past the single static one the original
// migration shipped. ensure_raw_gps_partitions() (see migration
// 1721260000010-EnsureRawGpsPartitions.ts) is the idempotent, advisory-lock
// SQL routine that actually creates the partitions; this service just makes
// sure it keeps getting called — once at startup (so a long-running process
// started in, say, July still has an August partition by the time it's
// needed) and again roughly daily (so nobody has to redeploy just to roll
// the partition forward).
const PARTITION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PartitionMaintenanceService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(PartitionMaintenanceService.name);
  private intervalHandle: NodeJS.Timeout | undefined;

  constructor(private readonly dataSource: DataSource) {}

  // Fails the whole bootstrap (rethrows) if the very first ensure call
  // fails — the step 9.3 target is "partitions must exist before the
  // backend accepts GPS traffic", so silently starting up anyway (old
  // behaviour: catch-and-log everywhere) defeats that if the migration was
  // never applied, the function doesn't exist, or the app's DB role lacks
  // CREATE TABLE on raw_gps_events. The periodic re-check must NOT rethrow
  // once the app is already serving traffic — that path only logs, so a
  // transient DB blip doesn't crash a healthy running process; the next
  // scheduled run simply retries.
  async onApplicationBootstrap(): Promise<void> {
    await this.ensurePartitionsOrThrow();

    this.intervalHandle = setInterval(() => {
      this.ensurePartitionsOrThrow().catch(() => {
        // Already logged inside ensurePartitionsOrThrow — this catch exists
        // solely so the periodic call never produces an unhandled promise
        // rejection. The next interval tick retries on its own.
      });
    }, PARTITION_CHECK_INTERVAL_MS);
    // Windows/Linux alike: an active interval otherwise keeps the process
    // (and, in tests, the Jest worker) alive even after everything else is
    // done — this is periodic maintenance, not something that should block
    // shutdown.
    this.intervalHandle.unref?.();
  }

  onApplicationShutdown(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  private async ensurePartitionsOrThrow(): Promise<void> {
    try {
      await this.dataSource.query('SELECT ensure_raw_gps_partitions()');
      this.logger.log('raw_gps_events partitions verified (current + next UTC month)');
    } catch (error) {
      // No connection string/secret is ever part of this query or its error
      // path — only the driver's error message is logged.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to ensure raw_gps_events partitions: ${message}`);
      throw error;
    }
  }
}
