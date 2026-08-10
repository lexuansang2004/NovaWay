# NovaWay — Sprint R8: Abuse Protection Gaps & Mobile Error-Path Coverage

> Sprint thứ tám, sau `Sprint R7: Performance & Reliability Hardening` (`docs/roadmap/SPRINT_R7_PERFORMANCE_AND_RELIABILITY.md`, đóng 4/4 mục 30/07/2026). R6 đã khoá throttling cho các endpoint auth/biometric/sync; audit lần này quét lại **toàn bộ** controller mutating (không chỉ nhóm đã sửa ở R6) và phát hiện một nhóm endpoint khác vẫn hoàn toàn chưa được khoá — cùng loại lỗ hổng, khác vị trí. Song song đó, coverage report chỉ ra một pattern lặp lại ở mobile: nhánh xử lý lỗi API (network fail, lỗi nghiệp vụ) tồn tại trong code nhưng chưa từng được test.

## 1. Sprint Goal

Khoá nốt các endpoint mutating còn thiếu rate limiting (đo được thật bằng HTTP, không suy đoán) và lấp các nhánh xử lý lỗi ở mobile chưa có test — ưu tiên đúng những gì đo/grep ra được, không mở rộng phạm vi thêm.

## 2. Phương pháp audit (chạy thật trước khi viết backlog này, 10/08/2026)

- `pnpm audit --json` — **26 advisory** (tăng mạnh so với 4 cuối R7, do CVE mới công bố trên chính các gói cũ, không phải do version bump nào của ta). Đã soi từng advisory theo đường dẫn phụ thuộc — xem mục 3.
- `pnpm outdated -r` + `flutter pub outdated` — không có bản vá bảo mật nào bị bỏ lỡ; toàn bộ là version drift thường (patch/minor), không có CVE gắn kèm.
- Grep `TODO`/`FIXME`/`console.log`/`debugPrint` trên `apps/**/*.{ts,tsx,dart}` đã commit — **sạch hoàn toàn**, giống R6/R7.
- Grep toàn bộ controller (`@Controller`, `@Post`, `@Patch`, `@Delete`, `@UseGuards`) để đối chiếu endpoint nào có `ThrottlerGuard`, endpoint nào không — phát hiện thật ở mục 4.
- Đo trực tiếp bằng HTTP thật: `POST /api/vehicles` × 15 lần liên tiếp trên backend + PostgreSQL thật (cổng 3001, tránh trùng cổng 3000 đang dùng cho phần mềm khác trên máy dev) — xác nhận **15/15 đều 201, không một lần 429**.
- `npx jest --coverage` (backend, 27 suite/165 test) + `flutter test --coverage` (mobile, 45/45 test) — soi kỹ từng file coverage thấp, đọc source để phân biệt "gap thật" và "đã loại trừ từ trước" (controller/DTO 0% do test qua E2E — quyết định cũ từ R5, không lặp lại).
- Grep Dart force-unwrap (`!`) ngoài test trên toàn `apps/mobile/lib` — vẫn chỉ 1 chỗ, vẫn đúng guard như R7 đã xác nhận, không phải phát hiện mới.

## 3. Ngoài phạm vi (Out of Scope) — kèm lý do đã kiểm chứng

- **`react-router` HIGH advisory ("RSC Mode CSRF Bypass")** — **đã kiểm tra, không áp dụng**. CVE này chỉ ảnh hưởng chế độ RSC (React Server Components). Grep `unstable_`/`createStaticRouter`/RSC API trong `apps/web/src` ra **0 kết quả** — app dùng thuần `<BrowserRouter>`/`<Routes>` phía client, không dùng RSC mode. Không có đường khai thác thật trong cách ta dùng thư viện.
- **`brace-expansion` HIGH advisory (qua `typeorm > glob`)** — **đã kiểm tra, không áp dụng**. `app.module.ts` dùng `autoLoadEntities: true` (đăng ký entity qua decorator của NestJS), không gọi `entities: [...]` theo glob pattern của TypeORM — nhánh code kéo theo `glob`/`brace-expansion` không được thực thi ở runtime của app. Advisory còn lại (qua `eslint`/`jest`/`@typescript-eslint`) là công cụ dev-time, không đóng gói vào runtime.
- **Toàn bộ advisory qua chuỗi `shadcn` devDependency** (`@modelcontextprotocol/sdk`, `@dotenvx/dotenvx`, `@tailwindcss/vite` → `undici`/`hono`/`fast-uri`/`ip-address`/`nanoid`, 19/26 advisory) — **quyết định giữ nguyên từ R5-3, xác nhận lại**: đây vẫn là CLI dev-tool (`npx shadcn add`), không đóng gói vào production bundle (đã đo bundle thật ở R5-3/R7). Số lượng advisory tăng do CVE mới công bố trên các gói cũ, không phải do ta bump version nào. Không hành động — nhắc lại để lần audit sau khỏi soát lại từ đầu.
- **`vehicles.service.ts` (`findById`, `create`) 0% branch một phần, `api_exception.dart` 33% coverage** — đã đọc source: đều là wrapper 1-dòng quanh repository/data class không có nhánh logic thật, cùng loại đã loại trừ từ R5 (test qua E2E, không cần unit test cho pass-through thuần).
- **`socket_io_realtime_client.dart` 67.6% coverage** — quyết định đã chốt từ R4-5 (không có seam để inject fake socket mà không refactor lớn), vẫn đúng, không lặp lại quyết định.
- **`pnpm outdated`/`flutter pub outdated`** (typeorm 0.3→1.1, eslint 8→10, jest 29→30, typescript→7.x, maplibre-gl 5→6...) — toàn bộ là major bump không gắn CVE. `maplibre-gl` 6.x đã biết là bẫy thật (R2-3, ghim 5.x). Các major khác cần audit riêng kiểu R5-4 (TDR đầy đủ) nếu làm — không đưa vào R8 vì không có lý do bảo mật/lỗi thật thúc ép ngay.

## 4. Backlog

| # | Việc | Ưu tiên | Vì sao | Bằng chứng / Rủi ro |
|---|---|---|---|---|
| R8-1 | `VehiclesController`, `TripsController`, `VehicleAuthorizationController` — toàn bộ endpoint mutating (`POST/PATCH/DELETE`) chỉ có `JwtAuthGuard`, không có `ThrottlerGuard` | P1 | Cùng lớp lỗ hổng R6-1 đã sửa cho auth/biometric (spam request không giới hạn), nhưng ở nhóm endpoint khác — token hợp lệ bị lộ hoặc user ác ý có thể spam tạo/sửa/xoá xe, bắt đầu/kết thúc chuyến đi, cấp/thu hồi uỷ quyền không giới hạn | `apps/backend/src/vehicles/vehicles.controller.ts`, `apps/backend/src/trips/trips.controller.ts`, `apps/backend/src/vehicle-authorization/vehicle-authorization.controller.ts` — grep xác nhận **0 `ThrottlerGuard`** ở cả 3. **Đo thật** (backend + PostgreSQL thật, 10/08/2026): `POST /api/vehicles` × 15 request liên tiếp cùng 1 JWT → **15/15 status 201, không một lần 429**. So sánh: cùng phép đo ở R6-1 cho `register` (không guard) cũng ra toàn 201; sau khi thêm `ThrottlerGuard` mới xuất hiện 429 |
| R8-2 | Nhánh xử lý lỗi API (`ApiException` + lỗi mạng chung) ở `VehicleListScreen` và `RegisterScreen` (mobile) chưa có test nào | P2 | Coverage `flutter test --coverage` chỉ thẳng: đây không phải code chết (dead code) như R7-4 — là logic xử lý lỗi thật, có UI thật (nút "Thử lại", thông báo lỗi cụ thể theo `error_code`), nhưng nếu ai đó sửa hỏng nhánh này (vd. đổi sai điều kiện `EMAIL_ALREADY_EXISTS`, quên gọi `setState`), không có test nào bắt được | `apps/mobile/lib/screens/vehicle_list_screen.dart:41-49,89-103` (toàn bộ `_LoadState.error` — catch `ApiException`, catch chung, UI hiện lỗi + nút thử lại) và `apps/mobile/lib/screens/register_screen.dart:82-91` (catch `ApiException` phân biệt `EMAIL_ALREADY_EXISTS` vs lỗi khác, catch chung) — coverage 0% cho toàn bộ các dòng này. Cả hai đều dùng `http.testing.MockClient` sẵn có trong repo (đã dùng ở R5-7), không cần seam mới |
| R8-3 | `TripCockpitScreen._handleConnectionState` — nhánh `RealtimeConnectionState.rejected` chưa có test | P3 | Coverage chỉ ra `connecting`/`connected`/`disconnected` đã có test qua `FakeRealtimeClient`, nhưng `rejected` (kết nối bị từ chối — token hết hạn/không hợp lệ giữa chừng chuyến đi) thì chưa. Đây là nhánh state-logic thuần (đổi `_phase`/`_message`), **không** đụng tới `maplibre_gl` MapController như phần vẽ trail/marker (phần đó vẫn giữ nguyên giới hạn đã biết) | `apps/mobile/lib/screens/trip_cockpit_screen.dart:125-127` (case `rejected`) + `apps/mobile/lib/services/realtime_client.dart` cho `RealtimeConnectionState` enum. `test/fakes/fake_realtime_client.dart` đã có `_stateController.add(...)` cho `connecting`/`connected`/`disconnected` (dòng 25-50) nhưng **không có** phương thức giả lập `rejected` — cần thêm 1 method nhỏ vào fake, cùng pattern với `disconnected` đã có, rồi 1 test mới |

**Đề xuất thứ tự làm:** R8-1 trước (P1, cùng mức độ rủi ro đã xử lý ở R6-1, fix nhỏ — thêm decorator, không đổi logic nghiệp vụ) → R8-2 (P2, 2 file test-only, dùng seam có sẵn) → R8-3 (P3, 1 file test-only, nhanh, có thể gộp chung PR với R8-2 nếu muốn vì cùng loại "test-only, mobile").

## 5. Definition of Done cho Sprint R8

- [ ] R8-1 hoàn tất — verify lại đúng phép đo ở mục 4 (15 request liên tiếp), xác nhận `429` xuất hiện sau khi thêm guard.
- [ ] R8-2 hoàn tất — coverage `vehicle_list_screen.dart` và `register_screen.dart` lên 100% (hoặc gần, nếu còn dòng không thể test hợp lý — ghi rõ lý do).
- [ ] `pnpm -r --if-present test` + `flutter test` + E2E golden path pass sau **mỗi** mục, không dồn cuối sprint.
- [ ] `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` được cập nhật nếu phát hiện thêm gap tài liệu-thực tế trong lúc làm.
- [ ] Không có tính năng sản phẩm mới nào được thêm ngoài danh sách ở mục 4.

**Ghi chú:** R8-3 (P3) không bắt buộc cho DoD tối thiểu, có thể kéo sang R9 nếu hết thời gian.
