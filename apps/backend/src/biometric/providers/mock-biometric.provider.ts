import { Injectable } from '@nestjs/common';
import { BiometricProvider, BiometricVerifyResult } from '../biometric-provider.interface';

// MVP implementation per ARCHITECTURE.md §3.2 — real vendor selection
// (FR-BIOMETRIC-05, RISK_REGISTER.md R-17) is deferred; swap this class for
// a real SDK-backed provider without changing BiometricService.
// Never receives/returns/logs raw image or video data (NFR-PRIVACY-03) —
// provider_payload is treated as an opaque string, not inspected or stored.
@Injectable()
export class MockBiometricProvider implements BiometricProvider {
  readonly providerName = 'mock';

  async verify(_userId: string, _vehicleId: string, payload: string): Promise<BiometricVerifyResult> {
    if (payload === 'fail') {
      return { result: 'failed', errorCode: 'FACE_NOT_MATCHED' };
    }
    return { result: 'success' };
  }
}
