# NovaWay — Sprint R7: Performance & Reliability Hardening

> Sprint thứ bảy, sau `Sprint R6: Abuse Protection & Response Hardening` (`docs/roadmap/SPRINT_R6_SECURITY_HARDENING.md`, đóng 5/5 mục 28/07/2026). R6 đã khoá throttling cho mọi endpoint mutating còn thiếu và thêm security header chuẩn. Ba sprint liên tiếp (R4/R5/R6) đã dọn gần hết bề mặt "bug thật trong code tự viết" theo hướng UX/bảo mật/test coverage — audit lần này đi theo hai hướng chưa từng đụng: **hiệu năng đo được thật** (không suy đoán) và **khả năng phục hồi khi có lỗi runtime không lường trước** (error boundary, graceful shutdown). Backlog ngắn hơn 3 sprint trước — đúng thực tế, vì phần lớn "quả treo thấp" đã được dọn, không phải vì audit làm hời hợt hơn.

## 1. Sprint Goal

Sửa các phát hiện thật về hiệu năng (đo bằng HTTP request thật, không suy đoán từ đọc code) và khả năng phục hồi runtime (verify bằng repro thật, không chỉ trích dẫn best practice suông). Không thêm tính năng sản phẩm mới.

## 2. Phương pháp audit (đã chạy thật trước khi viết backlog này, 28/07/2026)

- `pnpm audit --json` — vẫn đúng **4 advisory** như cuối R6, không có gì mới, không mục backlog nào từ hướng dependency.
- `pnpm outdated -r` — không có bản vá bảo mật nào bị bỏ lỡ; các bản major còn lại đều đã có quyết định từ R4-R6, không lặp lại.
- Grep `TODO`/`FIXME`/`console.log`/`debugPrint` trên code đã commit — **sạch hoàn toàn**, giống R6.
- `npx jest --coverage` (backend) + `flutter test --coverage` (mobile, **lần đầu tiên chạy** — R4-R6 chưa từng làm) — phần còn lại thấp coverage đều là controller/DTO/migration (đã loại trừ nhiều lần từ R5) hoặc đã có quyết định ghi sẵn (mobile's `SocketIoRealtimeClient`, R4-5).
- Rà toàn bộ backend service tìm pattern `for (...) { await ... }` (vòng lặp tuần tự có I/O) — chỉ đúng **1 chỗ thật** trong toàn bộ codebase.
- Đo trực tiếp bằng HTTP thật: `POST /api/trips/sync` với batch 500 event (đúng giới hạn tối đa theo `API_CONTRACT.md` §7), và `GET /api/authorizations/me` với 10 uỷ quyền thật.
- Repro trực tiếp trên browser thật: buộc một component throw lỗi (rồi revert ngay) để xác nhận hành vi thật của app khi có lỗi runtime không lường trước, không chỉ suy đoán từ việc "không thấy `ErrorBoundary` trong code".
- Grep Dart force-unwrap (`!`) ngoài test trên toàn `apps/mobile/lib` — chỉ 1 chỗ, đã đọc và xác nhận được guard đúng cách (không phải bug).

## 3. Ngoài phạm vi (Out of Scope) — kèm lý do đã kiểm chứng

- **`GET /api/authorizations/me` có pattern N+1** (`findAllForBorrower` — 2 query/uỷ quyền qua `Promise.all`) — **đã đo, không phải vấn đề thật**. Tạo 10 uỷ quyền thật (owner + borrower thật, không mock), đo 3 lần: `0.070s / 0.012s / 0.009s`. Khác `/trips/sync`'s vòng lặp: pattern này **song song hoá** (`Promise.all`, không phải `await` tuần tự) và N thực tế (số xe một người mượn) luôn nhỏ. Ghi lại ở đây để lần audit sau khỏi đo lại từ đầu.
- **`expires_at` trong quá khứ khi tạo uỷ quyền** (`CreateAuthorizationDto` không có ràng buộc phải ở tương lai) — đã đọc `deriveEffectiveStatus()`: status luôn tính lại live từ `Date.now()` mỗi lần đọc (không cache), nên một uỷ quyền tạo với ngày quá khứ chỉ đơn giản hiện `expired` ngay lập tức ở mọi nơi — degrade an toàn, không phải lỗ hổng truy cập.
- **`speed_kmh` không có giới hạn trên** (chỉ `@Min(0)`) — không tìm được bằng chứng hậu quả thật (không crash, không hỏng dữ liệu; giá trị bất thường chỉ khiến `MismatchDetectionService` phát hiện đúng ý đồ "tốc độ không khớp loại xe khai báo"). Không đưa vào backlog vì chưa đo được rủi ro cụ thể.
- **Web bundle size** (`maplibre-gl` chunk ~1MB, cảnh báo `>500kB` lúc build) — **đã kiểm tra kỹ, không phải vấn đề thật**. Ban đầu nghi ngờ trang `/login` phải tải luôn cả chunk MapLibre, nhưng đo bằng network request thật trên bản production build: `/login` và `/dashboard` **không** tải chunk đó — `react-map-gl` tự có sẵn cơ chế `import()` động nội bộ (xác nhận bằng cách grep thấy `import(\`./maplibre-gl-*.js\`)` ngay trong bundle đã build), chỉ tải khi `<Map>` thực sự mount. Code-splitting đã đúng sẵn, không cần sửa.
- **`SocketIoRealtimeClient` (mobile) thiếu test cho `sendLocation`/`rejections`** — quyết định đã chốt từ R4-5 (không có seam để inject fake socket mà không refactor lớn), coverage report xác nhận đúng những dòng đó vẫn chưa test nhưng **không phải phát hiện mới**, không lặp lại quyết định.

## 4. Backlog

| # | Việc | Ưu tiên | Vì sao | Bằng chứng / Rủi ro |
|---|---|---|---|---|
| R7-1 ✅ | `POST /api/trips/sync` xử lý batch event tuần tự (`for` + `await` trong vòng lặp), mỗi event một transaction DB riêng | P1 | Đây là endpoint tồn tại **chính vì** kết nối không ổn định (rider offline, flush batch khi có mạng lại) — càng chậm thì càng dễ timeout đúng lúc cần nó nhất. Không phải suy đoán: đo trực tiếp bằng HTTP thật | `apps/backend/src/sync/sync.service.ts:51-82` gọi `GpsEventsService.recordEvent()` (`apps/backend/src/realtime/gps-events.service.ts:29`, mỗi lần mở 1 transaction riêng) bên trong `for (const rawEvent of dto.events)`. Quét toàn bộ `*.service.ts` xác nhận đây là **pattern tuần tự-có-I/O duy nhất** trong cả backend. **Đo thật trước fix** (backend + Postgres thật, 28/07/2026): batch 100 event → `0.499s`; batch 500 event (đúng max tài liệu) lần đầu → `3.277s`; batch 500 event **trùng lặp** (idempotency path) → `1.726s`. Khớp đúng chi phí ~5ms/event đã đo ở benchmark R1-6 (`docs/performance/GPS_EVENT_DEDUP_BENCHMARK.md`) — benchmark đó đo transaction đơn lẻ qua `/realtime`, chưa từng đo **toàn bộ endpoint `/trips/sync`** với batch lớn thật. **Quyết định hướng fix** (người dùng chọn, không tự quyết): giới hạn concurrency thay vì bulk insert — rủi ro correctness thấp hơn, không phải viết lại cơ chế dedup 2-bảng đã đúng/đã test. **Đã làm**: `EVENT_CONCURRENCY = 5` (`apps/backend/src/sync/sync.service.ts:17`, xử lý theo cụm `Promise.all`, giữ nguyên transaction/dedup logic từng event) — 5 vì pool Postgres mặc định (`app.module.ts`, không có `extra.max`) chỉ có 10 connection cho *cả process*, cần chừa nửa cho request khác. **Đo thật sau fix** (30/07/2026): batch 100 → `0.340s`; batch 500 → `0.643s` (nhanh **~5.1x**); batch 500 trùng lặp → `0.450s` (~3.8x). Đã kiểm tra thêm tình huống biên: 5 event cùng `client_event_id` trong cùng 1 request (cùng race trong 1 cụm `Promise.all`) → đúng 1 accepted, 4 duplicate, không double-accept (Postgres unique constraint xử lý đúng dưới tranh chấp đồng thời). Unit test mới xác nhận không bao giờ có quá 5 `recordEvent` cùng lúc (`apps/backend/src/sync/sync.service.spec.ts`) |
| R7-2 | Web app không có React Error Boundary nào — một lỗi runtime bất kỳ ở bất kỳ component nào làm **trắng toàn bộ trang**, không có UI phục hồi | P1 | Grep xác nhận `ErrorBoundary`/`componentDidCatch`/`getDerivedStateFromError` không xuất hiện ở đâu trong `apps/web/src`. Đã **repro thật** (không chỉ đọc code): buộc tạm `DashboardPage` throw lỗi rồi revert ngay — React tự in cảnh báo `"An error occurred in the <DashboardPage> component. Consider adding an error boundary..."`, kết quả thật trên browser là **trang đen hoàn toàn**, không có nút reload, không có thông báo lỗi nào cho người dùng | Không có file cụ thể (thiếu ở mức toàn app) — cần thêm 1 Error Boundary bọc `<App />` trong `apps/web/src/main.tsx`, hiện UI "đã có lỗi, tải lại trang" thay vì màn đen |
| R7-3 ✅ | Backend chưa gọi `app.enableShutdownHooks()` — lifecycle hook (đóng kết nối DB, v.v.) không chạy khi process nhận tín hiệu dừng | P2 | Railway (production host đã chốt ở R3-6) gửi `SIGTERM` cho container cũ mỗi lần redeploy. Không có `enableShutdownHooks()`, NestJS **không** chạy `onModuleDestroy`/tương đương trước khi thoát — kết nối Postgres/WebSocket đang mở có thể bị cắt đột ngột thay vì đóng sạch | Grep xác nhận: không có `enableShutdownHooks`/`SIGTERM`/`SIGINT` ở `main.ts` hay bất kỳ đâu trong `apps/backend/src`. **Đã làm**: thêm `app.enableShutdownHooks()` ở đầu `bootstrap()` (`apps/backend/src/main.ts:19`). **Verify thật** (30/07/2026): thử gửi `SIGINT` liên-process bằng `kill -SIGINT`/`taskkill` từ Git Bash/PowerShell — xác nhận đúng giới hạn đã ghi sẵn ở đây, Windows không xuyên được: `kill -SIGINT` từ MSYS không chạm được tới PID Windows thật (PID khác PID Node báo), còn `taskkill`/`Stop-Process -Force` chỉ terminate cứng (~SIGKILL), bỏ qua handler. Chuyển sang cách hợp lệ khác: boot backend thật, chờ `/health` trả 200, rồi gọi `process.emit('SIGINT')` **trong cùng process** — đây chính là lời gọi thật tới listener mà `enableShutdownHooks()` đăng ký qua `process.on('SIGINT', ...)`, không phải mock. Kết quả: log in ra đúng dòng đánh dấu tạm thời gắn vào `onModuleDestroy` của `AppModule` (revert ngay sau khi xác nhận), process tự thoát sạch, `/health` sau đó connection-refused. Xác nhận cơ chế hoạt động đúng như thiết kế |
| R7-4 ✅ | `AuthSession.isAuthenticated` (mobile) là dead code — khai báo nhưng không nơi nào gọi | P3 | Coverage `flutter test --coverage` (chạy lần đầu) chỉ ra `auth_session.dart` ở 67%; đọc ra đúng dòng thiếu là getter này. Grep xác nhận **0 call site** trong toàn bộ `apps/mobile/lib` lẫn `apps/mobile/test` | `apps/mobile/lib/session/auth_session.dart:10`. **Đã làm**: xoá — grep thêm cho `AuthSession.token != null` (chỗ có thể wire vào thay vì xoá) cũng ra **0 kết quả**, không có usage thật nào để gắn vào, nên xoá đúng theo hướng dẫn ở đây. `flutter analyze` sạch, `flutter test --coverage` 45/45 pass, `auth_session.dart` lên **100% coverage** |

**Đề xuất thứ tự làm:** R7-2 trước (P1, rủi ro UX nghiêm trọng nhất — một lỗi bất kỳ = mất trắng toàn app, fix nhỏ) → R7-1 (P1, cần quyết định hướng fix trước khi code, để dành đủ thời gian) → R7-3 (P2, một dòng nhưng cần verify cẩn thận) → R7-4 (P3, dọn dẹp nhanh cuối sprint).

## 5. Definition of Done cho Sprint R7

- [x] R7-1 hoàn tất — batch sync 500 event verify lại bằng chính phép đo ở mục 4, có cải thiện đo được so với baseline (3.277s → 0.643s, ~5.1x).
- [x] R7-2 hoàn tất — repro lại đúng kịch bản throw lỗi ở mục 4, xác nhận UI phục hồi hiện ra thay vì trang trắng.
- [x] `pnpm -r --if-present test` + `flutter test` + E2E golden path pass sau **mỗi** mục, không dồn cuối sprint.
- [x] `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` được cập nhật nếu phát hiện thêm gap tài liệu-thực tế trong lúc làm — không phát hiện gap mới nào trong R7, không cần sửa.
- [x] Không có tính năng sản phẩm mới nào được thêm ngoài danh sách ở mục 4.

**Ghi chú:** R7-3/R7-4 (P2/P3) không bắt buộc cho DoD tối thiểu nhưng đã làm xong trong cùng sprint.

## 6. Kết quả cuối sprint

4/4 mục backlog hoàn tất trong 28–30/07/2026, không mục nào phải kéo sang R8.

**Hiệu năng đo được (R7-1):**

| | Trước | Sau |
|---|---|---|
| `POST /api/trips/sync` batch 100 event | 0.499s | 0.340s |
| `POST /api/trips/sync` batch 500 event | 3.277s | **0.643s** (~5.1x) |
| `POST /api/trips/sync` batch 500 trùng lặp | 1.726s | 0.450s (~3.8x) |

**Khả năng phục hồi runtime đo được:** Error Boundary chặn đúng lỗi throw thật, hiện UI phục hồi thay vì trắng trang (R7-2). `enableShutdownHooks()` xác nhận đúng cơ chế thật qua `process.emit('SIGINT')` trực tiếp vào listener đã đăng ký, không mock (R7-3).

**Test coverage:** Backend giữ nguyên 165 test (27 suite, thêm 1 test concurrency cho R7-1). Mobile `auth_session.dart` từ 67% → 100% coverage sau khi xoá dead code (R7-4).
