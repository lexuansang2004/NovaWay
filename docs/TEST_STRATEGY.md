# NovaWay — Test Strategy v0.1

> Step D0.2. Chiến lược test cho MVP; test case cụ thể (file, tool version) sẽ được viết ở từng micro-step theo `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`, mỗi step tự có "Test gate" riêng. Tài liệu này định hình **loại test nào chạy ở đâu** và cách test những tình huống khó tái hiện ngoài đời thật.

## 1. Test Levels

| Level | Phạm vi | Công cụ đề xuất | Chạy khi nào |
|---|---|---|---|
| Unit | Service/logic đơn lẻ (vd. Vehicle Mismatch rule, batch validation, idempotency check, route geometry) | Jest (NestJS), Vitest (`apps/web`, từ R4-3 07/2026), Flutter test | Mỗi PR |
| Integration | API endpoint + database thật (test DB), WebSocket gateway | Jest + Supertest, NestJS Testing Module, PostgreSQL test container | Mỗi PR liên quan backend |
| E2E | Luồng người dùng đầu-cuối: đăng nhập → chọn xe → bắt đầu chuyến đi → nhận vị trí trên dashboard → kết thúc chuyến đi | Playwright/Cypress (web), Flutter integration test (mobile) | Trước khi merge vào `develop`, và trên CI (`9.2 chore/ci-cd-pipeline`) |
| Simulator-based | Mất mạng, thermal/low-light, mock GPS route, nhiều client reconnect đồng thời | Developer Mode/Simulator nội bộ (FR-DEVMODE) | Mỗi khi động tới offline sync, realtime, hoặc AR fallback |
| Manual/exploratory | UX cảnh báo khi đang lái, cảm giác driver-friendly overlay | Test thủ công trên thiết bị thật/emulator | Trước khi release milestone |

## 2. Coverage by Feature Area

### 2.1. Auth (FR-AUTH)

- Unit: hash password, validate JWT, guard reject không token.
- Integration: register → login → me trả đúng user; login sai password bị từ chối.

### 2.2. Vehicle Management (FR-VEHICLE)

- Integration: User B không thể sửa/xoá xe của User A (AC-VEHICLE-01).
- Integration: không bắt đầu được trip nếu chưa có xe active (AC-VEHICLE-02).

### 2.2a. Vehicle Authorization (FR-AUTHZ)

- Integration: chủ xe tạo uỷ quyền → borrower thấy xe trong `GET /api/authorizations/me` trong đúng thời hạn (AC-AUTHZ-01).
- Integration: uỷ quyền hết hạn → borrower bị chặn khi cố bắt đầu chuyến đi mới (AC-AUTHZ-02).
- Integration: thu hồi uỷ quyền → borrower bị chặn ngay ở chuyến đi mới, nhưng chuyến đang active (nếu có) không bị ngắt đột ngột (Edge Case §2.1).
- Integration: chủ xe dùng xe của chính mình không cần bản ghi uỷ quyền (AC-AUTHZ-04).
- Integration: không cho tạo 2 uỷ quyền chồng thời gian cho cùng 1 xe với 2 borrower khác nhau.

### 2.2b. Biometric Vehicle Binding (FR-BIOMETRIC)

- Integration: user có quyền (owner/borrower hiệu lực) xác thực thành công → nhận `verification_id` hợp lệ để dùng cho `trips/start` (AC-BIOMETRIC-01).
- Integration: user không có quyền bị chặn ở bước kiểm tra quyền, không gọi tới dịch vụ xác thực khuôn mặt (AC-BIOMETRIC-02).
- Integration: xác thực thất bại → không thể bắt đầu chuyến đi; giới hạn số lần thử lại (AC-BIOMETRIC-03).
- Integration/Manual: kiểm tra dữ liệu lưu trong `biometric_verifications` sau khi xác thực — xác nhận không có trường/nơi nào lưu ảnh thô (AC-BIOMETRIC-04).
- Integration: `verification_id` quá cũ (vượt ngưỡng thời gian) bị từ chối khi gọi `trips/start`, yêu cầu xác thực lại.
- Manual: giả lập dịch vụ xác thực bên thứ ba lỗi/timeout → xác nhận hành vi fallback (chặn rõ ràng, không crash, không treo UI).

### 2.3. Trip Lifecycle & Consent (FR-TRIP)

- Integration: `start` bị từ chối nếu thiếu `consent`, thiếu xe active, hoặc thiếu/không hợp lệ `verification_id`.
- Integration: `end` dừng nhận GPS event mới cho `trip_id` đó.
- E2E: toàn bộ luồng chọn xe → xác thực khuôn mặt → bắt đầu → di chuyển (mock) → kết thúc → thấy trong danh sách trip.
- E2E (borrower): luồng mượn xe đầy đủ — chủ xe cấp quyền → borrower đăng nhập, thấy xe được uỷ quyền, xác thực, chạy chuyến đi trong thời hạn.

### 2.4. Realtime Location (FR-REALTIME)

- Integration: gửi GPS hợp lệ → dashboard client (test socket) nhận được broadcast trong ngưỡng thời gian kỳ vọng.
- Integration: payload sai (toạ độ ngoài phạm vi) bị từ chối, không broadcast.
- Simulator: ngắt kết nối nhiều client cùng lúc → xác nhận mỗi client có delay reconnect khác nhau (kiểm tra jitter bằng cách log timestamp reconnect).

### 2.5. Offline Sync (FR-SYNC)

- Unit: logic chunk queue > 500 events thành nhiều batch.
- Integration: gửi lại cùng `client_event_id` → không tạo bản ghi trùng, `duplicate_count` tăng đúng.
- Integration: batch có event lỗi trộn lẫn event hợp lệ → response liệt kê đúng `failed_events` kèm `error_code`.
- Simulator: mobile giả lập mất mạng giữa chuyến đi → có mạng lại → xác nhận toàn bộ queue được đồng bộ, không mất event (AC-SYNC-01, AC-SYNC-02).

### 2.6. Vehicle Mismatch Detection (FR-MISMATCH)

- Unit: rule tính toán ngưỡng tốc độ/thời gian sinh warning.
- Integration: mock tốc độ vượt ngưỡng liên tục 3 phút (theo mock ở micro-step 6.1) → warning được tạo đúng 1 lần, không lặp lại lạm phát.
- Integration: nội dung warning không chứa từ bị cấm (test bằng danh sách từ khoá cấm chạy qua toàn bộ string cảnh báo).

### 2.7. Driver-friendly Warning UI (FR-WARNUI)

- E2E/manual: overlay xuất hiện, xác nhận bằng 1 tap đóng đúng; không phản hồi thì tự ẩn sau 10 giây (đo bằng timer trong test, không phải chờ tay).
- Manual: overlay không che bản đồ quá diện tích quy định (kiểm tra bằng thiết kế/QA visual).

### 2.8. AR Lite / Terrain Warning (FR-AR)

- Simulator: bật thermal state cao → xác nhận chuyển fallback (không mở camera), overlay cảnh báo trên map vẫn hoạt động.
- Simulator: bật low-light state → hành vi tương tự.
- Integration: app không crash khi camera permission bị từ chối hoặc camera không khả dụng.

### 2.9. Mobile Background Location (FR-BGLOC)

- Manual (Android thật/emulator): khoá màn hình khi trip active → notification foreground service xuất hiện, trip vẫn tiếp tục ghi.
- Manual (iOS thật/simulator giới hạn theo khả năng simulator): xác nhận luồng xin quyền background/always hoạt động đúng, có fallback khi từ chối.

### 2.10. Data Retention (FR-RETENTION)

- Integration: chạy cleanup job trên dữ liệu test có `received_at` > 30 ngày → các dòng đó bị xoá, `trip_logs` liên quan không bị ảnh hưởng.
- Unit: logic xác định partition/cleanup range đúng biên giới ngày.

**✅ Bổ sung (step `9.3 fix/raw-gps-partition-availability`, 08/2026) — partition-boundary regression coverage là một gate CI đã commit, không chỉ lệnh chạy tay:** phát hiện thật (không phải giả định) qua CI của PR #73 — `raw_gps_events` chỉ có đúng một partition tĩnh từ migration gốc (`2026-07-01`→`2026-08-01`), không có cơ chế tạo partition tháng kế tiếp, khiến mọi insert từ 01/08/2026 trở đi lỗi `no partition of relation "raw_gps_events" found for row` (xem `docs/REVIEW_NOTES.md` §17). Test riêng cho việc **partition có tồn tại trước khi insert cần nó** (khác câu hỏi "khi nào cleanup job chạy" ở hai dòng trên):

- **Integration, thật, đã commit — không phải hướng dẫn chạy tay:** `apps/backend/scripts/verify-raw-gps-partitions.js`, chạy qua lệnh `pnpm test:partition-integration` (khai báo trong `apps/backend/package.json`). Là script Node độc lập (dùng `pg` trực tiếp), không phải `*.spec.ts` — vì Jest mặc định (`rootDir: "src"`, chạy trong job `node` của CI) không có Postgres thật; gộp nó vào đó sẽ làm vỡ job đó. Script này chỉ chạy trong job `e2e` của `.github/workflows/ci.yml`, ngay sau bước "Run backend migrations" và trước "Start backend" — nếu regression, job fail tại đây thay vì lộ ra dưới dạng lỗi E2E khó hiểu ở bước sau.
- Script xác nhận đủ 6 kịch bản: (a) gọi routine hai lần liên tiếp — idempotent, không lỗi, không tạo partition trùng; (b) sau khi gọi không truyền `reference_date`, partition tháng UTC hiện tại **và** kế tiếp đều tồn tại; (c) truyền một `reference_date` tương lai cố định (`2027-01-15`) — tạo đúng partition tháng đó (test được biên giới tháng một cách xác định, không phải chờ ngày thật trôi qua); (d) gọi đồng thời từ 8 kết nối Postgres riêng biệt — không lỗi, không tạo partition trùng (advisory lock); (e) đặt session `TIME ZONE` khác UTC (`Asia/Ho_Chi_Minh`) rồi gọi routine — biên partition vẫn đúng UTC midnight; (f) trong cùng transaction (rollback ở cuối, không để lại dữ liệu), seed tối thiểu FK (`users`→`vehicles`→`biometric_verifications`→`trips`) rồi insert `raw_gps_events` đúng biên dưới và biên tháng kế tiếp — `tableoid::regclass` phải đúng partition con mong đợi.
- Migration test: chạy migration từ **database hoàn toàn mới** (không chỉ trên DB đã migrate sẵn cục bộ) để xác nhận routine mới tự chạy đúng ngay từ lần migrate đầu tiên — verify thủ công đã làm, chưa có gate CI riêng cho "fresh DB" ngoài việc job `e2e` vốn luôn tạo Postgres service container mới mỗi lần chạy (nên về bản chất mỗi lần CI chạy đã là "fresh DB").
- Unit (mock `DataSource`, `apps/backend/src/database/partition-maintenance/partition-maintenance.service.spec.ts`): (a) bootstrap thành công gọi routine 1 lần và lên lịch interval định kỳ; (b) bootstrap thất bại reject và **không** lên lịch interval; (c) lỗi ở lần gọi định kỳ (sau khi app đã chạy) chỉ log, không throw, không unhandled rejection, và không làm dừng các lần retry định kỳ tiếp theo; (d) `onApplicationShutdown` clear timer; (e) `unref()` được gọi trên timer định kỳ.
- **Ngoài phạm vi `9.3`** (chưa test, chưa implement): DROP partition cũ >30 ngày, dọn `gps_event_dedup` theo partition đã DROP — vẫn theo dõi riêng, chưa đóng, **không được coi là TTL/retention policy (FR-RETENTION-02) đã hoàn thành** chỉ vì partition availability đã fix.

### 2.11. Developer Mode / Simulator (FR-DEVMODE)

- Integration: nạp mock GPS route file → marker web di chuyển đúng theo route (đây chính là cơ chế dùng để test 2.4–2.9 ở trên, nên bản thân nó cần test trước).
- Integration: Developer Mode không truy cập được trên build gắn flag production.

## 3. CI/CD Gate (liên kết `9.2 chore/ci-cd-pipeline`)

- Mọi PR vào `develop` phải pass: lint, unit test, integration test.
- Merge vào `main` yêu cầu thêm: E2E suite pass trên môi trường staging.
- PR không được merge nếu bất kỳ test gate nào của micro-step liên quan chưa pass (theo cột "Test gate" trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`).

**Đã triển khai ở step `9.2` (07/2026):** `.github/workflows/ci.yml` — GitHub Actions chạy trên mọi PR vào `develop` và `main`, gồm lint + unit test + build cho backend/web/shared-types (pnpm workspace) và `flutter analyze`/`flutter test` cho mobile.

**Đã triển khai ở R1-3 (07/2026):** `apps/web/e2e/golden-path.spec.ts` (Playwright) — E2E suite thật cho luồng vàng đăng nhập → chọn xe → bắt đầu chuyến đi → thấy vị trí → kết thúc chuyến đi. Bắt đầu/gửi GPS/kết thúc chuyến đi gọi thẳng REST + WebSocket thật (cùng pipeline mobile dùng) thay vì qua UI `LiveMapPage` — không phải hạn chế của trang này, mà vì bắt đầu/kết thúc trip yêu cầu xác thực khuôn mặt (FR-BIOMETRIC-01), một luồng chỉ có trên mobile theo đúng thiết kế sản phẩm (xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §9). `LiveMapPage` (`/start-trip`, R2-1 07/2026) chỉ **xem** trip đang active qua `/realtime` WebSocket thật, không có nút bắt đầu/kết thúc. Suite verify kết quả hiện đúng trên Analytics (`/trip-history`, UI thật). Đã wire vào CI (`e2e` job trong `.github/workflows/ci.yml`, chạy trên PostgreSQL/PostGIS dựng ngay trong runner).

**⏳ Đang xử lý (step `9.4`, `fix/e2e-golden-path-stability`, 08/2026) — khắc phục điểm yếu đồng bộ hoá fixed-sleep trong `golden-path.spec.ts`:** phát hiện ban đầu khi chạy CI cho PR #73 (baseline tài liệu AR Terrain, docs-only). `distance_km = 0` xuất hiện lặp lại trên cả 3 lần chạy CI của `e2e` job; locator trùng lặp (`getByText('Đang hoạt động')`, strict-mode violation — khớp cả badge xe active lẫn đoạn mô tả tĩnh của trang `/vehicles` vốn cũng chứa cụm từ đó dạng chữ thường) chỉ xuất hiện ở một lần thử (attempt) Playwright. **Đính chính chẩn đoán:** nguyên nhân chính **đã xác nhận** cho các lần fail đó là `raw_gps_events` thiếu partition cho tháng hiện tại/kế tiếp (xem `docs/REVIEW_NOTES.md` §17, step `9.3`, đã merge `develop` qua PR #74) — insert luôn thất bại ngay lập tức ở tầng database. Race condition fixed-sleep mô tả dưới đây **là một điểm yếu đồng bộ hoá/observability có thật** trong test, nhưng **không phải là nguyên nhân độc lập đã được xác nhận** của các lần fail CI lịch sử đó, vì thiếu partition một mình đã đủ giải thích 100%. Mô tả điểm yếu: test gửi 2 sự kiện `location:update` qua WebSocket, mỗi lần chỉ `setTimeout` cố định 300ms rồi coi như đã ghi xong, không lắng nghe `location:broadcast`/`location:rejected` — trong khi `RealtimeGateway.handleLocationUpdate` (`apps/backend/src/realtime/realtime.gateway.ts`) chỉ emit `location:broadcast` **sau khi** `GpsEventsService.recordEvent` (ghi `raw_gps_events`) đã resolve; và `TripsService.buildTripLog` (`apps/backend/src/trips/trips.service.ts`) tính `distance_km` bằng `ST_MakeLine(...) FROM raw_gps_events WHERE trip_id = ...` — tính tại đúng thời điểm gọi `end`, dựa trên các dòng đã commit vào thời điểm truy vấn, không chờ event nào đang inflight — nếu event thứ hai chưa kịp persist trước khi 300ms trôi qua (tải CI runner biến thiên), `end` chỉ thấy 0–1 điểm và `distance_km` ra `0`. Đây vẫn là một điểm yếu thật cần sửa cho đúng nguyên tắc test, độc lập với sự cố partition đã fix. Fix (step `9.4`, xem `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`): đổi test sang chờ `location:broadcast` (hoặc fail sớm nếu nhận `location:rejected`) cho từng event trước khi đóng socket, và đổi locator sang `page.getByText('Đang hoạt động', { exact: true })`. Không đổi hành vi `TripsService`/`RealtimeGateway`. Theo dõi riêng, không gộp với sự cố `E2E on staging` (scheduled workflow, staging backend-health timeout — nguyên nhân khác, không liên quan tới điểm yếu này).

**Đã triển khai ở R1-2/R1-3 follow-up (07/2026) — E2E-on-staging gate ĐẦY ĐỦ:** `apps/web` đã deploy thật lên Vercel (`docs/deployment/VERCEL_WEB_CHECKLIST.md`), `WEB_ORIGIN` trên backend Railway đã trỏ đúng domain đó (CORS xác nhận hoạt động qua trình duyệt thật). Suite `golden-path.spec.ts` đã chạy **pass thật nhắm vào staging** (`E2E_WEB_BASE_URL`/`E2E_API_BASE_URL`/`E2E_WS_BASE_URL` trỏ vào Vercel + Railway) — đúng yêu cầu gốc "E2E suite pass trên môi trường staging" ở mục 3 phía trên. Việc còn lại: chạy tự động bước này (chưa wire vào CI — CI job `e2e` hiện chỉ chạy nhắm Postgres/backend dựng trong runner, không nhắm staging thật; chạy nhắm staging vẫn đang là thao tác thủ công).

**Chưa triển khai (⚠️ đoạn lịch sử — mục (1) đã lỗi thời, xem đính chính 08/2026 ngay dưới):** ~~(1) wire suite này vào CI (`.github/workflows/ci.yml` chưa chạy E2E — cần Postgres service container + backend/web boot trong CI, việc riêng ngoài phạm vi R1-3)~~; (2) chạy suite nhắm vào domain staging thật (`E2E_API_BASE_URL`/`E2E_WEB_BASE_URL`/`E2E_WS_BASE_URL` đã hỗ trợ qua env var, nhưng chưa từng chạy thật với staging — cần web đã deploy, xem `docs/deployment/RAILWAY_DASHBOARD_CHECKLIST.md` §7); do đó yêu cầu "E2E suite pass trên môi trường staging" cho merge vào `main` **vẫn chưa** là gate thật, chỉ mới có suite chạy được local.

**Đính chính (08/2026, phát hiện khi làm step `9.4`):** mục (1) ở đoạn ngay trên đã lỗi thời và mâu thuẫn với đoạn "Đã triển khai ở R1-3" phía trên — `.github/workflows/ci.yml` **đã** chạy job `e2e` từ R1-3 (xác nhận lại thật qua CI chạy trên PR #73, 08/2026: job `E2E (Playwright, golden path)` chạy trên mọi PR, dựng Postgres/PostGIS ngay trong runner). Giữ nguyên câu chữ gốc ở trên để không mất lịch sử, nhưng mục (1) không còn phản ánh đúng trạng thái CI hiện tại — chỉ mục (2) (staging thật) vẫn còn đúng tính tới thời điểm này.

## 4. Out of Scope for MVP Testing

- Load test quy mô lớn (nghìn client đồng thời) — chỉ test số lượng nhỏ đủ để xác nhận cơ chế backoff/jitter hoạt động đúng logic, không phải benchmark hiệu năng thật.
- AR Terrain Mesh là R&D có test plan riêng, không làm required CI của sản phẩm chính thành bằng chứng AR. Cập nhật Windows-first ngày 2026-09-04 (`docs/REVIEW_NOTES.md` §20, baseline §4/§11): **`8.1a` Windows Editor** kiểm tra Student activation, import/compile, Play Mode ≥60 giây và đóng/mở lại scene không-AR; **`8.1b` Mac/Xcode/iPhone 11 Pro** kiểm tra build/ký/cài/chạy ≥60 giây sau khi có Mac. Hai gate độc lập; `8.2` chỉ bắt đầu sau `8.1b` PASS và iPhone 16 Pro có mặt, smoke/capability check thật. iPhone 16 Pro kiểm chứng mesh/georeference/performance; iPhone 11 Pro chỉ smoke và compatibility `8.6`. Test PLY/transform/RMSE bằng fixture có thể tự động hoá trên Windows trong micro-step được duyệt riêng, nhưng không thay LiDAR/RTK/FPS/pin/nhiệt thật, không đưa vào scope `8.1a`. Required PR checks vẫn bắt buộc trước merge. Xem `docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md`.
- Penetration testing/security audit toàn diện — chỉ có test baseline (payload validation, auth guard, rate limit) ở MVP.
