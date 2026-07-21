import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.6 (migration: 1721260000008-CreateTripLogsTable).
// `route_geometry` is deliberately not mapped here — no API response
// returns it (API_CONTRACT.md §5), and TypeORM has no first-class PostGIS
// geometry type; it's written via raw SQL in TripsService, same reason
// gps-events.service.ts bypasses the entity for raw_gps_events.location.
@Entity('trip_logs')
export class TripLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id', type: 'uuid' })
  tripId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'distance_km', type: 'double precision', default: 0 })
  distanceKm!: number;

  @Column({ name: 'duration_minutes', type: 'int', default: 0 })
  durationMinutes!: number;

  @Column({ name: 'mismatch_warning_count', type: 'int', default: 0 })
  mismatchWarningCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
