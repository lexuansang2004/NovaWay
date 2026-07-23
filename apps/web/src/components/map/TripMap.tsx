import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildSegmentLengths, splitRouteAtDistance } from '@/services/routeGeometry';

// Minimal local GeoJSON LineString feature shape — avoids adding @types/geojson
// as an explicit dependency just for this one type (pnpm's strict isolation
// means the transitive copy bundled with maplibre-gl isn't importable here).
interface LineStringFeature {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

// R2-3 — Leaflet -> MapLibre GL JS + Protomaps (docs/architecture/TDR-tile-provider-spike.md,
// R1-7). Chỉ thay bên trong TripMap, route/marker/overlay bên ngoài vẫn dùng chung interface
// [lat, lng] cũ — MapLibre's [lng, lat] convention chỉ dùng nội bộ file này (xem toLngLat).
//
// QUAN TRỌNG: package.json ghim `maplibre-gl` ở v5.x, KHÔNG được nâng lên v6 mà không
// test kỹ trước. `react-map-gl`/`@vis.gl/react-maplibre@8.1.1` chỉ build/test với
// maplibre-gl@^5.0.0 (dù peerDependencies ghi lỏng >=4.0.0, tưởng chừng cho phép v6).
// v6.0.0 gây lỗi thật: style/tile fetch thành công (network 200, đúng dữ liệu), map
// mount không crash, nhưng KHÔNG source nào (kể cả GeoJSON tĩnh, không qua network)
// bao giờ báo `isSourceLoaded: true` — canvas WebGL render trống hoàn toàn, không throw
// lỗi nào. Xác nhận qua so sánh trực tiếp: demo chính thức của maplibre.org (vanilla JS)
// vẫn render đúng trong cùng môi trường, chỉ riêng app này (qua react-map-gl) bị trống —
// hạ maplibre-gl xuống 5.24.0 (khớp devDependency thật của react-map-gl) fix hoàn toàn,
// không cần đổi gì khác trong file này.

const PROTOMAPS_API_KEY = import.meta.env.VITE_PROTOMAPS_API_KEY as string | undefined;
if (!PROTOMAPS_API_KEY) {
  // Không throw — bản đồ vẫn mount, chỉ tile không tải được (401/403 từ Protomaps), rõ ràng
  // hơn để debug so với một lỗi runtime im lặng. Lấy key miễn phí tại protomaps.com/account.
  console.warn('VITE_PROTOMAPS_API_KEY chưa được cấu hình — bản đồ sẽ không hiển thị tile.');
}
const MAP_STYLE = `https://api.protomaps.com/styles/v5/dark/en.json?key=${PROTOMAPS_API_KEY ?? ''}`;

export type LatLng = [number, number];

interface TripMapProps {
  route: LatLng[];
  position: LatLng;
  /** Quãng đường đã đi (mét) dọc route — nếu có, route hiển thị phần còn lại (sáng) tính
   * từ vị trí hiện tại tới điểm cuối, phản ánh tiến độ thực; nếu không có thì vẽ route
   * tĩnh nguyên vệt (dùng cho lúc preview trước khi chạy chuyến). */
  progressMeters?: number;
  /** Lịch sử vị trí GPS thật đã đi qua — độc lập với `route`/guidance, nên vẫn có ngay
   * cả khi chưa chọn điểm đến (free-drive). Luôn vẽ mờ, không phải đường chỉ dẫn. */
  trail?: LatLng[];
  children?: ReactNode;
}

function toLngLat([lat, lng]: LatLng): [number, number] {
  return [lng, lat];
}

function toLineString(points: LatLng[]): LineStringFeature {
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(toLngLat) } };
}

function VehicleMarkerIcon() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 9999,
        border: '1px solid rgba(34,211,238,0.6)',
        background: 'rgba(15,23,42,0.9)',
        boxShadow: '0 0 16px rgba(34,211,238,0.6)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18.5" cy="17.5" r="3.5" />
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="15" cy="5" r="1" />
        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
      </svg>
    </div>
  );
}

export function TripMap({ route, position, progressMeters, trail = [], children }: TripMapProps) {
  const mapRef = useRef<MapRef>(null);
  const segmentLengths = useMemo(() => buildSegmentLengths(route), [route]);

  // "Đã đi" giờ lấy từ lịch sử GPS thật (prop `trail`), không còn derive từ route — chỉ
  // cần phần "còn lại" (guidance phía trước) từ việc tách route theo tiến độ.
  const remaining = useMemo(() => {
    if (progressMeters === undefined) return route;
    return splitRouteAtDistance(route, segmentLengths, progressMeters).remaining;
  }, [route, segmentLengths, progressMeters]);

  useEffect(() => {
    if (route.length === 0 || !mapRef.current) return;
    const lngLats = route.map(toLngLat);
    const lngs = lngLats.map((c) => c[0]);
    const lats = lngLats.map((c) => c[1]);
    mapRef.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48 },
    );
  }, [route]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: position[1], latitude: position[0], zoom: 16 }}
      mapStyle={MAP_STYLE}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    >
      {/* Trail: lịch sử vị trí GPS thật đã đi qua — mờ, dashed, khác hẳn guidance route.
          Vẽ trước để guidance (nếu có) luôn nổi lên trên nếu trùng đoạn. */}
      {trail.length > 1 && (
        <Source id="trail" type="geojson" data={toLineString(trail)}>
          <Layer
            type="line"
            paint={{ 'line-color': '#94a3b8', 'line-width': 4, 'line-opacity': 0.6, 'line-dasharray': [2, 6] }}
          />
        </Source>
      )}
      {/* Guidance còn lại: sáng rõ, đây là tuyến tài xế cần đi tiếp. Không vẽ gì nếu chưa
          có route (vd: chưa chọn điểm đến) — tránh route cyan kéo dài sẵn không có ý nghĩa. */}
      {remaining.length > 1 && (
        <Source id="remaining" type="geojson" data={toLineString(remaining)}>
          <Layer type="line" paint={{ 'line-color': '#22d3ee', 'line-width': 5, 'line-opacity': 0.9 }} />
        </Source>
      )}
      <Marker longitude={position[1]} latitude={position[0]}>
        <VehicleMarkerIcon />
      </Marker>
      {children}
    </Map>
  );
}
