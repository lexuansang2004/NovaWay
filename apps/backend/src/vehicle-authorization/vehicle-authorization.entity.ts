import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type StoredAuthorizationStatus = 'active' | 'expired' | 'revoked';

// Matches docs/DATA_MODEL.md §2.3 (migration: 1721260000003-CreateVehicleAuthorizationsTable).
@Entity('vehicle_authorizations')
export class VehicleAuthorization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'borrower_id', type: 'uuid' })
  borrowerId!: string;

  @CreateDateColumn({ name: 'granted_at', type: 'timestamptz' })
  grantedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({
    type: 'enum',
    enum: ['active', 'expired', 'revoked'],
    enumName: 'authorization_status',
    default: 'active',
  })
  status!: StoredAuthorizationStatus;
}
