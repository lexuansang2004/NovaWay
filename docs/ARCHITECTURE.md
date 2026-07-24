# NovaWay — Architecture v0.1

> Step D0.4. Kiến trúc nháp cho MVP, dựa trên `PRD.md`, `SRS.md`, `DATA_REQUIREMENTS.md`, `API_REQUIREMENTS.md` và các quyết định kỹ thuật đã chốt ở `docs/04_TECH_DECISION_RECORD.md`. Vẫn **chưa yêu cầu code** — D0.4 chỉ thiết kế, D0.7 mới chốt Baseline v1.0 để bắt đầu `0.2 chore/repo-foundation`.

## 1. Nguyên tắc kiến trúc

1. **Monorepo, tách rõ theo app** — backend/web/mobile/packages dùng chung type, không trộn lẫn trách nhiệm.
2. **Mock trước, real service sau, cùng một interface** — đúng nguyên tắc Clean Demo Foundation đã áp dụng ở bản demo (`docs/demo/DEMO_TO_PRODUCTION_BRIDGE.md`). Routing, biometric provider, terrain warning data đều phải đi qua một lớp adapter để đổi mock ↔ thật mà không phải sửa logic nghiệp vụ xung quanh.
3. **Realtime và Offline là hai đường dữ liệu tách biệt** — không bao giờ dùng WebSocket để replay dữ liệu offline lớn (TDR-005). Đây là ràng buộc xuyên suốt toàn bộ backend.
4. **AR/Computer Vision nặng tách khỏi app chính** — Unity AR Terrain Mesh là prototype độc lập (R&D), không kéo theo rủi ro hiệu năng/pin vào mobile app chính ở MVP (TDR-003).
5. **Không over-engineer hạ tầng trước khi có tải thật** — không Kafka, không Redis, không multi-region ở MVP (TDR-004).

## 2. Monorepo Structure

```text
novaway/
  apps/
    backend/          # NestJS — API + WebSocket Gateway
    web/               # React — dashboard, live map
    mobile/            # Flutter — driver app
  packages/
    shared-types/      # TypeScript types dùng chung backend <-> web (DTO, enum, event payload)
  docs/                # toàn bộ tài liệu D0.x (đã có)
  demo/                # lịch sử micro-step demo (đã có, giữ nguyên tham khảo)
```

`packages/shared-types` chỉ chia sẻ được với `web` (cùng TypeScript). Mobile (Flutter/Dart) không dùng chung package này — hợp đồng giữa backend và mobile là `API_CONTRACT.md`, không phải code dùng chung.

## 3. Backend (NestJS)

### 3.1. Module breakdown

| Module | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `AuthModule` | Register/login/me, JWT guard | `UsersModule` |
| `UsersModule` | CRUD user cơ bản | — |
| `VehiclesModule` | CRUD vehicle, active vehicle, ownership guard | `UsersModule` |
| `VehicleAuthorizationModule` | Cấp/thu hồi/kiểm tra uỷ quyền borrower (FR-AUTHZ) | `VehiclesModule`, `UsersModule` |
| `BiometricModule` | Gọi biometric provider adapter, ghi `biometric_verifications`, kiểm quyền trước khi verify (FR-BIOMETRIC) | `VehicleAuthorizationModule` |
| `TripsModule` | Vòng đời chuyến đi, `trip_logs` | `VehiclesModule`, `BiometricModule` |
| `RealtimeGatewayModule` | WebSocket Gateway, broadcast vị trí, reconnect policy phía server | `TripsModule` |
| `SyncModule` | REST batch sync `/api/trips/sync`, idempotency | `TripsModule` |
| `MismatchDetectionModule` | Rule phát hiện sai lệch phương tiện, tạo warning | `TripsModule` |
| `TerrainWarningsModule` | CRUD đọc cảnh báo địa hình (seed/mock ở MVP) | — |
| `ObservabilityModule` | Health check, logging, metrics (NFR-OBS-01) | Cross-cutting, load ở `main.ts` |

Mỗi module map trực tiếp tới một hoặc nhiều micro-step trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` (`1.1`–`1.6`, `3.1`, `6.1`, `7.1`, `9.1`) — không có module nào không có step tương ứng, và không có step nào thiếu module.

### 3.2. Adapter layer (mock ↔ real)

| Adapter | Interface | MVP implementation | Thay bằng (sau) |
|---|---|---|---|
| `RoutingProvider` | `getRoute(vehicleType, origin, destination)` | Mock theo loại xe (step `5.1`) | OSRM/GraphHopper (step `5.2`) |
| `BiometricProvider` | `verify(userId, vehicleId, payload)` | SDK/dịch vụ bên thứ ba đã chọn ở D0.4 Open Item | Có thể đổi provider mà không sửa `BiometricModule` |
| `TerrainWarningSource` | `getWarningsInBBox(bbox)` | Seed/mock data trong DB | Computer Vision pipeline (Post-MVP/R&D) |
| `StorageAdapter` (offline queue phía mobile, không phải backend) | xem §5.2 | — | — |

Nguyên tắc: `Module` gọi qua interface, không import trực tiếp implementation cụ thể — cùng convention `src/services/` đã dùng ở bản demo.

### 3.3. Vòng đời một chuyến đi (đầu-cuối, tham chiếu FR)

```text
1. User chọn phương tiện (FR-VEHICLE-03)
   -> hệ thống kiểm tra: là chủ xe, hay borrower có uỷ quyền hiệu lực (FR-AUTHZ-02)
2. User xác thực khuôn mặt cho phương tiện đó (FR-BIOMETRIC-01/02)
   -> backend gọi BiometricProvider, ghi biometric_verifications, trả verification_id
3. User bấm "Bắt đầu chuyến đi" kèm verification_id (FR-TRIP-03)
   -> backend kiểm verification_id còn hợp lệ (chưa quá ngưỡng thời gian) và result = success
   -> tạo bản ghi trips (status = active)
4. Mobile gửi GPS liên tục qua WebSocket khi online (FR-REALTIME-01)
   -> RealtimeGatewayModule validate, ghi raw_gps_events, broadcast cho dashboard
   -> song song, MismatchDetectionModule đánh giá tốc độ/hành vi, có thể tạo warning
5. Nếu mất mạng: mobile chuyển sang local queue (FR-SYNC-01)
   -> khi có mạng lại, gọi POST /api/trips/sync theo batch/chunk (FR-SYNC-03/05)
6. User kết thúc chuyến đi (FR-TRIP-04)
   -> trips.status = ended, tạo trip_logs summary, dừng foreground/background tracking
```

## 4. Web Dashboard (React)

Tái sử dụng có chọn lọc từ `feature/quick-demo` theo `docs/demo/DEMO_TO_PRODUCTION_BRIDGE.md` — không viết lại từ đầu phần đã có:

- App shell + sidebar + auth UI (bước `2.1`).
- Component `TripMap` (bọc Leaflet, kế hoạch swap MapLibre GL JS theo TDR-002 — xem `TripMap.tsx` comment `TODO(production)` sẵn có).
- `useTripStore`/`useOfflineStore` pattern (Zustand) — đổi nguồn dữ liệu từ mock sang API thật, giữ nguyên contract state.

**Khác biệt so với demo cần lưu ý khi lên thật:**
- Demo dùng Leaflet + OSM public tile — sản phẩm thật chuyển MapLibre GL JS + Protomaps/Mapbox Free Tier (Open Question OQ-005, xem §8).
- Demo không có backend thật — web thật gọi `API_CONTRACT.md` + kết nối WebSocket gateway thật, không còn mock service trong `src/services/`.
- Cockpit lái xe trên web (`DrivingCockpit`) là **proof-of-concept UX cho mobile**, không phải màn hình chính thức của web dashboard sản phẩm thật (web dashboard là công cụ giám sát cho Fleet Operator, không phải nơi tài xế lái xe — xem `USER_STORIES.md` §3).

## 5. Mobile (Flutter)

### 5.1. Cấu trúc màn hình chính

```text
Login -> Vehicle List -> [chọn xe] -> Biometric Verify -> Trip Cockpit (Map + AR Lite) -> Trip Summary
```

Trip Cockpit tương ứng trực tiếp với "Driving Cockpit" đã proof-of-concept trên web demo — port lại UX, không thiết kế lại từ đầu.

### 5.2. Background Location Service

- Android: Foreground Service riêng (`LocationTrackingService`), start khi trip active, stop khi trip end hoặc consent bị rút — bắt buộc notification liên tục khi chạy (FR-BGLOC-02).
- iOS: `CLLocationManager` với luồng xin quyền 2 bước (When-In-Use trước, nâng cấp Always khi bắt đầu chuyến đi) — theo mitigation ở `RISK_REGISTER.md` R-16.
- Offline queue: SQLite local (không dùng `localStorage`/bộ nhớ tạm như bản demo — xem `docs/future/OFFLINE_SYNC_ARCHITECTURE.md` §Storage Engine để tham khảo lý do).

### 5.3. AR Lite trên mobile

- Camera preview + overlay cảnh báo là một widget riêng, có thể tắt hoàn toàn (feature flag) nếu thiết bị không đủ điều kiện (FR-AR-03).
- Không nhúng Unity/AR Foundation vào app chính — nếu R&D (§7) đạt test gate, tích hợp sau như một module tách biệt, không phải rewrite Trip Cockpit.

## 6. Realtime Layer

```text
Mobile --location:update--> WebSocket Gateway (NestJS) --location:broadcast--> Web Dashboard
                                      |
                                      v
                          MismatchDetectionModule (đánh giá inline)
```

- MVP: một NestJS Gateway instance, in-memory room theo `trip_id`/`vehicle_id` để broadcast đúng client đang theo dõi.
- Scale sau (không làm ở MVP): Redis adapter cho Socket.io khi cần nhiều instance backend (NFR-SCALE-01, TDR-004).
- Idempotency (NFR-SEC-03) nằm ở tầng database qua bảng `gps_event_dedup` riêng (xem `DATA_MODEL.md` §2.7), không phải ở Gateway — Gateway chỉ validate và forward, không tự lọc trùng bằng logic riêng để tránh lệch với đường batch sync.

## 7. Routing & AR/Terrain (R&D tách biệt)

- Routing MVP: `RoutingProvider` mock trả route khác nhau theo `vehicleType` (step `5.1`). Routing thật (OSRM/GraphHopper) là step `5.2`, đổi implementation, không đổi contract gọi từ web/mobile.
- AR Terrain Mesh: dự án Unity/AR Foundation **hoàn toàn tách biệt** khỏi monorepo chính (repo riêng hoặc thư mục riêng ngoài `apps/`), có test gate riêng (FPS, nhiệt, pin, low-light — xem `docs/03_REQUIREMENT_DELTA_V0_2.md` §5.1). Không merge vào `apps/mobile` cho tới khi đạt gate.

## 8. Deployment Topology (mức khái niệm — nhiều điểm còn mở)

```text
[Mobile app] --HTTPS/WSS--> [Load Balancer] --> [Backend instance(s)] --> [PostgreSQL + PostGIS]
[Web dashboard] --HTTPS/WSS--------^
```

- MVP chạy được với **một** backend instance (không cần load balancer thật ở giai đoạn dev/demo nội bộ) — vẽ load balancer ở đây là định hướng cho khi cần nhiều instance, không phải yêu cầu bắt buộc ngay.
- CI/CD cụ thể (nhà cung cấp, môi trường staging/production) là Open Item — xem §9; step `9.2 chore/ci-cd-pipeline` sẽ hiện thực hoá sau khi chọn.

## 9. Open Items for D0.7 (cần chốt trước Requirement Baseline v1.0)

- ~~**Mobile stack (OQ-001)**~~ — **Đã chốt**: Flutter, dùng xuyên suốt `apps/mobile` từ step `0.2` đến `4.3`.
- **Tile provider (OQ-005):** Protomaps vs Mapbox Free Tier — cần technical spike (kiểm tra quota/pricing hiện hành) trước khi `apps/web` phụ thuộc vào một trong hai. **Vẫn mở** sau MVP — xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`.
- **Biometric provider (FR-BIOMETRIC-05, R-17):** chưa chọn SDK/dịch vụ cụ thể — ảnh hưởng trực tiếp `BiometricModule` và việc "không lưu ảnh thô" có thực sự đúng theo chính sách nhà cung cấp hay không. **Vẫn mở** sau MVP — `MockBiometricProvider` vẫn là adapter đang dùng.
- ~~**Hosting/CI-CD provider**~~ — **Đã chốt**: CI (lint/test/build gate cho PR) là GitHub Actions (`.github/workflows/ci.yml`, step `9.2`). Hosting/CD: Railway (backend) + Vercel (web), chốt và triển khai thật từ R1, CD tự động từ R2-7, và chính thức dùng luôn cho production từ R3-6 (không dựng hạ tầng riêng — xem `docs/architecture/TDR-production-hosting.md`, `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §6).
- ~~**`packages/shared-types` build tooling`**~~ — **Đã chốt**: pnpm workspaces (`pnpm-workspace.yaml`), dùng từ step `0.2`.
