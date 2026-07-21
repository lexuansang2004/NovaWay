import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type VerificationResult = 'success' | 'failed';

// Matches docs/DATA_MODEL.md §2.4 (migration: 1721260000004-CreateBiometricVerificationsTable).
// No column here may ever store raw face image/video data — only the outcome
// (FR-BIOMETRIC-04, NFR-PRIVACY-03).
@Entity('biometric_verifications')
export class BiometricVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'vehicle_authorization_id', type: 'uuid', nullable: true })
  vehicleAuthorizationId!: string | null;

  @Column({ type: 'enum', enum: ['success', 'failed'], enumName: 'verification_result' })
  result!: VerificationResult;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @CreateDateColumn({ name: 'verified_at', type: 'timestamptz' })
  verifiedAt!: Date;
}
