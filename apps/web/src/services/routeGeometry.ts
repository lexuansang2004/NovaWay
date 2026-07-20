import type { LatLng } from '@/components/map/TripMap';

// Hàm hình học dùng chung cho route: khoảng cách Haversine, nội suy vị trí dọc route,
// và tách route thành đoạn "đã đi" / "còn lại" theo quãng đường đã đi (dùng để vẽ 2 màu
// polyline khác nhau, thay vì hiển thị nguyên vệt route tĩnh không đổi khi xe di chuyển).

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function buildSegmentLengths(route: LatLng[]): number[] {
  const lengths: number[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    lengths.push(haversineMeters(route[i], route[i + 1]));
  }
  return lengths;
}

/** Nội suy tuyến tính vị trí dọc theo route tại quãng đường `distanceMeters` đã đi. */
export function interpolateAlongRoute(route: LatLng[], segmentLengths: number[], distanceMeters: number): LatLng {
  let remaining = distanceMeters;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (remaining <= segLen || i === segmentLengths.length - 1) {
      const fraction = segLen === 0 ? 0 : Math.min(remaining / segLen, 1);
      const [lat1, lon1] = route[i];
      const [lat2, lon2] = route[i + 1];
      return [lat1 + (lat2 - lat1) * fraction, lon1 + (lon2 - lon1) * fraction];
    }
    remaining -= segLen;
  }

  return route[route.length - 1];
}

/** Tách route thành đoạn đã đi (từ điểm đầu tới vị trí hiện tại) và đoạn còn lại
 * (từ vị trí hiện tại tới điểm cuối), để vẽ 2 polyline khác màu. */
export function splitRouteAtDistance(
  route: LatLng[],
  segmentLengths: number[],
  distanceMeters: number
): { traveled: LatLng[]; remaining: LatLng[] } {
  if (route.length === 0) return { traveled: [], remaining: [] };

  const currentPoint = interpolateAlongRoute(route, segmentLengths, distanceMeters);
  const traveled: LatLng[] = [route[0]];
  const remaining: LatLng[] = [];
  let cumulative = 0;
  let currentInserted = false;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    const segEndDistance = cumulative + segLen;

    if (!currentInserted && distanceMeters <= segEndDistance) {
      traveled.push(currentPoint);
      remaining.push(currentPoint, route[i + 1]);
      currentInserted = true;
    } else if (!currentInserted) {
      traveled.push(route[i + 1]);
    } else {
      remaining.push(route[i + 1]);
    }

    cumulative = segEndDistance;
  }

  if (!currentInserted) {
    // distanceMeters >= tổng chiều dài route (hết vòng) -> toàn bộ coi như đã đi.
    traveled.push(currentPoint);
  }

  return { traveled, remaining };
}
