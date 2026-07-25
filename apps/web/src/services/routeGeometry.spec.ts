import { describe, expect, it } from 'vitest';
import type { LatLng } from '@/components/map/TripMap';
import { buildSegmentLengths, haversineMeters, interpolateAlongRoute, splitRouteAtDistance } from './routeGeometry';

const EARTH_RADIUS_M = 6371000;

describe('haversineMeters', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMeters([10.77, 106.7], [10.77, 106.7])).toBe(0);
  });

  it('matches the known quarter-circumference distance between two equatorial points 90° apart', () => {
    const quarterCircumference = (Math.PI * EARTH_RADIUS_M) / 2;
    expect(haversineMeters([0, 0], [0, 90])).toBeCloseTo(quarterCircumference, 0);
  });

  it('is symmetric', () => {
    const a: LatLng = [10.77, 106.7];
    const b: LatLng = [10.8, 106.75];
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe('buildSegmentLengths', () => {
  it('returns one length per consecutive pair, matching haversineMeters', () => {
    const route: LatLng[] = [
      [10.77, 106.7],
      [10.78, 106.71],
      [10.79, 106.72],
    ];
    const lengths = buildSegmentLengths(route);
    expect(lengths).toHaveLength(2);
    expect(lengths[0]).toBeCloseTo(haversineMeters(route[0], route[1]), 6);
    expect(lengths[1]).toBeCloseTo(haversineMeters(route[1], route[2]), 6);
  });

  it('returns an empty array for a route with fewer than 2 points', () => {
    expect(buildSegmentLengths([])).toEqual([]);
    expect(buildSegmentLengths([[10.77, 106.7]])).toEqual([]);
  });
});

describe('interpolateAlongRoute', () => {
  const route: LatLng[] = [
    [0, 0],
    [0, 1],
    [0, 2],
  ];
  const segmentLengths = buildSegmentLengths(route);

  it('returns the first point at distance 0', () => {
    expect(interpolateAlongRoute(route, segmentLengths, 0)).toEqual(route[0]);
  });

  it('returns the segment boundary point when distance matches the first segment length exactly', () => {
    const [lat, lon] = interpolateAlongRoute(route, segmentLengths, segmentLengths[0]);
    expect(lat).toBeCloseTo(route[1][0], 6);
    expect(lon).toBeCloseTo(route[1][1], 6);
  });

  it('interpolates within the second segment once past the first', () => {
    const distance = segmentLengths[0] + segmentLengths[1] / 2;
    const [lat, lon] = interpolateAlongRoute(route, segmentLengths, distance);
    expect(lat).toBeCloseTo(0, 6);
    expect(lon).toBeCloseTo(1.5, 1);
  });

  it('clamps to the last point once distance reaches or exceeds the total route length', () => {
    const total = segmentLengths.reduce((sum, len) => sum + len, 0);
    expect(interpolateAlongRoute(route, segmentLengths, total)).toEqual(route[2]);
    expect(interpolateAlongRoute(route, segmentLengths, total + 999999)).toEqual(route[2]);
  });

  it('does not divide by zero when consecutive points are identical', () => {
    const degenerate: LatLng[] = [
      [10, 106],
      [10, 106],
    ];
    const lengths = buildSegmentLengths(degenerate);
    expect(interpolateAlongRoute(degenerate, lengths, 0)).toEqual([10, 106]);
  });
});

describe('splitRouteAtDistance', () => {
  const route: LatLng[] = [
    [0, 0],
    [0, 1],
    [0, 2],
  ];
  const segmentLengths = buildSegmentLengths(route);

  it('returns empty traveled/remaining for an empty route', () => {
    expect(splitRouteAtDistance([], [], 0)).toEqual({ traveled: [], remaining: [] });
  });

  it('leaves the full route as remaining at distance 0', () => {
    const { remaining } = splitRouteAtDistance(route, segmentLengths, 0);
    expect(remaining).toEqual(route);
  });

  it('moves the whole route into traveled once distance reaches the total length, leaving only a degenerate remaining segment at the end point', () => {
    const total = segmentLengths.reduce((sum, len) => sum + len, 0);
    const { traveled, remaining } = splitRouteAtDistance(route, segmentLengths, total);
    expect(traveled).toEqual(route);
    expect(remaining).toEqual([route[2], route[2]]);
  });

  it('splits at the current interpolated position for a mid-route distance', () => {
    const distance = segmentLengths[0] + segmentLengths[1] / 2;
    const current = interpolateAlongRoute(route, segmentLengths, distance);
    const { traveled, remaining } = splitRouteAtDistance(route, segmentLengths, distance);

    expect(traveled[0]).toEqual(route[0]);
    expect(traveled[traveled.length - 1]).toEqual(current);
    expect(remaining[0]).toEqual(current);
    expect(remaining[remaining.length - 1]).toEqual(route[2]);
  });
});
