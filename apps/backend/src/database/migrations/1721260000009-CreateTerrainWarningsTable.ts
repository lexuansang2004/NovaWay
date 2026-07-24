import { MigrationInterface, QueryRunner } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.9. R3-5 (docs/roadmap/SPRINT_R3_VERIFICATION_CD_HARDENING.md)
// finally picks the migration step left as "chưa chốt" in §3 of that doc —
// no other step ever needed this table, and it has no FK dependency on
// anything else, so it can land on its own branch/step.
//
// docs/ARCHITECTURE.md §3.2: TerrainWarningSource is MVP-scoped to reading
// seed/mock data from this table (source='mock_seed'); a real Computer
// Vision pipeline that writes source='computer_vision' rows is explicit
// Post-MVP/R&D — out of scope here, and doesn't require a different code
// path, just a different writer into the same table/columns.
export class CreateTerrainWarningsTable1721260000009 implements MigrationInterface {
  name = 'CreateTerrainWarningsTable1721260000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE warning_severity AS ENUM ('warning', 'danger');`);
    await queryRunner.query(`CREATE TYPE warning_source AS ENUM ('mock_seed', 'computer_vision');`);

    await queryRunner.query(`
      CREATE TABLE terrain_warnings (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reported_by_trip_id   UUID REFERENCES trips(id),
        location              GEOGRAPHY(Point, 4326) NOT NULL,
        severity              warning_severity NOT NULL,
        description           TEXT,
        source                warning_source NOT NULL DEFAULT 'mock_seed',
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_terrain_warnings_location ON terrain_warnings USING GIST(location);`);

    // Seed data (source='mock_seed', the default) — a handful of plausible
    // road-hazard points around central Ho Chi Minh City, the same area
    // used throughout this project's other manual/seed test data (e.g.
    // _defaultCenter in apps/mobile's TripCockpitScreen), so a fresh dev
    // environment has something real to query without extra setup.
    await queryRunner.query(`
      INSERT INTO terrain_warnings (location, severity, description) VALUES
        (ST_SetSRID(ST_MakePoint(106.700100, 10.776500), 4326)::geography, 'warning', 'Mặt đường gồ ghề, nhiều ổ gà nhỏ'),
        (ST_SetSRID(ST_MakePoint(106.692000, 10.786000), 4326)::geography, 'danger', 'Ngập sâu khi mưa lớn, tránh giờ cao điểm'),
        (ST_SetSRID(ST_MakePoint(106.660200, 10.762600), 4326)::geography, 'warning', 'Dải phân cách đang thi công, thu hẹp làn đường'),
        (ST_SetSRID(ST_MakePoint(106.708300, 10.793000), 4326)::geography, 'danger', 'Sạt lở lề đường sau mưa, tránh đi sát vỉa hè');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE terrain_warnings;`);
    await queryRunner.query(`DROP TYPE warning_source;`);
    await queryRunner.query(`DROP TYPE warning_severity;`);
  }
}
