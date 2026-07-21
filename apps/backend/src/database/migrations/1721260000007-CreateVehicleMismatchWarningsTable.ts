import { MigrationInterface, QueryRunner } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.8.
export class CreateVehicleMismatchWarningsTable1721260000007 implements MigrationInterface {
  name = 'CreateVehicleMismatchWarningsTable1721260000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE mismatch_response AS ENUM ('confirmed', 'changed_vehicle', 'no_response');`);

    await queryRunner.query(`
      CREATE TABLE vehicle_mismatch_warnings (
        id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trip_id                     UUID NOT NULL REFERENCES trips(id),
        detected_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        declared_vehicle_type       vehicle_type NOT NULL,
        observed_behavior_summary   TEXT NOT NULL,
        user_response                mismatch_response NOT NULL DEFAULT 'no_response',
        resolved_at                  TIMESTAMPTZ
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_mismatch_warnings_trip_id ON vehicle_mismatch_warnings(trip_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE vehicle_mismatch_warnings;`);
    await queryRunner.query(`DROP TYPE mismatch_response;`);
  }
}
