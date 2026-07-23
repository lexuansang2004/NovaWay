import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehiclesService } from '../vehicles/vehicles.service';
import { VehicleAuthorizationService } from '../vehicle-authorization/vehicle-authorization.service';
import { BiometricVerification } from './biometric-verification.entity';
import { BIOMETRIC_PROVIDER, BiometricProvider } from './biometric-provider.interface';
import { VerifyDto } from './dto/verify.dto';

export interface VerifyOutcome {
  verificationId: string;
  result: 'success' | 'failed';
  errorCode?: string;
}

@Injectable()
export class BiometricService {
  constructor(
    @InjectRepository(BiometricVerification)
    private readonly verificationsRepository: Repository<BiometricVerification>,
    private readonly vehiclesService: VehiclesService,
    private readonly vehicleAuthorizationService: VehicleAuthorizationService,
    @Inject(BIOMETRIC_PROVIDER)
    private readonly biometricProvider: BiometricProvider,
  ) {}

  // R2-6 — session creation is a billed AWS operation for the real provider,
  // so it must be gated by the same check as verify(), not left open.
  async createSession(vehicleId: string, userId: string): Promise<{ sessionId: string }> {
    await this.assertAuthorized(vehicleId, userId);
    return this.biometricProvider.createSession();
  }

  async verify(vehicleId: string, userId: string, dto: VerifyDto): Promise<VerifyOutcome> {
    const vehicleAuthorizationId = await this.assertAuthorized(vehicleId, userId);

    const providerResult = await this.biometricProvider.verify(userId, vehicleId, dto.session_id);

    const verification = this.verificationsRepository.create({
      userId,
      vehicleId,
      vehicleAuthorizationId,
      result: providerResult.result,
      provider: this.biometricProvider.providerName,
    });
    const saved = await this.verificationsRepository.save(verification);

    return {
      verificationId: saved.id,
      result: providerResult.result,
      errorCode: providerResult.errorCode,
    };
  }

  // Used by TripsService (step 7.1) to validate a `verification_id` at
  // POST /trips/start — TripsModule doesn't own this table.
  findById(id: string): Promise<BiometricVerification | null> {
    return this.verificationsRepository.findOneBy({ id });
  }

  // FR-BIOMETRIC-02: check permission BEFORE calling the provider, so an
  // unauthorized caller never incurs a (potentially billed) provider call —
  // shared by both createSession and verify. Returns the vehicle_authorization
  // id for borrowers (to link on the verification record), or null for owners.
  private async assertAuthorized(vehicleId: string, userId: string): Promise<string | null> {
    const vehicle = await this.vehiclesService.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException({ error_code: 'NOT_FOUND', message: 'Phương tiện không tồn tại.' });
    }

    if (vehicle.userId === userId) {
      return null;
    }

    const activeAuthorization = await this.vehicleAuthorizationService.findActiveForBorrower(
      vehicleId,
      userId,
    );
    if (!activeAuthorization) {
      throw new ForbiddenException({
        error_code: 'NOT_AUTHORIZED_FOR_VEHICLE',
        message: 'Bạn không có quyền với phương tiện này.',
      });
    }
    return activeAuthorization.id;
  }
}
