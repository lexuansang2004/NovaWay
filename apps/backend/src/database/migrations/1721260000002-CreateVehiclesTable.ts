import { MigrationInterface, QueryRunner } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.2.
export class CreateVehiclesTable1721260000002 implements MigrationInterface {
  name = 'CreateVehiclesTable1721260000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE vehicle_type AS ENUM ('motorbike', 'car');`);

    await queryRunner.query(`
      CREATE TABLE vehicles (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type          vehicle_type NOT NULL,
        license_plate VARCHAR(20) NOT NULL,
        brand_model   VARCHAR(100),
        is_active     BOOLEAN NOT NULL DEFAULT false,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);`);

    // Only 1 active vehicle at a time per user (FR-VEHICLE-03).
    await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_vehicles_active_per_user
        ON vehicles(user_id) WHERE is_active = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE vehicles;`);
    await queryRunner.query(`DROP TYPE vehicle_type;`);
  }
}
