import { MigrationInterface, QueryRunner } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.7. gps_event_dedup is the real idempotency
// enforcement (NFR-SEC-03) — see apps/backend/src/realtime/gps-events.service.ts
// for why the insert order there differs from the doc's literal step order
// (raw_gps_event_id is NOT NULL, so raw_gps_events must be inserted first).
//
// Only the current month's partition is created here. Rolling monthly
// partition creation + >30 day cleanup is the "raw_gps_cleanup" job
// (DATA_MODEL.md §4), built at step 9.1 chore/observability-baseline — not
// yet part of this step's scope.
export class CreateRawGpsEventsTable1721260000006 implements MigrationInterface {
  name = 'CreateRawGpsEventsTable1721260000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE gps_source AS ENUM ('gps');`);
    await queryRunner.query(`CREATE TYPE sync_channel AS ENUM ('realtime', 'batch');`);

    await queryRunner.query(`
      CREATE TABLE raw_gps_events (
        id               BIGSERIAL,
        trip_id          UUID NOT NULL REFERENCES trips(id),
        vehicle_id       UUID NOT NULL,
        user_id          UUID NOT NULL,
        client_event_id  UUID NOT NULL,
        location         GEOGRAPHY(Point, 4326) NOT NULL,
        speed_kmh        REAL,
        accuracy_m       REAL,
        source           gps_source NOT NULL DEFAULT 'gps',
        sync_channel     sync_channel NOT NULL,
        event_timestamp  TIMESTAMPTZ NOT NULL,
        received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (id, received_at)
      ) PARTITION BY RANGE (received_at);
    `);

    await queryRunner.query(`CREATE INDEX idx_raw_gps_trip_id ON raw_gps_events(trip_id, received_at);`);

    await queryRunner.query(`
      CREATE TABLE gps_event_dedup (
        user_id          UUID NOT NULL,
        client_event_id  UUID NOT NULL,
        raw_gps_event_id BIGINT NOT NULL,
        PRIMARY KEY (user_id, client_event_id)
      );
    `);

    // First partition — covers local dev/testing now; rolling creation is step 9.1.
    await queryRunner.query(`
      CREATE TABLE raw_gps_events_2026_07 PARTITION OF raw_gps_events
        FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE gps_event_dedup;`);
    await queryRunner.query(`DROP TABLE raw_gps_events;`);
    await queryRunner.query(`DROP TYPE sync_channel;`);
    await queryRunner.query(`DROP TYPE gps_source;`);
  }
}
