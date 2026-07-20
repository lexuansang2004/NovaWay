import type { LatLng } from '@/components/map/TripMap';

// Toạ độ thật của đường Quang Trung, Gò Vấp (lấy từ OpenStreetMap Nominatim), rút gọn còn
// ~20 điểm để nhẹ nhưng vẫn bám đúng hình dạng con đường thật (không cắt xuyên qua nhà/block).
// TODO(production): thay bằng route thật trả về từ OSRM/routing engine (TDR-002), và vị trí
// thật từ mobile qua WebSocket (step 4.3) một khi Trip API (step 7.1) tồn tại.
export const MOCK_ROUTE: LatLng[] = [
  [10.8363649, 106.6585708],
  [10.8358007, 106.660816],
  [10.835459, 106.662093],
  [10.8351945, 106.6629481],
  [10.8348044, 106.6638607],
  [10.8345352, 106.6644386],
  [10.8341531, 106.6650283],
  [10.8335041, 106.6658626],
  [10.832187, 106.6675663],
  [10.831179, 106.6688146],
  [10.8304678, 106.66971],
  [10.8302264, 106.670085],
  [10.8296318, 106.671233],
  [10.8293285, 106.6718147],
  [10.8291473, 106.672206],
  [10.8287822, 106.6731482],
  [10.8285213, 106.6738781],
  [10.8281075, 106.675067],
  [10.8278539, 106.6758245],
  [10.8272918, 106.6774485],
  [10.8268519, 106.6787769],
];
