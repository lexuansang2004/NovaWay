import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoutingService } from './routing.service';
import { ROUTING_PROVIDER, RoutingProvider } from './routing-provider.interface';
import { VehiclesService } from '../vehicles/vehicles.service';
import { VehicleAuthorizationService } from '../vehicle-authorization/vehicle-authorization.service';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAuthorization } from '../vehicle-authorization/vehicle-authorization.entity';

describe('RoutingService', () => {
  let service: RoutingService;
  let vehiclesService: jest.Mocked<VehiclesService>;
  let authorizationService: jest.Mocked<VehicleAuthorizationService>;
  let provider: jest.Mocked<RoutingProvider>;

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

  const origin = { lat: 10.762622, lng: 106.660172 };
  const destination = { lat: 10.78, lng: 106.7 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        { provide: VehiclesService, useValue: { findById: jest.fn() } },
        { provide: VehicleAuthorizationService, useValue: { findActiveForBorrower: jest.fn() } },
        { provide: ROUTING_PROVIDER, useValue: { getRoute: jest.fn() } },
      ],
    }).compile();

    service = module.get(RoutingService);
    vehiclesService = module.get(VehiclesService);
    authorizationService = module.get(VehicleAuthorizationService);
    provider = module.get(ROUTING_PROVIDER);
  });

  it('rejects with 404 when the vehicle does not exist', async () => {
    vehiclesService.findById.mockResolvedValue(null);

    await expect(
      service.preview('user-id', { vehicle_id: 'missing', origin, destination }),
    ).rejects.toThrow(NotFoundException);
    expect(provider.getRoute).not.toHaveBeenCalled();
  });

  it('allows the owner and calls the provider with the vehicle type', async () => {
    vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id', type: 'car' }));
    provider.getRoute.mockResolvedValue({ distanceKm: 5, durationMin: 10, polyline: [] });

    const result = await service.preview('owner-id', { vehicle_id: 'vehicle-id', origin, destination });

    expect(authorizationService.findActiveForBorrower).not.toHaveBeenCalled();
    expect(provider.getRoute).toHaveBeenCalledWith('car', origin, destination);
    expect(result.vehicleType).toBe('car');
  });

  it('rejects a non-owner with no active authorization with 403, never calling the provider', async () => {
    vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
    authorizationService.findActiveForBorrower.mockResolvedValue(null);

    await expect(
      service.preview('stranger-id', { vehicle_id: 'vehicle-id', origin, destination }),
    ).rejects.toThrow(ForbiddenException);
    expect(provider.getRoute).not.toHaveBeenCalled();
  });

  it('allows a borrower with an active authorization', async () => {
    vehiclesService.findById.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));
    authorizationService.findActiveForBorrower.mockResolvedValue(buildAuthorization());
    provider.getRoute.mockResolvedValue({ distanceKm: 5, durationMin: 10, polyline: [] });

    const result = await service.preview('borrower-id', { vehicle_id: 'vehicle-id', origin, destination });

    expect(result.distanceKm).toBe(5);
  });
});
