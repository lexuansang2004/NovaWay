import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleAuthorizationService } from './vehicle-authorization.service';
import { VehicleAuthorization } from './vehicle-authorization.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { UsersService } from '../users/users.service';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';

describe('VehicleAuthorizationService', () => {
  let service: VehicleAuthorizationService;
  let repo: jest.Mocked<Repository<VehicleAuthorization>>;
  let vehiclesService: jest.Mocked<VehiclesService>;
  let usersService: jest.Mocked<UsersService>;

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

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'borrower-id',
    email: 'borrower@example.com',
    passwordHash: '',
    createdAt: new Date(),
    ...overrides,
  });

  const buildAuth = (overrides: Partial<VehicleAuthorization> = {}): VehicleAuthorization => ({
    id: 'auth-id',
    vehicleId: 'vehicle-id',
    ownerId: 'owner-id',
    borrowerId: 'borrower-id',
    grantedAt: new Date('2026-07-18T00:00:00.000Z'),
    expiresAt: new Date('2026-07-19T00:00:00.000Z'),
    revokedAt: null,
    status: 'active',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleAuthorizationService,
        {
          provide: getRepositoryToken(VehicleAuthorization),
          useValue: { find: jest.fn(), findOneBy: jest.fn(), create: jest.fn((d) => d), save: jest.fn() },
        },
        {
          provide: VehiclesService,
          useValue: { getOwnedVehicleOrThrow: jest.fn(), findById: jest.fn() },
        },
        { provide: UsersService, useValue: { findByEmail: jest.fn(), findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(VehicleAuthorizationService);
    repo = module.get(getRepositoryToken(VehicleAuthorization));
    vehiclesService = module.get(VehiclesService);
    usersService = module.get(UsersService);
  });

  describe('grant', () => {
    it('creates an authorization when the caller owns the vehicle and the borrower exists', async () => {
      vehiclesService.getOwnedVehicleOrThrow.mockResolvedValue(buildVehicle());
      usersService.findByEmail.mockResolvedValue(buildUser());
      repo.save.mockResolvedValue(buildAuth());

      const result = await service.grant('vehicle-id', 'owner-id', {
        borrower_email: 'borrower@example.com',
        expires_at: '2026-07-19T00:00:00.000Z',
      });

      expect(vehiclesService.getOwnedVehicleOrThrow).toHaveBeenCalledWith('vehicle-id', 'owner-id');
      expect(result.borrowerId).toBe('borrower-id');
    });

    it('propagates the 403/404 from vehicle ownership check', async () => {
      vehiclesService.getOwnedVehicleOrThrow.mockRejectedValue(new ForbiddenException());

      await expect(
        service.grant('vehicle-id', 'not-owner', {
          borrower_email: 'borrower@example.com',
          expires_at: '2026-07-19T00:00:00.000Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects with 404 BORROWER_NOT_FOUND when the email does not resolve to a user', async () => {
      vehiclesService.getOwnedVehicleOrThrow.mockResolvedValue(buildVehicle());
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.grant('vehicle-id', 'owner-id', {
          borrower_email: 'nobody@example.com',
          expires_at: '2026-07-19T00:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects with 400 BORROWER_IS_OWNER when granting to oneself', async () => {
      vehiclesService.getOwnedVehicleOrThrow.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
      usersService.findByEmail.mockResolvedValue(buildUser({ id: 'owner-id' }));

      await expect(
        service.grant('vehicle-id', 'owner-id', {
          borrower_email: 'owner@example.com',
          expires_at: '2026-07-19T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects with 409 OVERLAPPING_AUTHORIZATION when the exclusion constraint fires', async () => {
      vehiclesService.getOwnedVehicleOrThrow.mockResolvedValue(buildVehicle());
      usersService.findByEmail.mockResolvedValue(buildUser());
      repo.save.mockRejectedValue({ code: '23P01' });

      await expect(
        service.grant('vehicle-id', 'owner-id', {
          borrower_email: 'borrower@example.com',
          expires_at: '2026-07-19T00:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revoke', () => {
    it('sets status to revoked and stamps revoked_at', async () => {
      vehiclesService.getOwnedVehicleOrThrow.mockResolvedValue(buildVehicle());
      repo.findOneBy.mockResolvedValue(buildAuth({ status: 'active' }));
      repo.save.mockImplementation(async (a) => a as VehicleAuthorization);

      const result = await service.revoke('vehicle-id', 'auth-id', 'owner-id');

      expect(result.status).toBe('revoked');
      expect(result.revokedAt).not.toBeNull();
    });

    it('rejects with 404 when the authorization does not belong to the given vehicle', async () => {
      vehiclesService.getOwnedVehicleOrThrow.mockResolvedValue(buildVehicle());
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.revoke('vehicle-id', 'missing-auth', 'owner-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllForBorrower', () => {
    it('maps authorizations to nested vehicle/owner_email/status shape', async () => {
      repo.find.mockResolvedValue([buildAuth({ expiresAt: new Date(Date.now() + 100000) })]);
      vehiclesService.findById.mockResolvedValue(buildVehicle());
      usersService.findById.mockResolvedValue(buildUser({ email: 'owner@example.com' }));

      const result = await service.findAllForBorrower('borrower-id');

      expect(result).toEqual([
        expect.objectContaining({
          owner_email: 'owner@example.com',
          status: 'active',
          vehicle: expect.objectContaining({ id: 'vehicle-id' }),
        }),
      ]);
    });
  });
});
