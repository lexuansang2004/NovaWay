import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './vehicle.entity';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let repo: jest.Mocked<Repository<Vehicle>>;

  const buildVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
    id: 'vehicle-id',
    userId: 'owner-id',
    type: 'motorbike',
    licensePlate: '59A-12345',
    brandModel: 'Honda SH',
    isActive: false,
    createdAt: new Date('2026-07-18T13:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn((data) => data),
            save: jest.fn(),
            delete: jest.fn(),
            manager: { transaction: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(VehiclesService);
    repo = module.get(getRepositoryToken(Vehicle));
  });

  describe('findAllByUser', () => {
    it('only returns vehicles belonging to the given user', async () => {
      repo.find.mockResolvedValue([buildVehicle()]);

      const result = await service.findAllByUser('owner-id');

      expect(repo.find).toHaveBeenCalledWith({ where: { userId: 'owner-id' } });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('applies only the provided fields for the owner', async () => {
      const vehicle = buildVehicle();
      repo.findOneBy.mockResolvedValue(vehicle);
      repo.save.mockImplementation(async (v) => v as Vehicle);

      const result = await service.update('vehicle-id', 'owner-id', { brand_model: 'Winner X' });

      expect(result.brandModel).toBe('Winner X');
      expect(result.licensePlate).toBe('59A-12345');
    });

    it('rejects with 403 NOT_VEHICLE_OWNER when the vehicle belongs to another user', async () => {
      repo.findOneBy.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));

      await expect(
        service.update('vehicle-id', 'someone-else-id', { brand_model: 'Winner X' }),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the vehicle does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing-id', 'owner-id', { brand_model: 'Winner X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes only when the requester owns the vehicle', async () => {
      repo.findOneBy.mockResolvedValue(buildVehicle());

      await service.remove('vehicle-id', 'owner-id');

      expect(repo.delete).toHaveBeenCalledWith('vehicle-id');
    });

    it('rejects with 403 and does not delete when the requester is not the owner', async () => {
      repo.findOneBy.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));

      await expect(service.remove('vehicle-id', 'someone-else-id')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('deactivates the user\'s other vehicles before activating this one', async () => {
      const vehicle = buildVehicle({ isActive: false });
      repo.findOneBy.mockResolvedValue(vehicle);

      const managerUpdate = jest.fn();
      const managerSave = jest.fn(async (v: Vehicle) => v);
      (repo.manager.transaction as jest.Mock).mockImplementation(async (cb) =>
        cb({ update: managerUpdate, save: managerSave }),
      );

      const result = await service.activate('vehicle-id', 'owner-id');

      expect(managerUpdate).toHaveBeenCalledWith(
        Vehicle,
        { userId: 'owner-id', isActive: true },
        { isActive: false },
      );
      expect(result.isActive).toBe(true);
    });

    it('rejects with 403 for a vehicle owned by another user', async () => {
      repo.findOneBy.mockResolvedValue(buildVehicle({ userId: 'owner-id' }));

      await expect(service.activate('vehicle-id', 'someone-else-id')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });
  });
});
