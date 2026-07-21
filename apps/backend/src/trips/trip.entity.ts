import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TripStatus = 'active' | 'ended';

// Matches docs/DATA_MODEL.md §2.5 (migration: 1721260000005-CreateTripsTable).
// Only the columns needed by step 3.1 (ownership lookup for the realtime
// gateway) are used so far — the full trip lifecycle (start/end) is built at
// step 7.1 feat/trip-logs-api, which will extend this same entity/module.
@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'biometric_verification_id', type: 'uuid' })
  biometricVerificationId!: string;

  @Column({ type: 'enum', enum: ['active', 'ended'], enumName: 'trip_status', default: 'active' })
  status!: TripStatus;

  @Column({ name: 'consent_at', type: 'timestamptz' })
  consentAt!: Date;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;
}
