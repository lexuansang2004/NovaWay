import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehiclesService } from '../vehicles/vehicles.service';
import { UsersService } from '../users/users.service';
import { toVehicleResponse } from '../vehicles/vehicle.response';
import { VehicleAuthorization } from './vehicle-authorization.entity';
import { CreateAuthorizationDto } from './dto/create-authorization.dto';
import { deriveEffectiveStatus } from './authorization-status';

// Postgres error code for a violated EXCLUDE constraint (no_overlapping_active_authz).
const POSTGRES_EXCLUSION_VIOLATION = '23P01';

@Injectable()
export class VehicleAuthorizationService {
  constructor(
    @InjectRepository(VehicleAuthorization)
    private readonly authorizationsRepository: Repository<VehicleAuthorization>,
    private readonly vehiclesService: VehiclesService,
    private readonly usersService: UsersService,
  ) {}

  async grant(
    vehicleId: string,
    ownerId: string,
    dto: CreateAuthorizationDto,
  ): Promise<VehicleAuthorization> {
    await this.vehiclesService.getOwnedVehicleOrThrow(vehicleId, ownerId);

    const borrower = await this.usersService.findByEmail(dto.borrower_email);
    if (!borrower) {
      throw new NotFoundException({
        error_code: 'BORROWER_NOT_FOUND',
        message: 'Không tìm thấy người dùng với email này.',
      });
    }
    if (borrower.id === ownerId) {
      throw new BadRequestException({
        error_code: 'BORROWER_IS_OWNER',
        message: 'Không thể tự cấp uỷ quyền cho chính mình.',
      });
    }

    const authorization = this.authorizationsRepository.create({
      vehicleId,
      ownerId,
      borrowerId: borrower.id,
      expiresAt: new Date(dto.expires_at),
    });

    try {
      return await this.authorizationsRepository.save(authorization);
    } catch (error) {
      if (this.isExclusionViolation(error)) {
        throw new ConflictException({
          error_code: 'OVERLAPPING_AUTHORIZATION',
          message: 'Khoảng thời gian này đã trùng với một uỷ quyền khác đang hiệu lực cho xe này.',
        });
      }
      throw error;
    }
  }

  async findAllForVehicleOwner(vehicleId: string, ownerId: string): Promise<VehicleAuthorization[]> {
    await this.vehiclesService.getOwnedVehicleOrThrow(vehicleId, ownerId);
    return this.authorizationsRepository.find({ where: { vehicleId } });
  }

  async revoke(vehicleId: string, authorizationId: string, ownerId: string): Promise<VehicleAuthorization> {
    await this.vehiclesService.getOwnedVehicleOrThrow(vehicleId, ownerId);

    const authorization = await this.authorizationsRepository.findOneBy({
      id: authorizationId,
      vehicleId,
    });
    if (!authorization) {
      throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Uỷ quyền không tồn tại.' });
    }

    authorization.status = 'revoked';
    authorization.revokedAt = new Date();
    return this.authorizationsRepository.save(authorization);
  }

  async findAllForBorrower(borrowerId: string) {
    const authorizations = await this.authorizationsRepository.find({ where: { borrowerId } });

    return Promise.all(
      authorizations.map(async (auth) => {
        const [vehicle, owner] = await Promise.all([
          this.vehiclesService.findById(auth.vehicleId),
          this.usersService.findById(auth.ownerId),
        ]);

        return {
          vehicle: vehicle ? toVehicleResponse(vehicle) : null,
          owner_email: owner?.email ?? null,
          expires_at: auth.expiresAt.toISOString(),
          status: deriveEffectiveStatus(auth),
        };
      }),
    );
  }

  private isExclusionViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === POSTGRES_EXCLUSION_VIOLATION
    );
  }
}
