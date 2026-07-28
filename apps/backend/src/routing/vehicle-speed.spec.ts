import { AVG_SPEED_KMH_BY_VEHICLE_TYPE, durationMinFromDistance } from './vehicle-speed';

// R6-3 (docs/roadmap/SPRINT_R6_SECURITY_HARDENING.md). A pure function that
// directly implements FR-ROUTING-02 ("differs by vehicle type"), used by
// both MockRoutingProvider and OsrmRoutingProvider — but only ever exercised
// *indirectly* through "motorbike is faster than car" assertions in those
// providers' specs, which lock in the relative ordering but not the actual
// constants or the floor. Coverage confirms the gap: src/routing sits at 46%
// even with routing.service.spec.ts fully passing.

describe('vehicle-speed', () => {
  it('pins the documented average speeds — changing these silently changes every ETA', () => {
    expect(AVG_SPEED_KMH_BY_VEHICLE_TYPE).toEqual({ motorbike: 35, car: 28 });
  });

  it('computes duration from the exact per-vehicle-type speed constant', () => {
    // 35km at 35km/h and 28km at 28km/h are both exactly 1 hour — a clean way
    // to assert the *specific* constant is used, not just "motorbike < car".
    expect(durationMinFromDistance(35, 'motorbike')).toBe(60);
    expect(durationMinFromDistance(28, 'car')).toBe(60);
  });

  it('never returns 0 minutes, even for a zero or negligible distance', () => {
    // Math.max(1, ...) — a trip that's technically instantaneous still has to
    // show *some* duration to the rider, not "0 phút".
    expect(durationMinFromDistance(0, 'motorbike')).toBe(1);
    expect(durationMinFromDistance(0.001, 'car')).toBe(1);
  });

  it('rounds to the nearest minute in both directions', () => {
    // 6km at 35km/h -> 10.2857min, rounds down to 10.
    expect(durationMinFromDistance(6, 'motorbike')).toBe(10);
    // 6.125km at 35km/h -> exactly 10.5min, Math.round's away-from-zero rule
    // for .5 rounds this up to 11, not down to 10.
    expect(durationMinFromDistance(6.125, 'motorbike')).toBe(11);
  });

  it('gives motorbike a shorter duration than car over the same real distance', () => {
    // Same assertion the providers' own specs already make indirectly — kept
    // here too so this file is a complete, self-contained spec of the
    // function rather than relying on another file to cover it.
    const distanceKm = 10;
    expect(durationMinFromDistance(distanceKm, 'motorbike')).toBeLessThan(
      durationMinFromDistance(distanceKm, 'car'),
    );
  });
});
