import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { AwsRekognitionBiometricProvider } from './aws-rekognition-biometric.provider';

describe('AwsRekognitionBiometricProvider', () => {
  function buildProvider(minConfidence = 90) {
    const send = jest.fn();
    const client = { send } as unknown as jest.Mocked<RekognitionClient>;
    const provider = new AwsRekognitionBiometricProvider(client, minConfidence);
    return { provider, send };
  }

  describe('createSession', () => {
    it('returns the SessionId from CreateFaceLivenessSession', async () => {
      const { provider, send } = buildProvider();
      send.mockResolvedValue({ SessionId: 'aws-session-id' });

      const result = await provider.createSession();

      expect(result).toEqual({ sessionId: 'aws-session-id' });
    });

    it('throws when AWS returns no SessionId', async () => {
      const { provider, send } = buildProvider();
      send.mockResolvedValue({});

      await expect(provider.createSession()).rejects.toThrow();
    });
  });

  describe('verify', () => {
    it('succeeds when Status is SUCCEEDED and Confidence meets the threshold', async () => {
      const { provider, send } = buildProvider(90);
      send.mockResolvedValue({ Status: 'SUCCEEDED', Confidence: 95.5 });

      const result = await provider.verify('user-id', 'vehicle-id', 'session-id');

      expect(result).toEqual({ result: 'success', confidence: 95.5 });
    });

    it('fails with FACE_NOT_MATCHED when Confidence is below the threshold', async () => {
      const { provider, send } = buildProvider(90);
      send.mockResolvedValue({ Status: 'SUCCEEDED', Confidence: 50 });

      const result = await provider.verify('user-id', 'vehicle-id', 'session-id');

      expect(result).toEqual({ result: 'failed', errorCode: 'FACE_NOT_MATCHED', confidence: 50 });
    });

    it('fails with LIVENESS_SESSION_NOT_SUCCEEDED when Status is not SUCCEEDED', async () => {
      const { provider, send } = buildProvider(90);
      send.mockResolvedValue({ Status: 'EXPIRED' });

      const result = await provider.verify('user-id', 'vehicle-id', 'session-id');

      expect(result).toEqual({ result: 'failed', errorCode: 'LIVENESS_SESSION_NOT_SUCCEEDED' });
    });

    it('treats a missing Confidence as 0 (fails the threshold)', async () => {
      const { provider, send } = buildProvider(90);
      send.mockResolvedValue({ Status: 'SUCCEEDED' });

      const result = await provider.verify('user-id', 'vehicle-id', 'session-id');

      expect(result).toEqual({ result: 'failed', errorCode: 'FACE_NOT_MATCHED', confidence: 0 });
    });
  });
});
