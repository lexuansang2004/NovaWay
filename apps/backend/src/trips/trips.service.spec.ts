import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TripsService } from './trips.service';
import { Trip } from './trip.entity';
import { TripLog } from './trip-log.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAuthorizationService } from '../vehicle-authorization/vehicle-authorization.service';
import { VehicleAuthorization } from '../vehicle-authorization/vehicle-authorization.entity';
import { BiometricService } from '../biometric/biometric.service';
import { BiometricVerification } from '../biometric/biometric-verification.entity';
import { MismatchDetectionService } from '../mismatch-detection/mismatch-detection.service';

describe('TripsService', () => {
  let service: TripsService;
  let tripsRepository: jest.Mocked<Repository<Trip>>;
  let tripLogsRepository: jest.Mocked<Repository<TripLog>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;
  let vehiclesService: jest.Mocked<VehiclesService>;
  let authorizationService: jest.Mocked<VehicleAuthorizationService>;
  let biometricService: jest.Mocked<BiometricService>;
  let mismatchDetectionService: jest.Mocked<MismatchDetectionService>;

  const USER_ID = 'owner-id';
  const BORROWER_ID = 'borrower-id';
  const VEHICLE_ID = 'vehicle-id';
  const TRIP_ID = 'trip-id';
  const VERIFICATION_ID = 'verification-id';

  const buildVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
    id: VEHICLE_ID,
    userId: USER_ID,
    type: 'motorbike',
    licensePlate: '59A-11111',
    brandModel: null,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  });

  const buildAuthorization = (overrides: Partial<VehicleAuthorization> = {}): VehicleAuthorization => ({
    id: 'authorization-id',
    vehicleId: VEHICLE_ID,
    ownerId: USER_ID,
    borrowerId: BORROWER_ID,
    grantedAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
    revokedAt: null,
    status: 'active',
    ...overrides,
  });

  const buildVerification = (overrides: Partial<BiometricVerification> = {}): BiometricVerification => ({
    id: VERIFICATION_ID,
    userId: USER_ID,
    vehicleId: VEHICLE_ID,
    vehicleAuthorizationId: null,
    result: 'success',
    provider: 'mock',
    verifiedAt: new Date(),
    ...overrides,
  });

  const buildTrip = (overrides: Partial<Trip> = {}): Trip => ({
    id: TRIP_ID,
    userId: USER_ID,
    vehicleId: VEHICLE_ID,
    biometricVerificationId: VERIFICATION_ID,
    status: 'active',
    consentAt: new Date(),
    startedAt: new Date(Date.now() - 10 * 60000),
    endedAt: null,
    ...overrides,
  });

  const validDto = { vehicle_id: VEHICLE_ID, consent: true, verification_id: VERIFICATION_ID };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: getRepositoryToken(Trip), useValue: { create: jest.fn((d) => d), save: jest.fn(), find: jest.fn(), findOneBy: jest.fn() } },
        { provide: getRepositoryToken(TripLog), useValue: { find: jest.fn(), findOneBy: jest.fn() } },
        { provide: DataSource, useValue: { query: jest.fn() } },
        { provide: VehiclesService, useValue: { findById: jest.fn() } },
        { provide: VehicleAuthorizationService, useValue: { findActiveForBorrower: jest.fn() } },
        { provide: BiometricService, useValue: { findById: jest.fn() } },
        { provide: MismatchDetectionService, useValue: { findByTripId: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(5) } },
      ],
    }).compile();

    service = module.get(TripsService);
    tripsRepository = module.get(getRepositoryToken(Trip));
    tripLogsRepository = module.get(getRepositoryToken(TripLog));
    dataSource = module.get(DataSource);
    vehiclesService = module.get(VehiclesService);
    authorizationService = module.get(VehicleAuthorizationService);
    biometricService = module.get(BiometricService);
    mismatchDetectionService = module.get(MismatchDetectionService);

    vehiclesService.findById.mockResolvedValue(buildVehicle());
    biometricService.findById.mockResolvedValue(buildVerification());
    tripsRepository.save.mockImplementation(async (t) => t as Trip);
  });

  describe('start', () => {
    it('rejects with CONSENT_REQUIRED when consent is false', async () => {
      await expect(service.start(USER_ID, { ...validDto, consent: false })).rejects.toThrow(
        BadRequestException,
      );
      expect(vehiclesService.findById).not.toHaveBeenCalled();
    });

    it('rejects with NO_ACTIVE_VEHICLE when the vehicle does not exist', async () => {
      vehiclesService.findById.mockResolvedValue(null);

      await expect(service.start(USER_ID, validDto)).rejects.toMatchObject({
        response: { error_code: 'NO_ACTIVE_VEHICLE' },
      });
    });

    it('rejects with NO_ACTIVE_VEHICLE when the owner has not marked the vehicle active', async () => {
      vehiclesService.findById.mockResolvedValue(buildVehicle({ isActive: false }));

      await expect(service.start(USER_ID, validDto)).rejects.toMatchObject({
        response: { error_code: 'NO_ACTIVE_VEHICLE' },
      });
    });

    it('rejects a borrower with no active authorization with NO_ACTIVE_VEHICLE', async () => {
      authorizationService.findActiveForBorrower.mockResolvedValue(null);

      await expect(service.start(BORROWER_ID, validDto)).rejects.toMatchObject({
        response: { error_code: 'NO_ACTIVE_VEHICLE' },
      });
    });

    it('allows a borrower with an active authorization regardless of vehicle.isActive', async () => {
      vehiclesService.findById.mockResolvedValue(buildVehicle({ isActive: false }));
      authorizationService.findActiveForBorrower.mockResolvedValue(buildAuthorization());
      biometricService.findById.mockResolvedValue(
        buildVerification({ userId: BORROWER_ID }),
      );

      const trip = await service.start(BORROWER_ID, validDto);

      expect(trip).toBeDefined();
      expect(authorizationService.findActiveForBorrower).toHaveBeenCalledWith(VEHICLE_ID, BORROWER_ID);
    });

    it('rejects with VERIFICATION_INVALID when no verification is found', async () => {
      biometricService.findById.mockResolvedValue(null);

      await expect(service.start(USER_ID, validDto)).rejects.toMatchObject({
        response: { error_code: 'VERIFICATION_INVALID' },
      });
    });

    it('rejects with VERIFICATION_INVALID when the result was not success', async () => {
      biometricService.findById.mockResolvedValue(buildVerification({ result: 'failed' }));

      await expect(service.start(USER_ID, validDto)).rejects.toMatchObject({
        response: { error_code: 'VERIFICATION_INVALID' },
      });
    });

    it('rejects with VERIFICATION_INVALID when the verification belongs to a different user', async () => {
      biometricService.findById.mockResolvedValue(buildVerification({ userId: 'someone-else' }));

      await expect(service.start(USER_ID, validDto)).rejects.toMatchObject({
        response: { error_code: 'VERIFICATION_INVALID' },
      });
    });

    it('rejects with VERIFICATION_INVALID when the verification is older than the validity window', async () => {
      biometricService.findById.mockResolvedValue(
        buildVerification({ verifiedAt: new Date(Date.now() - 6 * 60000) }),
      );

      await expect(service.start(USER_ID, validDto)).rejects.toMatchObject({
        response: { error_code: 'VERIFICATION_INVALID' },
      });
    });

    it('creates a trip when everything is valid', async () => {
      const trip = await service.start(USER_ID, validDto);

      expect(tripsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, vehicleId: VEHICLE_ID, biometricVerificationId: VERIFICATION_ID, status: 'active' }),
      );
      expect(trip).toBeDefined();
    });

    it('maps a unique constraint violation on save to 409 TRIP_ALREADY_ACTIVE', async () => {
      tripsRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.start(USER_ID, validDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('end', () => {
    it('throws 404 when the trip does not exist', async () => {
      tripsRepository.findOneBy.mockResolvedValue(null);

      await expect(service.end(TRIP_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws 403 when the trip belongs to someone else', async () => {
      tripsRepository.findOneBy.mockResolvedValue(buildTrip({ userId: 'someone-else' }));

      await expect(service.end(TRIP_ID, USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('rejects an already-ended trip with TRIP_NOT_ACTIVE', async () => {
      tripsRepository.findOneBy.mockResolvedValue(buildTrip({ status: 'ended' }));

      await expect(service.end(TRIP_ID, USER_ID)).rejects.toMatchObject({
        response: { error_code: 'TRIP_NOT_ACTIVE' },
      });
    });

    it('ends an active trip and builds a trip_log summary', async () => {
      tripsRepository.findOneBy.mockResolvedValue(buildTrip());
      mismatchDetectionService.findByTripId.mockResolvedValue([]);
      dataSource.query.mockResolvedValue([{ id: 'trip-log-id' }]);
      tripLogsRepository.findOneBy.mockResolvedValue({
        id: 'trip-log-id',
        tripId: TRIP_ID,
        userId: USER_ID,
        vehicleId: VEHICLE_ID,
        distanceKm: 5.2,
        durationMinutes: 10,
        mismatchWarningCount: 0,
        createdAt: new Date(),
      });

      const { trip, tripLog } = await service.end(TRIP_ID, USER_ID);

      expect(trip.status).toBe('ended');
      expect(trip.endedAt).not.toBeNull();
      expect(tripLog.distanceKm).toBe(5.2);
      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO trip_logs'), [
        TRIP_ID,
        USER_ID,
        VEHICLE_ID,
        expect.any(Number),
        0,
      ]);
    });
  });

  describe('list', () => {
    it('returns an empty list without querying trip_logs when the user has no trips', async () => {
      tripsRepository.find.mockResolvedValue([]);

      const result = await service.list(USER_ID);

      expect(result).toEqual([]);
      expect(tripLogsRepository.find).not.toHaveBeenCalled();
    });

    it('defaults distanceKm to 0 for trips without a trip_log (still active)', async () => {
      tripsRepository.find.mockResolvedValue([buildTrip()]);
      tripLogsRepository.find.mockResolvedValue([]);

      const result = await service.list(USER_ID);

      expect(result).toEqual([{ trip: expect.objectContaining({ id: TRIP_ID }), distanceKm: 0 }]);
    });

    it('filters by vehicle_id when provided', async () => {
      tripsRepository.find.mockResolvedValue([]);

      await service.list(USER_ID, VEHICLE_ID);

      expect(tripsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID, vehicleId: VEHICLE_ID } }),
      );
    });
  });

  describe('findDetail', () => {
    it('throws 404 when the trip does not exist', async () => {
      tripsRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findDetail(TRIP_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns trip, null trip_log, and warnings for an active trip', async () => {
      tripsRepository.findOneBy.mockResolvedValue(buildTrip());
      tripLogsRepository.findOneBy.mockResolvedValue(null);
      mismatchDetectionService.findByTripId.mockResolvedValue([]);

      const detail = await service.findDetail(TRIP_ID, USER_ID);

      expect(detail.tripLog).toBeNull();
      expect(detail.warnings).toEqual([]);
    });
  });
});
