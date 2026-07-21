import { FallbackRoutingProvider } from './fallback-routing.provider';
import { RoutingProvider, RouteResult } from '../routing-provider.interface';

describe('FallbackRoutingProvider', () => {
  const origin = { lat: 10.762622, lng: 106.660172 };
  const destination = { lat: 10.78, lng: 106.7 };

  const buildProvider = (result: RouteResult): jest.Mocked<RoutingProvider> => ({
    getRoute: jest.fn().mockResolvedValue(result),
  });

  const mockResult: RouteResult = { distanceKm: 4.76, durationMin: 8, polyline: [] };
  const fallbackResult: RouteResult = { distanceKm: 4.76, durationMin: 9, polyline: [] };

  it('uses the primary provider when it succeeds', async () => {
    const primary = buildProvider(mockResult);
    const fallback = buildProvider(fallbackResult);
    const provider = new FallbackRoutingProvider(primary, fallback);

    const result = await provider.getRoute('motorbike', origin, destination);

    expect(result).toBe(mockResult);
    expect(fallback.getRoute).not.toHaveBeenCalled();
  });

  it('falls back to the secondary provider when the primary throws (e.g. timeout)', async () => {
    const primary: jest.Mocked<RoutingProvider> = {
      getRoute: jest.fn().mockRejectedValue(new Error('timeout')),
    };
    const fallback = buildProvider(fallbackResult);
    const provider = new FallbackRoutingProvider(primary, fallback);

    const result = await provider.getRoute('motorbike', origin, destination);

    expect(result).toBe(fallbackResult);
    expect(fallback.getRoute).toHaveBeenCalledWith('motorbike', origin, destination);
  });

  it('propagates the error if both primary and fallback fail', async () => {
    const primary: jest.Mocked<RoutingProvider> = {
      getRoute: jest.fn().mockRejectedValue(new Error('primary down')),
    };
    const fallback: jest.Mocked<RoutingProvider> = {
      getRoute: jest.fn().mockRejectedValue(new Error('fallback down')),
    };
    const provider = new FallbackRoutingProvider(primary, fallback);

    await expect(provider.getRoute('motorbike', origin, destination)).rejects.toThrow('fallback down');
  });
});
