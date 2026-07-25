# NovaWay — Sprint R4: Codebase Hardening

> Sprint thứ tư sau `Sprint R3: Real-Device Verification & CD Hardening` (`docs/roadmap/SPRINT_R3_VERIFICATION_CD_HARDENING.md`, hoàn tất 07/2026). R3 đóng gần hết backlog kỹ thuật tích luỹ từ Open Items (R3-1/2/3/5/6), chỉ còn R3-4 hoãn sang R4 vì cần thiết bị Android/iOS thật (vẫn chưa có — xác nhận lại khi lên kế hoạch R4). Vì không còn backlog "verify thật" nào sẵn sàng mà không cần thiết bị, và không có yêu cầu tính năng mới, R4 chuyển hướng sang **rà soát/harden codebase hiện có** — audit thật (không suy đoán) trên cả 3 app trước khi viết backlog này.

## 1. Sprint Goal

Sửa các phát hiện thật từ audit (bug UX thật, lỗ hổng bảo mật nhỏ, khoảng trống test coverage ở đúng những chỗ chạy code thật — không phải fake/mock trong test) — không thêm tính năng sản phẩm mới, không đổi kiến trúc lớn.

## 2. Phương pháp audit (đã chạy thật trước khi viết backlog này)

- `pnpm audit` toàn workspace (JSON output, truy vết `paths` từng advisory để xác định có thực sự reachable từ runtime hay chỉ là transitive dependency của build tool) + `pnpm outdated -r` + `flutter pub outdated`.
- Grep thật trên code đã commit: `console.log`/`print` leftover, hardcoded secret pattern, file lạ ngoài `.gitignore`.
- 3 agent quét sâu song song (backend/web/mobile riêng biệt) — mỗi agent được cung cấp rõ danh sách "pattern đã biết là cố ý, không phải bug" (mock providers, `maplibre-gl` pin 5.24.0, v.v.) để tránh báo nhiễu lại những quyết định đã chốt ở R1-R3.
- Backlog dưới đây chỉ gồm phát hiện đã xác nhận cụ thể (file + dòng), không có mục nào dựa trên suy đoán chung chung.

## 3. Ngoài phạm vi (Out of Scope)

- **Nâng cấp `@nestjs/*` v10 → v11** (major version) — dù sẽ dọn được vài lỗ hổng dependency (`qs`/`body-parser`/`multer` bundle mới hơn), đây là thay đổi lớn có rủi ro breaking change thật, cần TDR riêng + full regression pass, không làm vội trong đợt hardening chung.
- **Nâng cấp `typeorm` 0.3.x → 1.1.0** (major version, xác nhận là bản phát hành thật qua npm registry, không phải nhiễu) — cùng lý do trên, rủi ro breaking change lớn hơn cả NestJS, cần TDR riêng.
- **Hạn chế truy cập `GET /metrics`** — không có PII, chỉ counter tổng hợp; rủi ro thấp, chấp nhận được ở quy mô pilot hiện tại (giống tinh thần R3-6, không over-engineer khi chưa có traffic thật).
- **Dọn `Tooltip`/`TooltipTrigger`/`TooltipContent` chưa dùng** (`apps/web/src/components/ui/tooltip.tsx`) — scaffolding shadcn thừa, không gây hại, dọn sau nếu rảnh, không đáng một mục backlog riêng.
- R3-4 (UI capture khuôn mặt thật) vẫn hoãn sang R5+ — chưa có thiết bị Android/iOS thật, không đổi so với R3.

## 4. Backlog

| # | Việc | Ưu tiên | Vì sao | Bằng chứng / Rủi ro |
|---|---|---|---|---|
| R4-1 | Sửa 4 mục dropdown trong `Sidebar.tsx` ("Hồ sơ cá nhân", "Quyền riêng tư", "Cài đặt ứng dụng", "Trợ giúp") bấm vào không làm gì | P0 | Bug UX thật, không phải lý thuyết — người dùng bấm và không có phản hồi gì | `apps/web/src/components/layout/Sidebar.tsx:105-116`. Cần quyết định: wire thật (cần thêm trang) hay disable/ẩn kèm "sắp có" — hỏi trước khi chọn hướng |
| R4-2 | ✅ Đồng bộ CORS của `RealtimeGateway` với `WEB_ORIGIN` (hiện `cors: true` cho phép mọi origin, khác HTTP API) | P1 | Không nhất quán với chính sách CORS đã áp cho HTTP API ở `main.ts` — JWT vẫn chặn được truy cập dữ liệu, nhưng không nên để khác biệt không chủ đích | **Hoàn tất 07/2026** — `@WebSocketGateway`'s `cors` option không thể đọc `ConfigService` (decorator chạy trước khi `ConfigModule` load `.env`), nên chuyển sang `ConfiguredSocketIoAdapter` (custom `IoAdapter`, override `createIOServer`) áp `WEB_ORIGIN` tại thời điểm server thật sự bind. Verify thật qua HTTP: preflight `/socket.io/` OPTIONS giờ phản hồi `Access-Control-Allow-Origin: http://localhost:5173` (khớp `WEB_ORIGIN`) bất kể Origin request là gì, giống hệt hành vi `/health` — trước đó phản hồi `*` cho mọi origin. `apps/backend/src/realtime/configured-socket-io.adapter.ts`, `apps/backend/src/main.ts`, `apps/backend/src/realtime/realtime.gateway.ts:33`. |
| R4-3 | ✅ Thêm unit test framework cho `apps/web` (Vitest, khớp tooling Vite sẵn có) + viết test cho `routeGeometry.ts` | P1 | `docs/TEST_STRATEGY.md` §1 đã quy định Jest/unit test cho `apps/web` từ D0.2 nhưng chưa từng triển khai — chỉ có Playwright E2E. `routeGeometry.ts` (haversine, interpolate, split route) là hàm thuần, ảnh hưởng trực tiếp độ chính xác render bản đồ, dễ test, chưa có test nào | **Hoàn tất 07/2026** — Vitest (khớp Vite, không cần babel transform riêng), config riêng `vitest.config.ts` (tách khỏi `vite.config.ts` để không kéo theo plugin tailwind/react không cần, và loại trừ `e2e/` khỏi phạm vi quét — thư mục đó dùng `@playwright/test`, không phải vitest). 14 test cho `routeGeometry.ts` (haversine — điểm trùng, khoảng cách xích đạo 90° đã biết trước, tính đối xứng; buildSegmentLengths; interpolateAlongRoute — biên đoạn, clamp cuối route, chia-cho-0 khi 2 điểm trùng; splitRouteAtDistance — route rỗng, distance=0, distance=tổng chiều dài, tách giữa route). `pnpm -r --if-present test` ở root giờ tự động chạy cả Vitest lẫn Jest, khớp đúng lệnh CI đang dùng — verify thật bằng cách chạy chính lệnh đó. Cập nhật `docs/TEST_STRATEGY.md` §1 (dòng Unit) khớp thực tế. |
| R4-4 | ✅ Viết test cho `MockBiometricProvider` | P1 | Đây là provider **mặc định đang chạy thật** (`BIOMETRIC_PROVIDER=mock`), quyết định trực tiếp việc trip có được bắt đầu hay không, nhưng chưa có test nào — khác `AwsRekognitionBiometricProvider` đã có test đầy đủ | **Hoàn tất 07/2026** — 4 test: `providerName` đúng giá trị `'mock'`; `createSession` trả `sessionId` ngẫu nhiên không trùng giữa 2 lần gọi; `verify` trả `success` cho session id bất kỳ; `verify` trả `failed`/`FACE_NOT_MATCHED` đúng cho test hook `'fail'`. `apps/backend/src/biometric/providers/mock-biometric.provider.spec.ts`. |
| R4-5 | Viết test cho `SocketIoRealtimeClient` và `GeolocatorLocationSource` (mobile) | P1 | Đây là code networking/platform **thật** đang chạy trong app — mọi test khác trong `apps/mobile/test/` chỉ exercise qua `FakeRealtimeClient`/`FakeLocationSource`, code thật chưa từng được test trực tiếp | `apps/mobile/lib/services/socket_io_realtime_client.dart`, `apps/mobile/lib/services/geolocator_location_source.dart` |
| R4-6 | Sửa comment lỗi thời trong `splash_screen.dart` (ghi "login API chưa xây" dù đã xây từ step 4.2) | P2 | Việc nhỏ, đúng tinh thần dọn dẹp doc/code-comment lỗi thời đã làm nhiều lần trong R2/R3 | `apps/mobile/lib/screens/splash_screen.dart:4-5` |
| R4-7 | Giảm timing side-channel ở `AuthService.login()` (email không tồn tại trả nhanh hơn sai mật khẩu) | P2 | Email enumeration lý thuyết qua thời gian phản hồi — rủi ro thấp ở quy mô pilot nhưng dễ sửa (thêm một lần `bcrypt.compare` giả khi không tìm thấy user) | `apps/backend/src/auth/auth.service.ts:35-42` |

**Đề xuất thứ tự làm:** R4-1 trước (P0, bug người dùng thấy được ngay) → R4-2 (P1, bảo mật, nhanh) → R4-3 (P1, mở khoá hạ tầng test cho các mục sau) → R4-4/R4-5 (P1, test coverage, có thể làm song song vì độc lập) → R4-6/R4-7 (P2, nhỏ, cuối sprint).

## 5. Definition of Done cho Sprint R4

- [ ] R4-1 hoàn tất — 4 mục dropdown trong Sidebar có hành vi rõ ràng (wire thật hoặc disable có thông báo), không còn dead-end im lặng.
- [x] R4-2 hoàn tất — CORS của WebSocket gateway khớp chính sách `WEB_ORIGIN`.
- [x] R4-3 hoàn tất — `apps/web` có unit test framework thật + test cho `routeGeometry.ts`, đóng khoảng trống `TEST_STRATEGY.md` §1.
- [ ] `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` được cập nhật nếu phát hiện thêm gap tài liệu-thực tế trong lúc làm.
- [ ] Không có tính năng sản phẩm mới nào được thêm ngoài danh sách ở mục 4.

**Ghi chú:** R4-4/R4-5 (P1) nên làm ngay sau R4-3 nếu còn thời gian — không bắt buộc cho DoD tối thiểu nhưng là phát hiện thật đáng chú ý (code chạy thật, không phải fake, chưa test). R4-6/R4-7 (P2) có thể kéo dài sang R5 nếu hết thời gian.
