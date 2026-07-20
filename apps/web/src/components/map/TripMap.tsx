import { useEffect, useMemo, type ReactNode } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildSegmentLengths, splitRouteAtDistance } from '@/services/routeGeometry';

// TODO(production): swap Leaflet -> MapLibre GL JS (TDR-002). Chỉ cần thay bên trong
// TripMap, không lan ra app (route/marker/overlay bên ngoài dùng chung interface này).

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

// SVG thuần (không qua React renderer) để tránh lỗi "Invalid hook call" khi
// dựng L.divIcon ở module scope — lucide-react icon dùng useContext nội bộ.
const VEHICLE_ICON_SVG = `
  <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;border:1px solid rgba(34,211,238,0.6);background:rgba(15,23,42,0.9);box-shadow:0 0 16px rgba(34,211,238,0.6);">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  </div>
`;

const vehicleIcon = L.divIcon({
  className: '',
  html: VEHICLE_ICON_SVG,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function FitRouteBounds({ route }: { route: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (route.length === 0) return;
    map.fitBounds(route, { padding: [48, 48] });
  }, [map, route]);

  return null;
}

export function TripMap({ route, position, progressMeters, trail = [], children }: TripMapProps) {
  const segmentLengths = useMemo(() => buildSegmentLengths(route), [route]);

  // "Đã đi" giờ lấy từ lịch sử GPS thật (prop `trail`), không còn derive từ route — chỉ
  // cần phần "còn lại" (guidance phía trước) từ việc tách route theo tiến độ.
  const remaining = useMemo(() => {
    if (progressMeters === undefined) return route;
    return splitRouteAtDistance(route, segmentLengths, progressMeters).remaining;
  }, [route, segmentLengths, progressMeters]);

  return (
    <MapContainer
      center={position}
      zoom={16}
      scrollWheelZoom
      zoomControl={false}
      className="absolute inset-0 z-0 h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitRouteBounds route={route} />
      {/* Trail: lịch sử vị trí GPS thật đã đi qua — mờ, dashed, khác hẳn guidance route.
          Vẽ trước để guidance (nếu có) luôn nổi lên trên nếu trùng đoạn. */}
      {trail.length > 1 && (
        <Polyline positions={trail} pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.6, dashArray: '2 6' }} />
      )}
      {/* Guidance còn lại: sáng rõ, đây là tuyến tài xế cần đi tiếp. Không vẽ gì nếu chưa
          có route (vd: chưa chọn điểm đến) — tránh route cyan kéo dài sẵn không có ý nghĩa. */}
      {remaining.length > 1 && (
        <Polyline positions={remaining} pathOptions={{ color: '#22d3ee', weight: 5, opacity: 0.9 }} />
      )}
      <Marker position={position} icon={vehicleIcon} />
      {children}
    </MapContainer>
  );
}
