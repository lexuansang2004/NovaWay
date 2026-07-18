import { MigrationInterface, QueryRunner } from 'typeorm';

// pgcrypto: gen_random_uuid() for primary keys (DATA_MODEL.md §1).
// postgis: GEOGRAPHY/GEOMETRY columns used by later tables (TDR-001).
export class EnableExtensions1721260000000 implements MigrationInterface {
  name = 'EnableExtensions1721260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // CASCADE: the postgis/postgis base image also auto-installs
    // postgis_topology/postgis_tiger_geocoder, which depend on postgis.
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis CASCADE;`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pgcrypto;`);
  }
}
