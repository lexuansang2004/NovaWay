import { MigrationInterface, QueryRunner } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.4. Deliberately no column stores raw face
// image/video data anywhere — only the verification outcome (FR-BIOMETRIC-04,
// NFR-PRIVACY-03). Do not add one; see AGENTS.md "no raw biometric image storage".
export class CreateBiometricVerificationsTable1721260000004 implements MigrationInterface {
  name = 'CreateBiometricVerificationsTable1721260000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE verification_result AS ENUM ('success', 'failed');`);

    await queryRunner.query(`
      CREATE TABLE biometric_verifications (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                   UUID NOT NULL REFERENCES users(id),
        vehicle_id                UUID NOT NULL REFERENCES vehicles(id),
        vehicle_authorization_id  UUID REFERENCES vehicle_authorizations(id),
        result                    verification_result NOT NULL,
        provider                  VARCHAR(50) NOT NULL,
        verified_at               TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_biometric_verifications_user_vehicle ON biometric_verifications(user_id, vehicle_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE biometric_verifications;`);
    await queryRunner.query(`DROP TYPE verification_result;`);
  }
}
