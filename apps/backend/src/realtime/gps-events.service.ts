import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface RecordGpsEventInput {
  tripId: string;
  vehicleId: string;
  userId: string;
  clientEventId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  accuracyM: number;
  eventTimestamp: string;
  // DATA_MODEL.md §2.7 sync_channel enum ('realtime' | 'batch'). Defaults to
  // 'realtime' so RealtimeGateway's existing call sites don't need changing;
  // SyncService (R2-2, POST /api/trips/sync) passes 'batch' explicitly.
  syncChannel?: 'realtime' | 'batch';
}

class DuplicateGpsEventError extends Error {}

@Injectable()
export class GpsEventsService {
  constructor(private readonly dataSource: DataSource) {}

  // Idempotency (NFR-SEC-03) via gps_event_dedup (DATA_MODEL.md §2.7).
  //
  // The doc's literal algorithm inserts into gps_event_dedup first, then
  // raw_gps_events — but gps_event_dedup.raw_gps_event_id is NOT NULL, and
  // that id doesn't exist until raw_gps_events has already been inserted.
  // So this does it in the order that actually satisfies the constraint:
  // insert raw_gps_events first (to get its id), then gps_event_dedup. On a
  // dedup conflict (a real duplicate), the whole transaction rolls back, so
  // no orphan raw_gps_events row survives — same idempotency guarantee as
  // the doc intends, just the insert order corrected to match the schema.
  async recordEvent(input: RecordGpsEventInput): Promise<{ persisted: boolean }> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const [{ id: rawGpsEventId }] = await manager.query(
          `INSERT INTO raw_gps_events
             (trip_id, vehicle_id, user_id, client_event_id, location, speed_kmh, accuracy_m, sync_channel, event_timestamp)
           VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, $9, $10)
           RETURNING id`,
          [
            input.tripId,
            input.vehicleId,
            input.userId,
            input.clientEventId,
            input.longitude,
            input.latitude,
            input.speedKmh,
            input.accuracyM,
            input.syncChannel ?? 'realtime',
            input.eventTimestamp,
          ],
        );

        const dedupRows = await manager.query(
          `INSERT INTO gps_event_dedup (user_id, client_event_id, raw_gps_event_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, client_event_id) DO NOTHING
           RETURNING raw_gps_event_id`,
          [input.userId, input.clientEventId, rawGpsEventId],
        );

        if (dedupRows.length === 0) {
          throw new DuplicateGpsEventError();
        }
      });

      return { persisted: true };
    } catch (error) {
      if (error instanceof DuplicateGpsEventError) {
        return { persisted: false };
      }
      throw error;
    }
  }
}
