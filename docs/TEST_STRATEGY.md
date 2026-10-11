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

### 2.12. Web Account & Responsive (FR-WEBSESSION/WEBPROFILE/WEBPRIVACY/WEBSETTINGS/WEBHELP, NFR-RWD) — bổ sung `WEB-00`, review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu

> Bổ sung 10/2026 sau Baseline v1.0. **Ngoài phần `WEB-01` ghi ở cuối mục này, chưa có test nào dưới đây được viết hay chạy — NOT_RUN.** Ma trận viewport (`WEB-V*`), route × trạng thái (`WEB-T*`), phương pháp đo layout, dữ liệu test và mẫu evidence: `docs/web/WEB_ACCOUNT_RWD_SPEC.md` §5–§7; traceability requirement → AC → test → micro-step: cùng tài liệu §8.

- Hiện trạng cần biết: Playwright chỉ cấu hình project `Desktop Chrome` (`apps/web/playwright.config.ts`); chưa có test viewport hay route tài khoản. Golden path E2E hiện có **không** được dùng làm bằng chứng responsive.
- Unit/component (Vitest, `apps/web`): state machine kiểm tra phiên — `401` vs lỗi khác, timeout 15 giây bằng fake timer, retry trùng, "Đăng nhập lại" (AC-WEBSESSION-01→05, AC-WEBSESSION-07).
- Tính hợp lệ của kết quả kiểm tra phiên (AC-WEBSESSION-08/09). Assertion phải nằm ở tầng service + `sessionStorage` + AuthContext/route, **không chỉ DOM**:
  - A `/me` đang chờ → đăng nhập B thành công → A trả `401`: token B còn nguyên, user B, route không đổi.
  - Cùng tình huống, A trả `200`: user vẫn là B, không điều hướng, không có dữ liệu A.
  - Response cũ về sau logout, unmount, timeout hoặc retry mới: không có side effect.
- Adapter preference — mỗi ca một test riêng: namespace theo `user.id`, `version`, enum; (a) đọc lỗi khi khởi tạo → "Theo hệ thống" (AC-WEBSETTINGS-04); (b) ghi lỗi/quota sau khi chọn → giữ lựa chọn trong phiên (AC-WEBSETTINGS-07); (c) giá trị hỏng/`version` lạ → "Theo hệ thống" (AC-WEBSETTINGS-08). Test cô lập A/B chỉ kiểm app không áp dụng lựa chọn của A cho B; không coi đó là kiểm thử kiểm soát truy cập.
- `WEB-01` phải **tái hiện bằng test UI** việc kẹt màn hình chờ khi `/me` lỗi mạng/`500` trước khi sửa (hiện mới là suy luận tĩnh từ source).
- E2E/Playwright mục tiêu theo từng PR (không dồn tới `WEB-13`): route tài khoản, drawer/sidebar quanh 1024 CSS px, reflow 320, keyboard/focus, accessibility tree, `reducedMotion` emulation, logout/login A→B và Browser Back.
- Fixture vs backend thật: trạng thái lỗi/layout hiếm có thể dùng response fixture nhưng evidence phải ghi **fixture UI**; giữ ít nhất một lượt regression với backend thật cho auth + vehicle + quan sát trip + analytics.
- Content review (không phải test tự động): Privacy Content Gate cho `/account/privacy` (AC-WEBPRIVACY-01/02/05) và đối chiếu nội dung trợ giúp với route/flow thật (AC-WEBHELP-01→04).
- Hai phạm vi nghiệm thu cho các step RWD (spec §4.7):
  - **Gate merge Windows** gồm test mục tiêu C/F/B/Z bằng Chromium/Firefox/emulation, regression và required checks; không cần Mac/iPhone/Android. Chưa đạt thì không merge.
  - **Gate công bố hỗ trợ thiết bị** gồm AC-RWD-11, phần bàn phím ảo thật của AC-RWD-06, Android Chrome (`WEB-VH1`) và Safari iPhone (`WEB-VH2`) thật. Chưa chạy thì ghi NOT_RUN theo từng thiết bị: không tính PASS, không chặn merge, chặn công bố hỗ trợ.
  - Emulation/WebKit automation không thay thế gate thiết bị. `WEB-13` báo cáo kết quả theo từng phạm vi, không dùng một COMPLETED chung.
- Gate chung của mỗi micro-step `WEB-01`…`WEB-12`: `npm run lint`, `npm run test`, `npm run build` (AGENTS.md) + test mục tiêu của step + required PR checks. Mobile CI vẫn phải xanh nếu là required check, nhưng kết quả web không thay cho gate Flutter.
- **Cập nhật `WEB-01` (10/2026, chờ re-review độc lập — `docs/REVIEW_NOTES.md` §40–§41):**
  - Tầng service/storage/state: `apps/web/src/services/authSession.spec.ts` và `authService.spec.ts` (Vitest, môi trường `node`). `authService` và `apiClient` chạy thật; chỉ `fetch` và storage bị stub. `fetch` giả cố ý không tuân theo abort, để response muộn được kiểm như một ca riêng.
  - Tầng UI: `apps/web/e2e/session-check.fixture.spec.ts` (Playwright, **fixture UI** cho `/auth/me` và `/auth/login`). `apps/web` không có jsdom/testing-library và `WEB-01` không thêm dependency, nên không có component test bằng DOM giả.
  - Vòng đời hook thật (thêm sau review vòng 1, R01): `apps/web/e2e/session-check.hook.spec.ts` mount và unmount `useSessionCheck` thật qua `apps/web/e2e/harness/sessionCheckHarness.tsx`, gồm StrictMode và mount mới tiếp quản. Test tầng store không thay được phần này: store không biết hook đang giữ gì. Harness cần Vite dev server, nên spec tự bỏ qua khi `E2E_WEB_BASE_URL` được đặt (workflow staging).
  - Backend thật: `apps/web/e2e/session-auth-regression.spec.ts`, chạy cùng golden path trong job `e2e`.
  - Ràng buộc khi chạy: backend giới hạn đăng ký/đăng nhập 5 lần/phút/IP và một lượt E2E đầy đủ dùng 4 lần đăng ký. Không chạy hai lượt đầy đủ trong cùng một phút. Biên còn lại là một request: đủ để retry một test đăng ký một tài khoản, **không** đủ để retry `session-auth-regression` (đăng ký hai tài khoản) — xem `docs/REVIEW_NOTES.md` §41.4.

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
- AR Terrain Mesh là R&D có test plan riêng, không làm required CI của sản phẩm chính thành bằng chứng AR. Cập nhật thiết bị ngày 2026-09-22 (`docs/REVIEW_NOTES.md` §25, baseline §4/§11): **`8.1a` Windows Editor** đã hoàn tất; **`8.1b` MacBook Air M3/Xcode 16.4/iPhone 11 Pro iOS 18.3.1** vẫn kiểm tra build/ký/cài/chạy ≥60 giây và chưa PASS khi mới tải tool. Hai gate độc lập; `8.2` chỉ bắt đầu sau `8.1b` PASS và thiết bị LiDAR thật có mặt, smoke/capability check thật. iPhone 11 Pro chỉ smoke/compatibility và về sau có thể test Drive Mode từ catalog quét sẵn; không thay LiDAR. Test PLY/transform/RMSE hoặc Drive Mode bằng fixture phải gắn nhãn fixture và nằm trong micro-step được duyệt riêng. Test hiển thị tương lai phải phủ TPP mặc định, FPP fallback về TPP, không có Second-Person runtime, không lặp cảnh báo và log lead time. Required PR checks vẫn bắt buộc trước merge. Xem handoff và addendum Survey/Drive.
- Penetration testing/security audit toàn diện — chỉ có test baseline (payload validation, auth guard, rate limit) ở MVP.
