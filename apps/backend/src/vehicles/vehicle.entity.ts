import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type VehicleType = 'motorbike' | 'car';

// Matches docs/DATA_MODEL.md §2.2 (migration: 1721260000002-CreateVehiclesTable).
@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: ['motorbike', 'car'], enumName: 'vehicle_type' })
  type!: VehicleType;

  @Column({ name: 'license_plate', type: 'varchar', length: 20 })
  licensePlate!: string;

  @Column({ name: 'brand_model', type: 'varchar', length: 100, nullable: true })
  brandModel!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
