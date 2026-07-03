# DEMO-07 - Mock Realtime GPS

## Mục tiêu
Xây dựng hệ thống giả lập GPS (Simulation Engine) để di chuyển phương tiện dọc theo tuyến đường một cách mượt mà (nội suy 60 FPS), đồng thời cung cấp bảng điều khiển "Tua nhanh" (Demo Controls) để phục vụ trình diễn.

## Scope
- Làm trong step này:
  - Cập nhật Component `DrivingCockpit` từ DEMO-06.
  - Tạo global store `useTripStore` (Zustand) tại `src/stores/tripStore.ts` giữ trạng thái chuyến đi (`isDriving`, `currentPosition`, `currentSpeed`, `distanceTravelled`, `speedMultiplier`) — đặt global NGAY TỪ STEP NÀY để DEMO-11 (Trip Protection/Mini-player) không phải refactor.
  - Xây dựng logic Animation Nội suy (Interpolation) bằng `requestAnimationFrame` giúp xe di chuyển trơn tru trên đường.
  - Cập nhật tự động thông số Tốc độ (Speedometer) và Quãng đường trên HUD.
  - Tự động di chuyển (Pan) bản đồ để luôn giữ xe ở trung tâm (Auto-follow).
  - Xây dựng bảng **Demo Controls** ở góc dưới trái: Nút Play, Pause, Tua x1, x2, x5. Bảng có gắn nhãn "Demo Tools - Hidden in Production".

## Non-scope
- Không bung các popup cảnh báo nguy hiểm / sai lệch (Chờ DEMO-09, 10).
- Không tạo logic hàng chờ rớt mạng Offline (Chờ DEMO-08).

## Tech stack
- React Hooks (`useRef`, `useEffect`).
- Zustand (global trip store `useTripStore`).
- Web API: `requestAnimationFrame`.
- Tuỳ chọn: `turf.js` để tính khoảng cách/nội suy toạ độ.

## UI requirements
- Bảng Demo Controls sử dụng UI gọn gàng, nút bấm nhỏ của shadcn.
- Xe di chuyển mượt mà 60fps không giật.

## Behavior requirements
- Bật màn hình -> Xe tự chạy, tốc độ hiện ~40km/h.
- Bấm x5 -> Xe chạy nhanh x5, tốc độ hiện lên ~200km/h.
- Bấm Pause -> Xe dừng, tốc độ về 0.
- Camera bản đồ bám sát xe.

## Output expected
- Hệ thống Simulation hoạt động ổn định, có thể dùng làm nền tảng sinh events cho các bước sau.

## Commit message
```bash
feat: add 60fps mock gps interpolation and demo playback controls
```
