import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { VehicleType } from '../vehicles/vehicle.entity';

export type MismatchResponse = 'confirmed' | 'changed_vehicle' | 'no_response';

// Matches docs/DATA_MODEL.md §2.8 (migration: 1721260000007-CreateVehicleMismatchWarningsTable).
@Entity('vehicle_mismatch_warnings')
export class VehicleMismatchWarning {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id', type: 'uuid' })
  tripId!: string;

  @CreateDateColumn({ name: 'detected_at', type: 'timestamptz' })
  detectedAt!: Date;

  @Column({ name: 'declared_vehicle_type', type: 'enum', enum: ['motorbike', 'car'], enumName: 'vehicle_type' })
  declaredVehicleType!: VehicleType;

  @Column({ name: 'observed_behavior_summary', type: 'text' })
  observedBehaviorSummary!: string;

  @Column({
    name: 'user_response',
    type: 'enum',
    enum: ['confirmed', 'changed_vehicle', 'no_response'],
    enumName: 'mismatch_response',
    default: 'no_response',
  })
  userResponse!: MismatchResponse;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;
}
