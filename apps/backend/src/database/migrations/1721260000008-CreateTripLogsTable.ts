import { MigrationInterface, QueryRunner } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.6. route_geometry is computed from
// raw_gps_events via raw SQL at trip-end (see TripsService), same reason
// gps-events.service.ts bypasses the TypeORM entity for PostGIS columns.
export class CreateTripLogsTable1721260000008 implements MigrationInterface {
  name = 'CreateTripLogsTable1721260000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE trip_logs (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trip_id                 UUID NOT NULL UNIQUE REFERENCES trips(id),
        user_id                 UUID NOT NULL REFERENCES users(id),
        vehicle_id              UUID NOT NULL REFERENCES vehicles(id),
        distance_km             DOUBLE PRECISION NOT NULL DEFAULT 0,
        duration_minutes        INTEGER NOT NULL DEFAULT 0,
        route_geometry          GEOMETRY(LineString, 4326),
        mismatch_warning_count  INTEGER NOT NULL DEFAULT 0,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_trip_logs_user_id ON trip_logs(user_id);`);
    await queryRunner.query(`CREATE INDEX idx_trip_logs_vehicle_id ON trip_logs(vehicle_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE trip_logs;`);
  }
}
