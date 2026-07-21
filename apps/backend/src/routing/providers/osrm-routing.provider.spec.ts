import { OsrmRoutingProvider, RoutingEngineUnavailableError } from './osrm-routing.provider';

describe('OsrmRoutingProvider', () => {
  const origin = { lat: 10.762622, lng: 106.660172 };
  const destination = { lat: 10.78, lng: 106.7 };
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function mockFetchOnce(response: Partial<Response> & { json: () => Promise<unknown> }) {
    return jest.fn().mockResolvedValue(response as Response);
  }

  it('parses a successful OSRM response into a RouteResult', async () => {
    global.fetch = mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        code: 'Ok',
        routes: [
          {
            distance: 5000,
            geometry: {
              coordinates: [
                [106.660172, 10.762622],
                [106.7, 10.78],
              ],
            },
          },
        ],
      }),
    });

    const provider = new OsrmRoutingProvider('https://router.project-osrm.org', 3000);
    const result = await provider.getRoute('motorbike', origin, destination);

    expect(result.distanceKm).toBe(5);
    expect(result.polyline[0]).toEqual([10.762622, 106.660172]);
    expect(result.polyline[1]).toEqual([10.78, 106.7]);
  });

  it('gives motorbike a shorter duration than car for the same OSRM distance', async () => {
    const response = {
      ok: true,
      status: 200,
      json: async () => ({
        code: 'Ok',
        routes: [{ distance: 5000, geometry: { coordinates: [] } }],
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(response as unknown as Response);

    const provider = new OsrmRoutingProvider('https://router.project-osrm.org', 3000);
    const motorbike = await provider.getRoute('motorbike', origin, destination);
    const car = await provider.getRoute('car', origin, destination);

    expect(motorbike.durationMin).toBeLessThan(car.durationMin);
  });

  it('retries once then throws RoutingEngineUnavailableError on repeated non-ok responses', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    global.fetch = fetchMock;

    const provider = new OsrmRoutingProvider('https://router.project-osrm.org', 3000, 1);

    await expect(provider.getRoute('motorbike', origin, destination)).rejects.toThrow(
      RoutingEngineUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });

  it('throws RoutingEngineUnavailableError when the OSRM response has no route', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 'NoRoute', routes: [] }),
    } as unknown as Response);

    const provider = new OsrmRoutingProvider('https://router.project-osrm.org', 3000, 0);

    await expect(provider.getRoute('motorbike', origin, destination)).rejects.toThrow(
      RoutingEngineUnavailableError,
    );
  });

  it('throws RoutingEngineUnavailableError when the request rejects (e.g. timeout abort)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('The operation was aborted'));

    const provider = new OsrmRoutingProvider('https://router.project-osrm.org', 10, 0);

    await expect(provider.getRoute('motorbike', origin, destination)).rejects.toThrow(
      RoutingEngineUnavailableError,
    );
  });
});
