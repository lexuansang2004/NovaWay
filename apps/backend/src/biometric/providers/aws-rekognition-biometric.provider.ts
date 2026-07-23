import { Logger } from '@nestjs/common';
import {
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import { BiometricProvider, BiometricVerifyResult } from '../biometric-provider.interface';

// R2-6 (docs/architecture/TDR-biometric-provider-spike.md) — real AWS
// Rekognition Face Liveness integration. Two-step, session-based:
//   1. createSession() calls CreateFaceLivenessSession, returns a SessionId.
//      The client then uses AWS's own Face Liveness client SDK (Amplify UI
//      component / RN SDK) to stream the actual liveness capture directly
//      to AWS — that streaming step never touches this backend at all.
//   2. verify() calls GetFaceLivenessSessionResults with that SessionId once
//      the client reports the capture finished, and decides success/failed
//      from the returned Confidence score.
//
// Privacy (FR-BIOMETRIC-04 / NFR-PRIVACY-03, "never store raw images"):
// GetFaceLivenessSessionResults' response can include a ReferenceImage (and
// AuditImages, though AuditImagesLimit defaults to 0 since we never set it)
// — this class deliberately destructures ONLY { Status, Confidence } from
// the response and never reads, logs, or persists those image fields.
export class AwsRekognitionBiometricProvider implements BiometricProvider {
  readonly providerName = 'aws-rekognition';
  private readonly logger = new Logger(AwsRekognitionBiometricProvider.name);

  constructor(
    private readonly client: RekognitionClient,
    private readonly minConfidence: number,
  ) {}

  async createSession(): Promise<{ sessionId: string }> {
    const response = await this.client.send(new CreateFaceLivenessSessionCommand({}));
    if (!response.SessionId) {
      // Per AWS's own API contract SessionId is always returned on a
      // successful call — this would only happen on a malformed SDK
      // response, not a normal error (those reject the promise instead).
      throw new Error('AWS Rekognition CreateFaceLivenessSession returned no SessionId');
    }
    return { sessionId: response.SessionId };
  }

  async verify(_userId: string, _vehicleId: string, sessionId: string): Promise<BiometricVerifyResult> {
    const { Status, Confidence } = await this.client.send(
      new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }),
    );

    if (Status !== 'SUCCEEDED') {
      this.logger.warn(`Face Liveness session ended with status=${Status}, treating as failed`);
      return { result: 'failed', errorCode: 'LIVENESS_SESSION_NOT_SUCCEEDED' };
    }

    const confidence = Confidence ?? 0;
    if (confidence < this.minConfidence) {
      return { result: 'failed', errorCode: 'FACE_NOT_MATCHED', confidence };
    }
    return { result: 'success', confidence };
  }
}
