# DEMO-06 - Driving Map Cockpit

## Mục tiêu
Xây dựng giao diện "Buồng lái" (Cockpit) hiển thị bản đồ dẫn đường (Full Map) tràn viền, kết hợp với các thẻ thông số lơ lửng (Glassmorphism), và chuẩn bị sẵn UI/Toggle cho Không gian Lớp phủ VR (VR Scanner Overlay).

## Scope
- Làm trong step này:
  - Cài đặt `leaflet` và `react-leaflet`.
  - Render Bản đồ OSM phủ kín 100% màn hình, fitBounds vừa vặn đoạn đường Quang Trung, Gò Vấp.
  - Vẽ tuyến đường màu xanh (Route Polyline) dọc Quang Trung.
  - Đặt Marker Icon phương tiện tại điểm xuất phát.
  - Cấu trúc Overlays lơ lửng (Glassmorphism):
    - Tốc độ (Mock: 0 km/h) ở góc trên trái.
    - Thời gian, quãng đường góc trên phải.
    - Nút Kết thúc chuyến đi (Đỏ) ở góc dưới.
  - Nút Toggle "Bật VR Radar" và hiệu ứng Radar quét 360 độ (CSS Animation) xoay quanh xe.

## Non-scope
- Không làm logic xe chạy (GPS mock) (sẽ làm ở DEMO-07).
- Không làm thuật toán/cảnh báo địa hình thật (sẽ làm ở DEMO-10).

## Tech stack
- React + Tailwind CSS
- Thư viện Bản đồ: `leaflet`, `react-leaflet`, `@types/leaflet`.
- Framer Motion, CSS `@keyframes` cho Radar.

## UI requirements
- Bản đồ tràn viền (100vh/100%).
- Các panel thông số dùng `backdrop-blur` (Glassmorphism) cực kỳ hiện đại, chữ sáng, icon Lucide sắc nét.
- Nút Toggle VR thiết kế dạng công tắc hoặc Icon công nghệ.
- Lưới Radar quét mượt mà.

## Behavior requirements
- Bật VR Toggle -> Hiện vòng Radar quét quanh xe, kèm theo lớp grid mờ phủ map.
- Tắt Toggle -> Mất radar.
- Bấm Kết thúc chuyến đi -> Về `/dashboard` (đích TẠM; DEMO-11 sẽ đổi sang màn hình Summary).

## Output expected
- Giao diện Cockpit hiển thị hoàn hảo, không lỗi xám tiles của Leaflet.

## Commit message
```bash
feat: add driving map cockpit with overlays and vr radar placeholder
```
