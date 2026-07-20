import { MigrationInterface, QueryRunner } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.3.
export class CreateVehicleAuthorizationsTable1721260000003 implements MigrationInterface {
  name = 'CreateVehicleAuthorizationsTable1721260000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Needed for the EXCLUDE USING gist constraint below.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);

    await queryRunner.query(`CREATE TYPE authorization_status AS ENUM ('active', 'expired', 'revoked');`);

    await queryRunner.query(`
      CREATE TABLE vehicle_authorizations (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        owner_id    UUID NOT NULL REFERENCES users(id),
        borrower_id UUID NOT NULL REFERENCES users(id),
        granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked_at  TIMESTAMPTZ,
        status      authorization_status NOT NULL DEFAULT 'active',
        CHECK (expires_at > granted_at),
        CHECK (owner_id <> borrower_id)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_vehicle_authorizations_vehicle_id ON vehicle_authorizations(vehicle_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_vehicle_authorizations_borrower_id ON vehicle_authorizations(borrower_id);`,
    );

    // No two active authorizations for the same vehicle may have overlapping
    // [granted_at, expires_at) windows (EDGE_CASES.md §2.1).
    await queryRunner.query(`
      ALTER TABLE vehicle_authorizations ADD CONSTRAINT no_overlapping_active_authz
        EXCLUDE USING gist (
          vehicle_id WITH =,
          tstzrange(granted_at, expires_at) WITH &&
        ) WHERE (status = 'active');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE vehicle_authorizations;`);
    await queryRunner.query(`DROP TYPE authorization_status;`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS btree_gist;`);
  }
}
