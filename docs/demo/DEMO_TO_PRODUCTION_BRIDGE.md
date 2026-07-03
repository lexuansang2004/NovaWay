# NovaWay - Demo to Production Bridge

Tài liệu này định nghĩa các quy ước giúp bản demo (`feature/quick-demo`, build theo `/demo/step-00..12`) tiến hóa thành project chính (theo `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`) mà không phải build lại từ đầu.

Nguyên tắc gốc: **Demo-only ở mặt tính năng, production-ready ở mặt cấu trúc.** Không over-engineer demo; chỉ giữ các quy ước rẻ tiền dưới đây.

## 1. Cấu trúc thư mục quy ước

```text
src/
  pages/         # route-level screens
  components/    # UI tái sử dụng (FaceScanner, TripMap, VrRadarOverlay, VRScannerLoading...)
  layouts/       # AppLayout (sidebar shell)
  stores/        # Zustand stores: tripStore, offlineStore
  services/      # logic thay thế được (mock hôm nay, real API sau này)
  mocks/         # TOÀN BỘ mock data: vehicles.ts, route.quangtrung.ts, hazards.ts, authResult.ts
  config/        # demo.ts: hằng số demo (timings, ngưỡng, batch size)
```

Quy tắc: component KHÔNG import trực tiếp từ `mocks/`; dữ liệu đi qua `services/` hoặc `stores/` để sau này chỉ cần thay implementation.

## 2. Service adapter (thay mock bằng real service)

| Service (demo) | Mock hiện tại | Production thay bằng |
|---|---|---|
| `authService` | account cứng + localStorage | Auth API JWT (plan step 1.3, 2.2) |
| `faceIdService` | timer 3s + kết quả mock | Face verification service thật |
| `gpsProvider` | engine nội suy requestAnimationFrame | WebSocket live stream / Geolocation (plan 3.1, 4.3) |
| `eventLogService` (`addEvent`) | offlineStore + localStorage | REST batch `POST /api/trips/sync` (plan MVP) |
| `storageAdapter` | localStorage | IndexedDB (web) / SQLite (mobile) — xem `docs/future/OFFLINE_SYNC_ARCHITECTURE.md` |
| `hazardService` | `mocks/hazards.ts` | Terrain/hazard data API |

## 3. Contract component quan trọng

- **`FaceScanner`**: props `mode: 'login_auth' | 'vehicle_auth'` + `onComplete(result)`. Không tự navigate. Flow cha (Login, Start Trip Flow) quyết định bước tiếp theo.
- **`TripMap`**: bọc toàn bộ Leaflet. `// TODO(production): swap Leaflet -> MapLibre GL JS (TDR-002)` — chỉ thay bên trong component này.
- **`VrRadarOverlay`**: prop `autoMode: boolean` (DEMO-06 toggle tay, DEMO-10 luôn bật).
- **`VRScannerLoading`**: global, gọi được từ mọi màn hình.

## 4. Naming localStorage

Prefix thống nhất `novaway_demo_*`:

- `novaway_demo_auth`
- `novaway_demo_offline_queue`
- `novaway_demo_sync_history`

Khi lên production, đổi prefix và chuyển sang storageAdapter — grep một phát ra hết.

## 5. Config & flags

`src/config/demo.ts` chứa toàn bộ magic numbers (LOGIN_LOADING_MS, FACE_SCAN_MS, RESULT_POPUP_MS, WARNING_AUTO_DISMISS_MS, MISMATCH_SPEED_KMH, HAZARD_RADIUS_M, SYNC_BATCH_SIZE, SYNC_INTERVAL_MS) và cờ `DEMO_MODE` (ẩn Demo Controls + nút Reset khi tắt).

## 6. TODO markers

Mọi chỗ mock đánh dấu đúng format `// TODO(production): ...` (một format duy nhất, grep được). DEMO-12 sẽ tổng hợp danh sách này vào `/demo/DEMO_SCOPE_LOCK.md` mục "Nợ kỹ thuật có chủ đích".

## 7. Chiến lược Git

- Demo code trên `feature/quick-demo`.
- Demo KHÔNG phải disposable: sau demo, review + merge CÓ CHỌN LỌC vào `develop`.
- Phần merge được: app shell, auth UI, FaceScanner, TripMap, stores, services, config, mocks structure.
- Phần thay thế khi lên production: nội dung mocks, mock services, timings demo.

## 8. Mapping demo -> plan project chính

| Demo asset | Dùng lại ở step (COMPLETE_MICRO_STEP_PLAN) |
|---|---|
| App shell + sidebar + auth UI | 2.1 web foundation, 2.2 web auth |
| Vehicle selection UI + mocks/vehicles | 2.3 web vehicle management |
| TripMap + marker + polyline | 3.2 web live map |
| useOfflineStore + addEvent contract | offline sync MVP (`POST /api/trips/sync`) |
| Mismatch warning UI + audit log | 6.1 telematics vehicle mismatch |
| Trip Summary + Safety Score | 7.1/7.2 trip logs + analytics |
| Driving Cockpit + AR HUD | proof-of-concept UX cho mobile 4.x + AR 8.1 |
