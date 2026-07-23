import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { BiometricProvider, BiometricVerifyResult } from '../biometric-provider.interface';

// MVP implementation per ARCHITECTURE.md §3.2 — swap this class for a real
// SDK-backed provider (R2-6: AwsRekognitionBiometricProvider) without
// changing BiometricService. Never receives/returns/logs raw image or video
// data (NFR-PRIVACY-03) — the session id is an opaque string, not inspected
// or stored beyond the literal 'fail' test hook below.
@Injectable()
export class MockBiometricProvider implements BiometricProvider {
  readonly providerName = 'mock';

  // No real AWS session exists to create — a random id is enough for the
  // mock's own verify() below to accept.
  async createSession(): Promise<{ sessionId: string }> {
    return { sessionId: randomUUID() };
  }

  // 'fail' is a deliberate test hook (used by golden-path.spec.ts and unit
  // tests) to force the failure path without needing a real AWS session.
  async verify(_userId: string, _vehicleId: string, sessionId: string): Promise<BiometricVerifyResult> {
    if (sessionId === 'fail') {
      return { result: 'failed', errorCode: 'FACE_NOT_MATCHED' };
    }
    return { result: 'success' };
  }
}
