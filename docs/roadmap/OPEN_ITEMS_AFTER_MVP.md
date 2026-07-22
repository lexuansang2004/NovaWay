# NovaWay — Open Items After MVP Baseline (v0.1.0)

> Tổng hợp mọi việc còn mở sau khi đóng mốc `v0.1.0-mvp-baseline`. Nguồn: `docs/ARCHITECTURE.md` §9, `docs/API_CONTRACT.md` §11, `docs/TEST_STRATEGY.md` §3, `docs/REVIEW_NOTES.md`. Không có mục nào ở đây được code trong lúc viết tài liệu này — đây là **ghi nhận**, không phải triển khai.

## 1. Step 8.1 — AR Terrain Mesh Prototype ⏸️ DEFERRED

- **Trạng thái:** Hoãn, chưa bắt đầu.
- **Lý do:** Cần Unity + AR Foundation và thiết bị AR thật để đo test gate bắt buộc (FPS, nhiệt độ, pin, điều kiện ánh sáng yếu — `docs/03_REQUIREMENT_DELTA_V0_2.md` §5.1). Môi trường phát triển hiện tại không có cả hai.
- **Không chặn gì:** R&D tách biệt hoàn toàn khỏi `apps/mobile` theo thiết kế gốc (TDR-003, `docs/ARCHITECTURE.md` §5.3/§7) — không merge vào app chính cho tới khi đạt test gate.
- **Điều kiện để tiếp tục:** có máy cài Unity Hub + Unity Editor (LTS phù hợp với AR Foundation), và ít nhất một thiết bị Android/iOS hỗ trợ ARCore/ARKit để đo thật.
- Chi tiết: `docs/REVIEW_NOTES.md` §15, `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` dòng `8.1`.

## 2. E2E-on-staging test gate ✅ ĐÃ CHẠY PASS THẬT (chưa tự động hoá)

- **Trạng thái:** Đã chạy `apps/web/e2e/golden-path.spec.ts` pass thật nhắm vào staging thật (Vercel + Railway) — R1-2/R1-3 follow-up (07/2026). Yêu cầu gốc của `docs/TEST_STRATEGY.md` §3 ("E2E suite pass trên môi trường staging") **đã đạt được**, nhưng bằng thao tác thủ công, chưa tự động hoá trong CI.
- **Yêu cầu gốc:** `docs/TEST_STRATEGY.md` §3 — "Merge vào `main` yêu cầu thêm: E2E suite pass trên môi trường staging."
- **Đã xong:**
  1. Viết suite (`apps/web/e2e/golden-path.spec.ts`) — luồng đăng nhập → chọn/kích hoạt xe (UI thật) → bắt đầu/gửi GPS/kết thúc chuyến đi (REST + WebSocket thật) → verify trên Analytics (UI thật). Chi tiết + lý do thiết kế (gap `LiveMapPage` mock) ở `docs/TEST_STRATEGY.md` §3.
  2. Wire vào CI (`e2e` job, `.github/workflows/ci.yml`) — chạy nhắm Postgres/PostGIS dựng ngay trong runner (không phải staging thật).
  3. Deploy `apps/web` lên Vercel (`docs/deployment/VERCEL_WEB_CHECKLIST.md`), cập nhật `WEB_ORIGIN` trên backend Railway — CORS xác nhận hoạt động qua trình duyệt thật.
  4. Chạy suite thủ công với `E2E_WEB_BASE_URL`/`E2E_API_BASE_URL`/`E2E_WS_BASE_URL` trỏ vào domain Vercel + Railway thật — **pass**.
- **Còn thiếu:** tự động hoá bước 4 — job `e2e` trong CI hiện chỉ chạy nhắm Postgres/backend dựng trong runner (mục đích: gate nhanh cho mọi PR, không phụ thuộc staging đang online), chưa có job/schedule nào tự chạy lại suite nhắm vào staging thật sau mỗi lần deploy. Có thể để thủ công (chạy tay khi cần xác nhận staging) hoặc thêm job CI riêng — chưa quyết định, không khẩn cấp vì gate chính (PR → `develop`/`main`) đã có `e2e` job tự động.
- **Hiện tại:** `v0.1.0` được merge vào `main` trước khi có gate này — dựa trên unit test + verify thủ công từng bước lúc đó, không hồi tố. Gate này áp dụng cho các lần merge `main` tiếp theo.

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

## 6. Hosting / CD cho staging & production ✅ STAGING XONG (production vẫn mở)

- **Trạng thái:** Staging đã chốt và deploy thật — R1-1/R1-2 (07/2026). Backend: Railway (`docs/deployment/RAILWAY_STAGING_PLAN.md`, `RAILWAY_DASHBOARD_CHECKLIST.md`) — `https://novawaybackend-production.up.railway.app`. Web: Vercel (`docs/deployment/VERCEL_WEB_CHECKLIST.md`) — `https://nova-way-web.vercel.app`. Postgres/PostGIS: Railway Docker Image service (`pretty-insight`).
- **CD:** deploy hiện là **thủ công** (bấm Deploy trên Dashboard mỗi provider, hoặc Railway tự redeploy khi có push lên `develop` do "Wait for CI" + GitHub trigger đã bật — xem `RAILWAY_DASHBOARD_CHECKLIST.md` §1). Chưa có pipeline CD tự động đầy đủ (vd. auto-deploy Vercel khi merge, rồi tự chạy lại E2E nhắm staging).
- **Còn mở:** production hosting (khác staging) — chưa chốt, chưa cần tới trong sprint này. Fly.io được ghi nhận là ứng viên đánh giá lại qua TDR riêng khi cần scale (`RAILWAY_STAGING_PLAN.md` §7).
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
