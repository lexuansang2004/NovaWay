# NovaWay — Open Items After MVP Baseline (v0.1.0)

> Tổng hợp mọi việc còn mở sau khi đóng mốc `v0.1.0-mvp-baseline`. Nguồn: `docs/ARCHITECTURE.md` §9, `docs/API_CONTRACT.md` §11, `docs/TEST_STRATEGY.md` §3, `docs/REVIEW_NOTES.md`. Không có mục nào ở đây được code trong lúc viết tài liệu này — đây là **ghi nhận**, không phải triển khai.

## 1. Step 8.1 — AR Terrain Mesh Prototype ⏸️ DEFERRED

- **Trạng thái:** Hoãn, chưa bắt đầu.
- **Lý do:** Cần Unity + AR Foundation và thiết bị AR thật để đo test gate bắt buộc (FPS, nhiệt độ, pin, điều kiện ánh sáng yếu — `docs/03_REQUIREMENT_DELTA_V0_2.md` §5.1). Môi trường phát triển hiện tại không có cả hai.
- **Không chặn gì:** R&D tách biệt hoàn toàn khỏi `apps/mobile` theo thiết kế gốc (TDR-003, `docs/ARCHITECTURE.md` §5.3/§7) — không merge vào app chính cho tới khi đạt test gate.
- **Điều kiện để tiếp tục:** có máy cài Unity Hub + Unity Editor (LTS phù hợp với AR Foundation), và ít nhất một thiết bị Android/iOS hỗ trợ ARCore/ARKit để đo thật.
- Chi tiết: `docs/REVIEW_NOTES.md` §15, `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` dòng `8.1`.

## 2. E2E-on-staging test gate ⏸️ PENDING (một phần đã xong)

- **Trạng thái:** E2E suite đã viết và chạy pass thật (local) — R1-3 (07/2026). Gate "trên môi trường staging" cho merge vào `main` vẫn **chưa** hoạt động.
- **Yêu cầu gốc:** `docs/TEST_STRATEGY.md` §3 — "Merge vào `main` yêu cầu thêm: E2E suite pass trên môi trường staging."
- **Đã xong:** `apps/web/e2e/golden-path.spec.ts` (Playwright) — luồng đăng nhập → chọn/kích hoạt xe (UI thật) → bắt đầu/gửi GPS/kết thúc chuyến đi (REST + WebSocket thật) → verify trên Analytics (UI thật). Chạy pass thật với backend + Postgres/PostGIS local (`pnpm --filter @novaway/web test:e2e`). Chi tiết + lý do thiết kế (gap `LiveMapPage` mock) ở `docs/TEST_STRATEGY.md` §3.
- **Còn thiếu:**
  1. **Wire vào CI** — `.github/workflows/ci.yml` chưa chạy E2E job nào; cần Postgres service container + boot backend/web trong CI trước.
  2. **Chạy trên staging thật** — suite đã hỗ trợ trỏ tới URL khác qua `E2E_API_BASE_URL`/`E2E_WEB_BASE_URL`/`E2E_WS_BASE_URL`, nhưng chưa từng chạy thật nhắm vào staging vì `apps/web` chưa được deploy (backend đã deploy — `docs/deployment/RAILWAY_DASHBOARD_CHECKLIST.md`).
- **Hiện tại:** CI (`.github/workflows/ci.yml`) chỉ gate lint + unit test + build trên PR — đủ cho `develop`, chưa đủ cho gate "an toàn để lên `main`" như tài liệu gốc mô tả. `v0.1.0` được merge vào `main` dựa trên unit test + verify thủ công từng bước (curl/socket/browser automation) trong lúc phát triển, **không** dựa trên E2E-on-staging.
- **Điều kiện để tiếp tục:** deploy `apps/web` lên staging (§7 dưới), rồi wire E2E vào CI nhắm vào URL staging thật.

## 3. Tile provider cho web dashboard (OQ-005) — vẫn mở

- **Trạng thái:** Chưa chọn. `apps/web`'s `TripMap` hiện dùng Leaflet + OSM public tile (kế thừa từ demo), có comment `TODO(production)` sẵn trong code chờ quyết định.
- **Cần:** technical spike so sánh Protomaps vs Mapbox Free Tier (quota/pricing hiện hành) trước khi đổi sang MapLibre GL JS (TDR-002).
- Xem: `docs/ARCHITECTURE.md` §9, `docs/04_TECH_DECISION_RECORD.md` TDR-002.

## 4. Biometric provider thật (FR-BIOMETRIC-05, R-17) — vẫn mở

- **Trạng thái:** MVP dùng `MockBiometricProvider` (adapter pattern, `apps/backend/src/biometric/`). Chưa chọn SDK/dịch vụ xác thực khuôn mặt thật.
- **Cần chốt trước khi thay:** nhà cung cấp cụ thể + xác nhận chính sách của họ thật sự đáp ứng "không lưu ảnh thô" (constraint cứng của dự án, không chỉ quy ước code).
- **Payload `provider_payload`:** hiện là chuỗi mờ (opaque string), sẽ đổi schema thật theo SDK đã chọn — không đổi contract `POST /api/vehicles/:id/verify` ở tầng response.
- Xem: `docs/API_CONTRACT.md` §4/§11, `docs/ARCHITECTURE.md` §9.

## 5. Rate limiting — chưa triển khai

- **Trạng thái:** Không có middleware rate-limit nào trong `apps/backend` (đã kiểm tra: không có `ThrottlerModule`/tương đương). FR-REALTIME-04 ("GPS event có rate limit để tránh spam/quá tải server") và NFR liên quan **chưa được hiện thực hoá**.
- **Cần:** benchmark số request/giây/user hợp lý trước khi chốt giới hạn cụ thể (đăng nhập, GPS event, batch sync).
- Xem: `docs/API_CONTRACT.md` §11, `docs/SRS.md` NFR-API-01.

## 6. Hosting / CD cho staging & production — vẫn mở

- **Trạng thái:** Chưa chốt nhà cung cấp. Phần **CI** (lint/test/build gate cho PR) đã xong ở step `9.2` (GitHub Actions) — đây là phần riêng, **CD** (deploy) là phần còn thiếu.
- **Chặn:** mục 2 (E2E-on-staging gate) không thể triển khai cho tới khi có nơi deploy staging.
- Xem: `docs/ARCHITECTURE.md` §8 (Deployment Topology), §9.

## 7. Mobile Trip Cockpit chưa có Map view (OQ-006) — phát hiện khi soát lại cho tài liệu này

- **Trạng thái:** `docs/ARCHITECTURE.md` §5.1 mô tả màn hình chính mobile là "Trip Cockpit (Map + AR Lite)", nhưng step `4.3` (`feat/mobile-realtime-location`) chỉ build UI text (tốc độ, trạng thái kết nối) — **không có map view nào** trong `apps/mobile` (đã kiểm tra `pubspec.yaml`: không có package map nào — `flutter_map`, `google_maps_flutter`, v.v.).
- **OQ-006** ("Mobile map plugin chọn gì?") chưa từng được chốt lại sau D0.2 — không nằm trong 13 hạng mục bắt buộc đã đóng ở `docs/REQUIREMENT_BASELINE_V1.md` §3, và không có step riêng nào trong plan yêu cầu xây map cho mobile.
- **Cần:** chốt package map cho Flutter (tương thích OSM/MapLibre theo `docs/ARCHITECTURE.md` §5.1), rồi thêm map view thật vào Trip Cockpit — hiện đang là scope gap giữa thiết kế và implementation, không phải bug.

## 8. Benchmark hiệu năng `gps_event_dedup` — chưa thực hiện

- **Trạng thái:** `docs/REQUIREMENT_BASELINE_V1.md` §4 liệt kê "Benchmark `gps_event_dedup` (chi phí ghi phụ mỗi GPS event)" là implementation-time item cần giải quyết ở step `1.2`/`3.1`. Chưa từng benchmark thật — logic idempotency (`apps/backend/src/realtime/gps-events.service.ts`) đã đúng và có unit test, nhưng chi phí throughput của việc ghi thêm 1 bảng phụ mỗi GPS event (đặc biệt qua đường realtime, tần suất cao) chưa được đo bằng số liệu thật.
- **Cần:** load test nhỏ (không phải benchmark quy mô lớn, xem `docs/TEST_STRATEGY.md` §4 "Out of Scope") để xác nhận mức chấp nhận được trước khi có tải sản xuất thật.

## 9. Web `LiveMapPage` (`/start-trip`) chưa nối API thật — phát hiện khi viết E2E suite (R1-3)

- **Trạng thái:** `apps/web/src/pages/LiveMapPage.tsx` chỉ chạy `useMockGpsSender` — mô phỏng vị trí phía client theo `MOCK_ROUTE` cố định. Không gọi `POST /api/trips/start`, không kết nối `/realtime` WebSocket thật, không gọi `POST /api/trips/:id/end`. Nút bấm ghi rõ "Bắt đầu chuyến đi (mock)".
- **Vì sao chưa phát hiện sớm hơn:** step `3.2` (`feat/web-live-map`) khi viết ban đầu chỉ yêu cầu "marker di chuyển realtime (mock GPS sender phía client)" — đúng như plan gốc mô tả, không phải lỗi implementation, chỉ là plan gốc chưa yêu cầu nối API thật ở bước đó và chưa có bước nào sau đó quay lại nối.
- **Ảnh hưởng:** luồng vàng "đăng nhập → chọn xe → bắt đầu chuyến đi → thấy vị trí trên dashboard → kết thúc chuyến đi" (`docs/TEST_STRATEGY.md` §3, `docs/roadmap/SPRINT_R1_STABILIZATION.md` R1-3) không thể test 100% qua UI thật — E2E suite (`apps/web/e2e/golden-path.spec.ts`) phải gọi thẳng REST + WebSocket thật cho phần bắt đầu/kết thúc chuyến đi, chỉ dùng UI thật cho đăng nhập + chọn xe + xem kết quả.
- **Cần:** nối `LiveMapPage` vào `POST /api/trips/start`, `/realtime` WebSocket thật (gửi vị trí GPS trình duyệt thật hoặc mô phỏng qua API thay vì hoàn toàn client-side), và `POST /api/trips/:id/end` — việc riêng, ngoài phạm vi R1-3 (chỉ viết E2E suite).

## 10. Các Open Item nhỏ khác còn treo trong docs gốc

- `OQ-005` (tile provider) và biometric provider — đã liệt kê ở mục 3/4, không lặp lại.
- Exclusion constraint `btree_gist` (dùng ở `vehicle_authorizations`, step `1.5`) mới xác nhận hoạt động trên Postgres local — chưa xác nhận khả dụng trên hosting production cuối cùng (phụ thuộc mục 6, hosting provider chưa chốt).
- Không có mục nào khác còn mở trong `docs/01_OPEN_QUESTIONS.md` sau D0.7 ngoài các mục đã liệt kê ở trên.

---

**Không có mục nào trong tài liệu này được triển khai — đây thuần tuý là ghi nhận hiện trạng để lên kế hoạch sau MVP.**
