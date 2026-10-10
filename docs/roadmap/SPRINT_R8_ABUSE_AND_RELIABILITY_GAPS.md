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

**Tái kiểm tra phạm vi 27/09/2026:** Trên `develop` sau R7 và các PR #74/#75/#79/#80, ba controller ở R8-1 vẫn không có `ThrottlerGuard`; chưa có screen test cho hai nhánh lỗi ở R8-2 hoặc test trạng thái `rejected` ở R8-3. Các con số audit, HTTP và coverage ở trên là **ảnh chụp ngày 10/08**, không phải phép đo lại ngày 27/09. Trước khi triển khai từng mục phải chạy lại phép đo/test tương ứng; đặc biệt không dùng kết luận advisory tháng 8 làm đánh giá bảo mật hiện tại nếu chưa audit dependency mới.

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

**Đề xuất thứ tự làm:** R8-1 trước (P1, cùng lớp rủi ro đã xử lý ở R6-1, không đổi logic nghiệp vụ) → R8-2 (P2, kiểm thử nhánh lỗi UI bằng seam có sẵn) → R8-3 (P3, kiểm thử trạng thái kết nối bị từ chối). Mỗi mục dùng branch và PR riêng theo `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`; không gộp R8-2/R8-3 chỉ vì đều là test mobile.

**Đo lại R8-1 (27/09/2026, branch `fix/r8-1-mutating-rate-limit`, trước merge):** baseline đã ghi ở bảng trên là 15/15 `201` (10/08/2026). Sau khi gắn guard cho tám route ghi dữ liệu, phép đo trên backend thật với PostgreSQL/PostGIS tạm và cùng một JWT cho 15 `POST /api/vehicles` liên tiếp cho kết quả 5 × `201`, 10 × `429` (`error_code: RATE_LIMITED`). Sáu `GET /api/vehicles` tiếp theo vẫn `200`; request ghi không có JWT vẫn `401`. Test tự động kiểm tra metadata của cả tám route ghi và các route đọc tương ứng. PR #81 đã merge vào `develop` (commit `2687541`); required checks backend/web, E2E golden path và mobile đều pass. Sau merge, `pnpm -r --if-present test` trên `develop` pass (backend 174/174, web 31/31).

**Đo coverage R8-2 (27/09/2026, branch `test/r8-2-mobile-api-error-paths`, trước merge):** `flutter test --coverage` trên `develop` cho `VehicleListScreen` 54/72 dòng và `RegisterScreen` 64/74 dòng. Widget test mới dùng `http.testing.MockClient` qua `http.runWithClient` để kiểm tra thông báo `ApiException`, lỗi mạng chung, retry và `EMAIL_ALREADY_EXISTS`; không sửa source sản phẩm. Sau test, coverage đạt 72/72 và 74/74 dòng tương ứng (100% cả hai màn hình), `flutter test` 52/52 pass, `flutter analyze` không có issue và `flutter run -d chrome` khởi chạy được. Chỉ đánh dấu DoD R8-2 hoàn tất sau required PR checks và merge.

**Đo coverage R8-3 (27/09/2026, branch `test/r8-3-realtime-rejected-state`, trước merge):** trên `develop`, các dòng 125–127 (`RealtimeConnectionState.rejected`) của `TripCockpitScreen` là 0 hit. Fake realtime mới phát được trạng thái `rejected`; widget test xác nhận khi đang kết nối, UI trở về idle, hiện lời nhắc đăng nhập lại và không hiển thị nút Dừng. Sau test, cả ba dòng có hit; `flutter test` 53/53 pass, `flutter analyze` không có issue và `flutter run -d chrome` khởi chạy được. Không đổi source sản phẩm hoặc MapLibre controller; chỉ đánh dấu hoàn tất sau required PR checks và merge.

## 5. Definition of Done cho Sprint R8

- [x] R8-1 hoàn tất — verify lại đúng phép đo ở mục 4 (15 request liên tiếp), xác nhận `429` xuất hiện sau khi thêm guard; PR #81 merge và post-merge tests pass (27/09/2026).
- [x] R8-2 hoàn tất — coverage `vehicle_list_screen.dart` 72/72 và `register_screen.dart` 74/74 dòng (100%); PR #83 merge 27/09/2026.
- [x] `pnpm -r --if-present test` + `flutter test` + E2E golden path pass sau **mỗi** mục: required CI trên PR #81/#83/#84 đều xanh; sau merge #84 chạy lại trên `develop` được backend 174/174, web 31/31, Flutter 53/53. E2E sau merge #84 dựa trên CI của PR, không ghi là đã chạy local.
- [x] `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` đã ghi R8-1; R8-2/R8-3 không phát hiện gap tài liệu–thực tế mới cần thêm vào đó.
- [x] Không có tính năng sản phẩm mới nào được thêm ngoài danh sách ở mục 4: R8-1 chỉ thêm rate limit, R8-2/R8-3 chỉ thêm test/fake test.

**Ghi chú:** R8-3 (P3) không bắt buộc cho DoD tối thiểu nhưng đã hoàn tất qua PR #84 (merge 27/09/2026): ba dòng xử lý `rejected` từ 0 hit thành có hit; không đổi source sản phẩm.

## 6. Kết quả đóng Sprint R8 (27/09/2026)

R8-1, R8-2 và R8-3 đều đã merge vào `develop` qua PR #81, #83 và #84. Ba PR đều có các job Backend + Web + shared-types, E2E golden path và Mobile xanh. Phép đo HTTP R8-1, coverage R8-2 và R8-3 nằm ở mục 4; kết quả test trên `develop` sau PR #84 merge là backend 174/174, web 31/31 và Flutter 53/53. Đây là kết quả sprint hardening/test, **không** chứng minh GPS thực địa, xác thực khuôn mặt trên thiết bị thật, ARKit hay LiDAR.

Track AR Terrain tách biệt khỏi Sprint R8. Step `8.2` vẫn chưa được phép bắt đầu nếu chưa có iPhone 16 Pro vật lý, smoke cài/khởi chạy trên chính máy đó và runtime Scene Reconstruction capability check theo micro-step plan. Không đổi trạng thái `8.2` khi đóng Sprint R8.
