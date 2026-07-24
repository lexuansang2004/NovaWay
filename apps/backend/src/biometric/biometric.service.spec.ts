import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiometricService } from './biometric.service';
import { BiometricVerification } from './biometric-verification.entity';
import { BIOMETRIC_PROVIDER, BiometricProvider } from './biometric-provider.interface';
import { VehiclesService } from '../vehicles/vehicles.service';
import { VehicleAuthorizationService } from '../vehicle-authorization/vehicle-authorization.service';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAuthorization } from '../vehicle-authorization/vehicle-authorization.entity';

describe('BiometricService', () => {
  let service: BiometricService;
  let repo: jest.Mocked<Repository<BiometricVerification>>;
  let vehiclesService: jest.Mocked<VehiclesService>;
  let authorizationService: jest.Mocked<VehicleAuthorizationService>;
  let provider: jest.Mocked<BiometricProvider>;

  const buildVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
    id: 'vehicle-id',
    userId: 'owner-id',
    type: 'motorbike',
    licensePlate: '59A-11111',
    brandModel: null,
    isActive: false,
    createdAt: new Date(),
    ...overrides,
  });

  const buildAuthorization = (overrides: Partial<VehicleAuthorization> = {}): VehicleAuthorization => ({
    id: 'authorization-id',
    vehicleId: 'vehicle-id',
    ownerId: 'owner-id',
    borrowerId: 'borrower-id',
    grantedAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
    revokedAt: null,
    status: 'active',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricService,
        {
          provide: getRepositoryToken(BiometricVerification),
          useValue: { create: jest.fn((d) => d), save: jest.fn() },
        },
        { provide: VehiclesService, useValue: { findById: jest.fn() } },
        { provide: VehicleAuthorizationService, useValue: { findActiveForBorrower: jest.fn() } },
        {
          provide: BIOMETRIC_PROVIDER,
          useValue: { providerName: 'mock', createSession: jest.fn(), verify: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BiometricService);
    repo = module.get(getRepositoryToken(BiometricVerification));
    vehiclesService = module.get(VehiclesService);
    authorizationService = module.get(VehicleAuthorizationService);
    provider = module.get(BIOMETRIC_PROVIDER);
  });

  it('rejects with 404 when the vehicle does not exist', async () => {
    vehiclesService.findById.mockResolvedValue(null);

    await expect(service.verify('missing-vehicle', 'user-id', { session_id: 'x' })).rejects.toThrow(
      NotFoundException,
    );
    expect(provider.verify).not.toHaveBeenCalled();
  });

  it('allows the owner to verify without checking authorizations', async () => {
    vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
    provider.verify.mockResolvedValue({ result: 'success' });
    repo.save.mockImplementation(async (v) => ({ id: 'verification-id', ...v }) as BiometricVerification);

    const result = await service.verify('vehicle-id', 'owner-id', { session_id: 'ok' });

    expect(authorizationService.findActiveForBorrower).not.toHaveBeenCalled();
    expect(result).toEqual({ verificationId: 'verification-id', result: 'success', errorCode: undefined });
  });

  it('rejects a non-owner with no active authorization with 403, never calling the provider', async () => {
    vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
    authorizationService.findActiveForBorrower.mockResolvedValue(null);

    await expect(
      service.verify('vehicle-id', 'stranger-id', { session_id: 'ok' }),
    ).rejects.toThrow(ForbiddenException);
    expect(provider.verify).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('allows a borrower with an active authorization and records the link', async () => {
    vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
    authorizationService.findActiveForBorrower.mockResolvedValue(buildAuthorization());
    provider.verify.mockResolvedValue({ result: 'success' });
    repo.save.mockImplementation(async (v) => ({ id: 'verification-id', ...v }) as BiometricVerification);

    await service.verify('vehicle-id', 'borrower-id', { session_id: 'ok' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleAuthorizationId: 'authorization-id' }),
    );
  });

  it('records a failed result with the provider error_code without throwing', async () => {
    vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
    provider.verify.mockResolvedValue({ result: 'failed', errorCode: 'FACE_NOT_MATCHED' });
    repo.save.mockImplementation(async (v) => ({ id: 'verification-id', ...v }) as BiometricVerification);

    const result = await service.verify('vehicle-id', 'owner-id', { session_id: 'fail' });

    expect(result).toEqual({
      verificationId: 'verification-id',
      result: 'failed',
      errorCode: 'FACE_NOT_MATCHED',
    });
  });

  describe('createSession', () => {
    it('rejects with 404 when the vehicle does not exist, never calling the provider', async () => {
      vehiclesService.findById.mockResolvedValue(null);

      await expect(service.createSession('missing-vehicle', 'user-id')).rejects.toThrow(NotFoundException);
      expect(provider.createSession).not.toHaveBeenCalled();
    });

    it('rejects a non-owner with no active authorization with 403, never calling the provider', async () => {
      vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
      authorizationService.findActiveForBorrower.mockResolvedValue(null);

      await expect(service.createSession('vehicle-id', 'stranger-id')).rejects.toThrow(ForbiddenException);
      expect(provider.createSession).not.toHaveBeenCalled();
    });

    it('creates a session for the owner', async () => {
      vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
      provider.createSession.mockResolvedValue({ sessionId: 'session-id' });

      const result = await service.createSession('vehicle-id', 'owner-id');

      expect(result).toEqual({ sessionId: 'session-id' });
    });

    it('creates a session for a borrower with an active authorization', async () => {
      vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
      authorizationService.findActiveForBorrower.mockResolvedValue(buildAuthorization());
      provider.createSession.mockResolvedValue({ sessionId: 'session-id' });

      const result = await service.createSession('vehicle-id', 'borrower-id');

      expect(result).toEqual({ sessionId: 'session-id' });
    });
  });
});
