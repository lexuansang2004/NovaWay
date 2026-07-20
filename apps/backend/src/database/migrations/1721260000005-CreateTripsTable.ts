import { MigrationInterface, QueryRunner } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.5. Migrated here (step 3.1) rather than step
// 7.1 because raw_gps_events.trip_id needs it to exist — see DATA_MODEL.md §3
// "Sửa 07/2026 (lần 2)". Schema only; the real TripsModule (start/end/list/
// summary) is still built at step 7.1 feat/trip-logs-api.
export class CreateTripsTable1721260000005 implements MigrationInterface {
  name = 'CreateTripsTable1721260000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE trip_status AS ENUM ('active', 'ended');`);

    await queryRunner.query(`
      CREATE TABLE trips (
        id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                     UUID NOT NULL REFERENCES users(id),
        vehicle_id                  UUID NOT NULL REFERENCES vehicles(id),
        biometric_verification_id   UUID NOT NULL REFERENCES biometric_verifications(id),
        status                      trip_status NOT NULL DEFAULT 'active',
        consent_at                  TIMESTAMPTZ NOT NULL,
        started_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        ended_at                    TIMESTAMPTZ
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_trips_user_id ON trips(user_id);`);
    await queryRunner.query(`CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);`);

    // Only 1 active trip at a time per user (EDGE_CASES.md §2 — 2 concurrent sessions).
    await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_trips_active_per_user
        ON trips(user_id) WHERE status = 'active';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE trips;`);
    await queryRunner.query(`DROP TYPE trip_status;`);
  }
}
