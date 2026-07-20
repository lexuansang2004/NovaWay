import { MockRoutingProvider } from './mock-routing.provider';

describe('MockRoutingProvider', () => {
  const provider = new MockRoutingProvider();
  const origin = { lat: 10.762622, lng: 106.660172 };
  const destination = { lat: 10.78, lng: 106.7 };

  it('returns the same distance regardless of vehicle type', async () => {
    const motorbike = await provider.getRoute('motorbike', origin, destination);
    const car = await provider.getRoute('car', origin, destination);

    expect(motorbike.distanceKm).toBeCloseTo(car.distanceKm, 5);
    expect(motorbike.distanceKm).toBeGreaterThan(0);
  });

  it('gives motorbike a shorter duration than car over the same distance (FR-ROUTING-02)', async () => {
    const motorbike = await provider.getRoute('motorbike', origin, destination);
    const car = await provider.getRoute('car', origin, destination);

    expect(motorbike.durationMin).toBeLessThan(car.durationMin);
  });

  it('returns a polyline starting at origin and ending at destination', async () => {
    const route = await provider.getRoute('motorbike', origin, destination);

    expect(route.polyline[0]).toEqual([origin.lat, origin.lng]);
    expect(route.polyline[route.polyline.length - 1]).toEqual([destination.lat, destination.lng]);
    expect(route.polyline.length).toBeGreaterThanOrEqual(3);
  });
});
