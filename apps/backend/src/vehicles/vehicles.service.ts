import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  findAllByUser(userId: string): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({ where: { userId } });
  }

  create(userId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehiclesRepository.create({
      userId,
      type: dto.type,
      licensePlate: dto.license_plate,
      brandModel: dto.brand_model ?? null,
      isActive: false,
    });
    return this.vehiclesRepository.save(vehicle);
  }

  async update(id: string, userId: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.getOwnedVehicleOrThrow(id, userId);

    if (dto.type !== undefined) vehicle.type = dto.type;
    if (dto.license_plate !== undefined) vehicle.licensePlate = dto.license_plate;
    if (dto.brand_model !== undefined) vehicle.brandModel = dto.brand_model;

    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedVehicleOrThrow(id, userId);
    await this.vehiclesRepository.delete(id);
  }

  async activate(id: string, userId: string): Promise<Vehicle> {
    const vehicle = await this.getOwnedVehicleOrThrow(id, userId);

    return this.vehiclesRepository.manager.transaction(async (manager) => {
      await manager.update(Vehicle, { userId, isActive: true }, { isActive: false });
      vehicle.isActive = true;
      return manager.save(vehicle);
    });
  }

  private async getOwnedVehicleOrThrow(id: string, userId: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOneBy({ id });

    if (!vehicle) {
      throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Phương tiện không tồn tại.' });
    }
    if (vehicle.userId !== userId) {
      throw new ForbiddenException({
        error_code: 'NOT_VEHICLE_OWNER',
        message: 'Bạn không sở hữu phương tiện này.',
      });
    }

    return vehicle;
  }
}
