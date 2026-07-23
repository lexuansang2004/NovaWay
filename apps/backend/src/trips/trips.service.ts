import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { VehiclesService } from '../vehicles/vehicles.service';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAuthorizationService } from '../vehicle-authorization/vehicle-authorization.service';
import { BiometricService } from '../biometric/biometric.service';
import { BiometricVerification } from '../biometric/biometric-verification.entity';
import { MismatchDetectionService } from '../mismatch-detection/mismatch-detection.service';
import { VehicleMismatchWarning } from '../mismatch-detection/vehicle-mismatch-warning.entity';
import { Trip } from './trip.entity';
import { TripLog } from './trip-log.entity';
import { StartTripDto } from './dto/start-trip.dto';

// Postgres error code for a violated unique constraint
// (uniq_trips_active_per_user, DATA_MODEL.md §2.5).
const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface TripListEntry {
  trip: Trip;
  distanceKm: number;
  durationMinutes: number;
  mismatchWarningCount: number;
}

export interface TripDetail {
  trip: Trip;
  tripLog: TripLog | null;
  warnings: VehicleMismatchWarning[];
}

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripsRepository: Repository<Trip>,
    @InjectRepository(TripLog)
    private readonly tripLogsRepository: Repository<TripLog>,
    private readonly dataSource: DataSource,
    private readonly vehiclesService: VehiclesService,
    private readonly vehicleAuthorizationService: VehicleAuthorizationService,
    private readonly biometricService: BiometricService,
    private readonly mismatchDetectionService: MismatchDetectionService,
    private readonly configService: ConfigService,
  ) {}

  findById(id: string): Promise<Trip | null> {
    return this.tripsRepository.findOneBy({ id });
  }

  // docs/API_CONTRACT.md §5 POST /trips/start.
  async start(userId: string, dto: StartTripDto): Promise<Trip> {
    if (!dto.consent) {
      throw new BadRequestException({
        error_code: 'CONSENT_REQUIRED',
        message: 'Cần đồng ý chia sẻ vị trí trước khi bắt đầu chuyến đi.',
      });
    }

    const vehicle = await this.vehiclesService.findById(dto.vehicle_id);
    if (!vehicle || !(await this.isVehicleEligible(vehicle, userId))) {
      throw new BadRequestException({
        error_code: 'NO_ACTIVE_VEHICLE',
        message: 'Phương tiện chưa sẵn sàng để bắt đầu chuyến đi.',
      });
    }

    const verification = await this.biometricService.findById(dto.verification_id);
    if (!this.isVerificationValid(verification, userId, dto.vehicle_id)) {
      throw new BadRequestException({
        error_code: 'VERIFICATION_INVALID',
        message: 'Xác thực khuôn mặt không hợp lệ hoặc đã hết hạn.',
      });
    }

    const trip = this.tripsRepository.create({
      userId,
      vehicleId: dto.vehicle_id,
      biometricVerificationId: dto.verification_id,
      status: 'active',
      consentAt: new Date(),
    });

    try {
      return await this.tripsRepository.save(trip);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          error_code: 'TRIP_ALREADY_ACTIVE',
          message: 'Bạn đang có một chuyến đi khác đang hoạt động.',
        });
      }
      throw error;
    }
  }

  // docs/API_CONTRACT.md §5 POST /trips/:id/end.
  async end(tripId: string, userId: string): Promise<{ trip: Trip; tripLog: TripLog }> {
    const trip = await this.getOwnedTripOrThrow(tripId, userId);
    if (trip.status !== 'active') {
      throw new BadRequestException({ error_code: 'TRIP_NOT_ACTIVE', message: 'Chuyến đi đã kết thúc.' });
    }

    trip.status = 'ended';
    trip.endedAt = new Date();
    await this.tripsRepository.save(trip);

    const tripLog = await this.buildTripLog(trip);
    return { trip, tripLog };
  }

  // docs/API_CONTRACT.md §5 GET /trips?vehicle_id=.
  async list(userId: string, vehicleId?: string): Promise<TripListEntry[]> {
    const trips = await this.tripsRepository.find({
      where: vehicleId ? { userId, vehicleId } : { userId },
      order: { startedAt: 'DESC' },
    });
    if (trips.length === 0) {
      return [];
    }

    const logs = await this.tripLogsRepository.find({
      where: { tripId: In(trips.map((t) => t.id)) },
    });
    const logByTripId = new Map(logs.map((l) => [l.tripId, l]));

    return trips.map((trip) => {
      const log = logByTripId.get(trip.id);
      return {
        trip,
        distanceKm: log?.distanceKm ?? 0,
        durationMinutes: log?.durationMinutes ?? 0,
        mismatchWarningCount: log?.mismatchWarningCount ?? 0,
      };
    });
  }

  // docs/API_CONTRACT.md §5 GET /trips/:id.
  async findDetail(tripId: string, userId: string): Promise<TripDetail> {
    const trip = await this.getOwnedTripOrThrow(tripId, userId);
    const tripLog = await this.tripLogsRepository.findOneBy({ tripId });
    const warnings = await this.mismatchDetectionService.findByTripId(tripId);
    return { trip, tripLog, warnings };
  }

  // Public: also used by SyncService (POST /api/trips/sync, R2-2) to check
  // trip ownership before accepting a batch of offline events for it.
  async getOwnedTripOrThrow(id: string, userId: string): Promise<Trip> {
    const trip = await this.tripsRepository.findOneBy({ id });
    if (!trip) {
      throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Chuyến đi không tồn tại.' });
    }
    if (trip.userId !== userId) {
      throw new ForbiddenException({ error_code: 'NOT_TRIP_OWNER', message: 'Bạn không sở hữu chuyến đi này.' });
    }
    return trip;
  }

  // FR-VEHICLE-04 requires an *owner's* active vehicle. Borrowing (FR-AUTHZ)
  // has no equivalent "activate" action of its own — same owner-or-active-
  // authorization check already used by BiometricService.verify and
  // RoutingService.preview, just also requiring `isActive` for the owner
  // case specifically (the one case that concept applies to).
  private async isVehicleEligible(vehicle: Vehicle, userId: string): Promise<boolean> {
    if (vehicle.userId === userId) {
      return vehicle.isActive;
    }
    const activeAuthorization = await this.vehicleAuthorizationService.findActiveForBorrower(
      vehicle.id,
      userId,
    );
    return !!activeAuthorization;
  }

  private isVerificationValid(
    verification: BiometricVerification | null,
    userId: string,
    vehicleId: string,
  ): boolean {
    if (!verification) return false;
    if (verification.userId !== userId || verification.vehicleId !== vehicleId) return false;
    if (verification.result !== 'success') return false;

    const validityMinutes = this.configService.get<number>('VERIFICATION_VALIDITY_MINUTES')!;
    const ageMs = Date.now() - verification.verifiedAt.getTime();
    return ageMs <= validityMinutes * 60 * 1000;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    );
  }

  // Single INSERT...SELECT so the PostGIS aggregate (real distance from
  // raw_gps_events) and the row insert happen in one round trip — a bare
  // aggregate with no matching rows still yields exactly one row (distance
  // 0, geometry NULL), so this works even for a trip ended with zero GPS
  // events. Same reasoning gps-events.service.ts documents for bypassing
  // the TypeORM entity on PostGIS columns.
  private async buildTripLog(trip: Trip): Promise<TripLog> {
    const mismatchWarnings = await this.mismatchDetectionService.findByTripId(trip.id);
    const durationMinutes = trip.endedAt
      ? Math.round((trip.endedAt.getTime() - trip.startedAt.getTime()) / 60000)
      : 0;

    const [{ id }] = await this.dataSource.query(
      `INSERT INTO trip_logs (trip_id, user_id, vehicle_id, distance_km, duration_minutes, route_geometry, mismatch_warning_count)
       SELECT
         $1::uuid,
         $2::uuid,
         $3::uuid,
         COALESCE(ST_Length(ST_MakeLine(location::geometry ORDER BY event_timestamp)::geography) / 1000.0, 0),
         $4::int,
         ST_MakeLine(location::geometry ORDER BY event_timestamp),
         $5::int
       FROM raw_gps_events
       WHERE trip_id = $1
       RETURNING id`,
      [trip.id, trip.userId, trip.vehicleId, durationMinutes, mismatchWarnings.length],
    );

    return (await this.tripLogsRepository.findOneBy({ id }))!;
  }
}
