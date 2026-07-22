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

## 3. ✅ Tile provider cho web dashboard (OQ-005) — đã chốt (R1-7, 07/2026)

- **Trạng thái cũ:** Chưa chọn. `apps/web`'s `TripMap` hiện dùng Leaflet + OSM public tile (kế thừa từ demo), có comment `TODO(production)` sẵn trong code chờ quyết định.
- **Đã làm:** technical spike so sánh Protomaps vs Mapbox Free Tier (quota/pricing 07/2026) — chốt **Protomaps** (hosted API free 1M request/tháng cho MVP/staging, self-host PMTiles + Cloudflare R2 cho production). Chi tiết: `docs/architecture/TDR-tile-provider-spike.md`.
- **Còn lại:** migrate `apps/web`'s `TripMap.tsx` từ Leaflet sang MapLibre GL JS + wire Protomaps thật — cố ý **chưa làm trong R1-7** (phạm vi R1-7 chỉ là spike/quyết định, không phải code migration; migrate là thay đổi UI thật cần verify trực quan riêng). `apps/mobile`'s `flutter_map` (OQ-006) nên đổi theo song song khi web migrate, để tránh 2 tile source khác nhau.
- Xem: `docs/ARCHITECTURE.md` §9, `docs/04_TECH_DECISION_RECORD.md` TDR-002, `docs/architecture/TDR-tile-provider-spike.md`.

## 4. ✅ Biometric provider thật (FR-BIOMETRIC-05, R-17) — đánh giá xong (R1-8, 07/2026), chưa implement

- **Trạng thái cũ:** MVP dùng `MockBiometricProvider` (adapter pattern, `apps/backend/src/biometric/`). Chưa chọn SDK/dịch vụ xác thực khuôn mặt thật.
- **Đã làm:** technical spike so sánh AWS Rekognition Face Liveness, Azure Face API, FPT.AI eKYC, Regula Face SDK/FaceTec (07/2026) — chốt **AWS Rekognition Face Liveness** làm primary candidate, FPT.AI làm fallback nếu cần data residency nghiêm ngặt hơn. Chi tiết: `docs/architecture/TDR-biometric-provider-spike.md`.
- **Điều kiện bắt buộc trước khi implement thật (chưa làm):** xác nhận qua ToS/DPA của AWS đã tắt (opt-out) việc lưu selfie video để "cải thiện dịch vụ" — mặc định của AWS có lưu, phải tắt thủ công để đáp ứng ràng buộc "không lưu ảnh thô" (constraint cứng của dự án, không chỉ quy ước code) và Nghị định 13/2023/NĐ-CP.
- **Payload `provider_payload`:** hiện là chuỗi mờ (opaque string), sẽ đổi schema thật theo session flow của AWS Rekognition Face Liveness khi implement — không đổi contract `POST /api/vehicles/:id/verify` ở tầng response.
- **Còn lại:** implement `AwsRekognitionBiometricProvider` thật — việc riêng, chưa lên lịch (P2, không khẩn cấp cho staging nội bộ vì mock vẫn dùng được).
- Xem: `docs/API_CONTRACT.md` §4/§11, `docs/ARCHITECTURE.md` §9, `docs/architecture/TDR-biometric-provider-spike.md`.

## 5. Rate limiting — ✅ login + GPS event xong (R1-4, 07/2026); batch sync N/A

- **Trạng thái:** Đã triển khai cho 2/3 phần trong phạm vi gốc.
  - **Login** (`POST /api/auth/login`): `@nestjs/throttler`, `ThrottlerGuard` áp riêng cho route này (không global) — 5 lần/60 giây/IP. Verify thật: 5 lần đầu trả `401` (sai mật khẩu), lần thứ 6 trả `429 {error_code: "RATE_LIMITED"}`.
  - **GPS event** (`location:update`, WebSocket): `GpsRateLimiterService` (in-memory fixed-window counter, cùng phong cách `MismatchDetectionService`) — 10 event/giây/user. Verify thật qua `socket.io-client`: gửi dồn 15 event, 10 event đầu được chấp nhận, 5 event sau bị `location:rejected` với `error_code: "RATE_LIMITED"`.
  - Cả 2 giới hạn trên là **giá trị ban đầu thận trọng, chưa qua benchmark tải thật** — đúng như cảnh báo gốc ở mục này trước khi sửa, cần tinh chỉnh khi có traffic thật.
  - **Batch sync** (`POST /api/trips/sync`): **không áp dụng được** — endpoint này chỉ mới có hợp đồng tài liệu (`docs/API_CONTRACT.md` §7: request/response shape, giới hạn 500 events/payload đã đặc tả sẵn) nhưng **chưa từng được implement** trong `apps/backend` (không có route, không có `SyncModule` dù `app.module.ts` có để sẵn comment placeholder). Không thể rate-limit một endpoint không tồn tại — cần xây endpoint trước (việc riêng, ngoài phạm vi R1-4).
- Xem: `docs/API_CONTRACT.md` §7, §11, `docs/SRS.md` NFR-API-01, FR-REALTIME-04, NFR-PERF-01. Code: `apps/backend/src/realtime/gps-rate-limiter.service.ts`, `apps/backend/src/auth/auth.controller.ts`.

## 6. Hosting / CD cho staging & production ✅ STAGING XONG (production vẫn mở)

- **Trạng thái:** Staging đã chốt và deploy thật — R1-1/R1-2 (07/2026). Backend: Railway (`docs/deployment/RAILWAY_STAGING_PLAN.md`, `RAILWAY_DASHBOARD_CHECKLIST.md`) — `https://novawaybackend-production.up.railway.app`. Web: Vercel (`docs/deployment/VERCEL_WEB_CHECKLIST.md`) — `https://nova-way-web.vercel.app`. Postgres/PostGIS: Railway Docker Image service (`pretty-insight`).
- **CD:** deploy hiện là **thủ công** (bấm Deploy trên Dashboard mỗi provider, hoặc Railway tự redeploy khi có push lên `develop` do "Wait for CI" + GitHub trigger đã bật — xem `RAILWAY_DASHBOARD_CHECKLIST.md` §1). Chưa có pipeline CD tự động đầy đủ (vd. auto-deploy Vercel khi merge, rồi tự chạy lại E2E nhắm staging).
- **Còn mở:** production hosting (khác staging) — chưa chốt, chưa cần tới trong sprint này. Fly.io được ghi nhận là ứng viên đánh giá lại qua TDR riêng khi cần scale (`RAILWAY_STAGING_PLAN.md` §7).
- Xem: `docs/ARCHITECTURE.md` §8 (Deployment Topology), §9.

## 7. ✅ Mobile Trip Cockpit Map view (OQ-006) — đã xong (R1-5, 07/2026)

- **Trạng thái:** Đã thêm map thật vào `TripCockpitScreen` — `flutter_map` + OSM public tile (`tile.openstreetmap.org`), khớp đúng trạng thái hiện tại của web (Leaflet + OSM public tile, `docs/ARCHITECTURE.md` §5.1) thay vì hướng MapLibre GL JS tương lai (TDR-002), để tránh phụ thuộc OQ-005 (tile provider) vẫn đang mở.
- **OQ-006 đã chốt** (`docs/01_OPEN_QUESTIONS.md`): `flutter_map` (MIT, không cần API key). Sẽ đổi sang `maplibre_gl` song song với web khi OQ-005 chốt và web thật sự chuyển MapLibre.
- **Đã build:** marker vị trí hiện tại (di chuyển theo GPS fix thật), trail (polyline lịch sử vị trí, giới hạn 500 điểm gần nhất tránh phình bộ nhớ chuyến dài), map luôn hiển thị (kể cả trước khi bắt đầu chuyến, center mặc định TP.HCM).
- **Verify đã chạy:** `flutter analyze` sạch, `flutter test` 17/17 pass (thêm test mới xác nhận marker xuất hiện đúng sau GPS fix, dùng `FakeTileProvider` — trả ảnh trong suốt 1x1 đồng bộ thay vì gọi mạng thật trong test, tránh test chậm/flaky). `flutter build windows --debug` build thành công, chạy thử `.exe` thật — process sống, Dart VM service khởi động, không crash. **Chưa chụp được ảnh màn hình thật của map hiển thị** (không có công cụ điều khiển/chụp cửa sổ desktop native trong môi trường này) — verify dừng ở mức build/test/boot thật, không phải xác nhận trực quan.

## 8. ✅ Benchmark hiệu năng `gps_event_dedup` — đã xong (R1-6, 07/2026)

- **Trạng thái cũ:** `docs/REQUIREMENT_BASELINE_V1.md` §4 liệt kê "Benchmark `gps_event_dedup` (chi phí ghi phụ mỗi GPS event)" là implementation-time item cần giải quyết ở step `1.2`/`3.1`. Logic idempotency (`apps/backend/src/realtime/gps-events.service.ts`) đã đúng và có unit test, nhưng chưa từng đo throughput/latency thật của việc ghi thêm bảng phụ mỗi GPS event.
- **Đã làm:** viết `apps/backend/scripts/benchmark-gps-dedup.js` — load test nhỏ (không phải benchmark quy mô lớn, đúng phạm vi `docs/TEST_STRATEGY.md` §4 "Out of Scope"), đo latency tuần tự (n=500) và throughput đồng thời (4 kết nối × 200 events) trên schema local giống staging. Chi tiết phương pháp + số liệu thật: `docs/performance/GPS_EVENT_DEDUP_BENCHMARK.md`.
- **Kết quả:** chi phí biên của bước dedup ~1.4 ms avg / ~1.7 ms p95 (nhỏ so với ~5 ms avg tổng); throughput đo được ~813 events/sec với 4 kết nối song song, không có dấu hiệu nghẽn ở tải này. Thiết kế idempotency hiện tại chấp nhận được cho quy mô staging nội bộ.

## 9. ✅ Web `LiveMapPage` (`/start-trip`) đã nối API thật (R2-1, 07/2026)

- **Trạng thái cũ:** `apps/web/src/pages/LiveMapPage.tsx` chỉ chạy `useMockGpsSender` — mô phỏng vị trí phía client theo `MOCK_ROUTE` cố định. Không gọi `POST /api/trips/start`, không kết nối `/realtime` WebSocket thật, không gọi `POST /api/trips/:id/end`. Nút bấm ghi rõ "Bắt đầu chuyến đi (mock)".
- **Quyết định phạm vi (R2-1):** web dashboard chỉ **xem** trip đang active, không có nút bắt đầu/kết thúc — vì bắt đầu/kết thúc trip yêu cầu xác thực khuôn mặt (FR-BIOMETRIC-01), một luồng chỉ có trên mobile theo đúng thiết kế sản phẩm (không có webcam-verify trên web). Trip thật luôn được bắt đầu từ `apps/mobile`'s Trip Cockpit.
- **Đã làm:** xoá `useMockGpsSender.ts`/`mocks/route.ts` (dead code sau khi đổi). Thêm `apps/web/src/services/useLiveTrip.ts` — poll `GET /trips` mỗi 5 giây để tìm trip `active` của user hiện tại; khi có, kết nối `/realtime` WebSocket thật, gửi `join:trip` (nay đã tài liệu hoá ở `docs/API_CONTRACT.md` §6), nhận `location:broadcast` thật để cập nhật vị trí/tốc độ/trail (giới hạn 500 điểm gần nhất, khớp `apps/mobile`); khi trip không còn active (kết thúc), tự ngắt kết nối và về empty state. `LiveMapPage.tsx` hiển thị bản đồ live khi có trip, hoặc empty state "Chưa có chuyến đi nào đang diễn ra" khi không. Sidebar/Dashboard đổi nhãn "Bắt đầu chuyến đi" → "Vị trí trực tiếp" cho khớp hành vi mới.
- **Verify đã chạy:** `pnpm build` (shared-types + web) sạch, `oxlint` sạch, Playwright E2E suite pass. Verify trực quan thật trong browser: tạo trip thật qua API (giả lập mobile) → gửi GPS thật qua `/realtime` WebSocket → `LiveMapPage` (đã đăng nhập, không reload) tự động hiện marker + tốc độ đúng theo thời gian thực (screenshot xác nhận) → kết thúc trip qua API → trang tự quay lại empty state trong vòng 5 giây, không cần reload. Không có lỗi console.
- **⚠️ Giới hạn của verify trên — CHƯA xác nhận với vị trí GPS thật:** toạ độ dùng để verify (`10.7769, 106.7009`...) là số **tự gõ tay vào script test** (`socket.io-client` giả lập mobile gửi `location:update`), không phải đọc từ Geolocation API hay thiết bị GPS thật nào — môi trường dev hiện tại không có điện thoại/emulator thật để chạy `apps/mobile`. Cơ chế (WebSocket pipeline, hiển thị live) đã verify đúng, nhưng **chưa từng verify với toạ độ GPS thật của một thiết bị thật** chạy hết đường link mobile (geolocator đọc GPS thật) → backend → web. **Cần làm trước khi coi R2-1 verify đầy đủ:** chạy `apps/mobile` thật trên thiết bị/emulator có vị trí thật, bắt đầu trip từ mobile, xác nhận toạ độ hiện đúng và khớp trên `LiveMapPage`. Việc này cần thiết bị Android/iOS thật hoặc emulator có mock location API đúng toạ độ thật — chưa có trong môi trường hiện tại, để lại như một việc riêng (không tự động biến mất, ghi nhận rõ ở đây để không bị quên).
- **Ảnh hưởng E2E suite cũ:** không đổi hành vi test — `golden-path.spec.ts` vẫn gọi thẳng REST/WebSocket cho bắt đầu/kết thúc trip (đúng lý do sản phẩm ở trên, không phải hạn chế kỹ thuật của `LiveMapPage` nữa), comment đầu file đã cập nhật để phản ánh đúng lý do.

## 10. Các Open Item nhỏ khác còn treo trong docs gốc

- `OQ-005` (tile provider) và biometric provider — đã liệt kê ở mục 3/4, không lặp lại.
- Exclusion constraint `btree_gist` (dùng ở `vehicle_authorizations`, step `1.5`) mới xác nhận hoạt động trên Postgres local — chưa xác nhận khả dụng trên hosting production cuối cùng (phụ thuộc mục 6, hosting provider chưa chốt).
- Không có mục nào khác còn mở trong `docs/01_OPEN_QUESTIONS.md` sau D0.7 ngoài các mục đã liệt kê ở trên.

---

**Không có mục nào trong tài liệu này được triển khai — đây thuần tuý là ghi nhận hiện trạng để lên kế hoạch sau MVP.**
