import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from '@/components/map/TripMap';
import { buildSegmentLengths, interpolateAlongRoute } from '@/services/routeGeometry';

// Mock GPS engine for step 3.2 (web live map) — pure client-side simulation via
// requestAnimationFrame, no network calls. This is intentionally NOT wired to
// the real WebSocket gateway (step 3.1): there is no way yet to create a real
// trip_id (TripsModule/API is step 7.1), so a real end-to-end mobile-sends/
// web-receives flow can't exist until then. Step 4.3 (mobile real location)
// is the natural place to swap this for a real GPS-over-WebSocket sender once
// trip creation exists — this hook's return shape mirrors what that would need.
// TODO(production): replace with real GPS/telemetry over the /realtime gateway.

const BASE_SPEED_KMH = 40;
const SPEED_OSCILLATION_KMH = 5;
const TRAIL_SAMPLE_INTERVAL_M = 15;

interface MockGpsState {
  position: LatLng;
  speedKmh: number;
  progressMeters: number;
  trail: LatLng[];
  isRunning: boolean;
}

export function useMockGpsSender(route: LatLng[]) {
  const segmentLengths = useRef(buildSegmentLengths(route)).current;
  const totalLength = useRef(segmentLengths.reduce((a, b) => a + b, 0)).current;

  const [state, setState] = useState<MockGpsState>({
    position: route[0],
    speedKmh: 0,
    progressMeters: 0,
    trail: [route[0]],
    isRunning: false,
  });

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const oscillationPhaseRef = useRef(0);
  const traveledRef = useRef(0);
  const lastTrailSampleRef = useRef(0);
  const lastProgressRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTsRef.current = null;
    setState((s) => ({ ...s, isRunning: false, speedKmh: 0 }));
  }, []);

  const start = useCallback(() => {
    if (rafRef.current !== null || totalLength === 0) return;
    setState((s) => ({ ...s, isRunning: true }));

    function tick(ts: number) {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dtMs = Math.min(ts - lastTsRef.current, 100); // clamp against tab-throttle jumps
      lastTsRef.current = ts;

      oscillationPhaseRef.current += dtMs / 1000;
      const speedKmh = BASE_SPEED_KMH + Math.sin(oscillationPhaseRef.current) * SPEED_OSCILLATION_KMH;
      const deltaMeters = ((speedKmh * 1000) / 3600) * (dtMs / 1000);

      traveledRef.current += deltaMeters;
      const progressMeters = traveledRef.current % totalLength; // free-drive: loop the route
      const position = interpolateAlongRoute(route, segmentLengths, progressMeters);
      const wrappedNewLap = progressMeters < lastProgressRef.current;
      lastProgressRef.current = progressMeters;

      setState((s) => {
        const shouldSampleTrail =
          wrappedNewLap || traveledRef.current - lastTrailSampleRef.current >= TRAIL_SAMPLE_INTERVAL_M;
        if (shouldSampleTrail) lastTrailSampleRef.current = traveledRef.current;

        return {
          position,
          speedKmh,
          progressMeters,
          // Reset on a new lap so trail doesn't grow unbounded the longer the mock runs.
          trail: wrappedNewLap ? [position] : shouldSampleTrail ? [...s.trail, position] : s.trail,
          isRunning: true,
        };
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [route, segmentLengths, totalLength]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return { ...state, start, stop };
}
