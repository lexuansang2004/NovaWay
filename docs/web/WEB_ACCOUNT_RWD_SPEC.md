# NovaWay — Đặc tả tài khoản web và responsive (WEB-00)

> **Trạng thái cập nhật 2026-10-19:** WEB-00 đã phê duyệt độc lập và merge qua PR #87; WEB-01 đã review độc lập PASS tại `cdd6967` và merge qua PR #88 (`4be69b8`). Provenance: `docs/REVIEW_NOTES.md` §43; §38 không được tính là phê duyệt độc lập. WEB-02 đã merge PR #89 tại `1c02617`, WEB-03 đã merge PR #90 tại `20b9bc5`, WEB-04 đã merge PR #91 tại `d5c6d46`, WEB-05 đã merge PR #92 tại `1041e37`, WEB-06 đã merge PR #93 tại `d70bb83`, WEB-07 đã merge PR #94 tại `f3052d4`, WEB-08 đã merge PR #95 tại `1fc5517` (§59), gate Windows PASS. WEB-09 đã merge PR #96 tại `fbed872` (§62). WEB-10: review vòng 1 CHANGES REQUIRED (R01–R04, N01) đã sửa, chờ re-review độc lập — chưa approved/merge (§63–§64); WEB-11…WEB-13 NOT STARTED (REVIEW_NOTES §45–§64). Quan sát reader-ON focus ở WEB-05 và diagnostic native WEB-07 vẫn OPEN, nguyên nhân NOT_VERIFIED; không claim full Narrator/WCAG. Các nhãn chờ merge của WEB-00 còn trong phần quyết định/baseline phản ánh thời điểm soạn và được thay thế bởi trạng thái ở đây; requirement/AC không đổi. Chỉ dòng evidence đã có kết quả mới được coi là đã chạy; ma trận còn lại NOT_RUN. Gate thiết bị thật vẫn riêng, không suy từ emulation.

## 0. Mốc nguồn, đầu vào và cách đọc

- **Mốc source:** `origin/develop` tại `430e325417f7b73d2e6946b813bb0168bbbf8026` (kiểm bằng `git ls-remote` ngày 09/10/2026). Mọi trích dẫn hiện trạng dạng `path:dòng` là số dòng tại commit này; có thể đối chiếu bằng `git show 430e325:<path>`.
- **Đầu vào:** gói khảo sát `novaway-account-rwd-audit` (09/10/2026, nằm ngoài Git). Gói này chỉ là đầu vào tham khảo, **không** phải dependency của tài liệu: mọi nội dung cần dùng đã được chuyển vào đây và các tài liệu baseline liên quan. Mã `E01`–`E38` của gói được thay bằng trích dẫn trực tiếp `path:dòng`; mã `P-*`, `D*`, `G*`, `U*`, `V*`, `T*` được ánh xạ ở §9.
- **Nhãn trạng thái dùng trong tài liệu:**
  - **HIỆN CÓ** — thấy trực tiếp trong source tại mốc trên; không đồng nghĩa đã chạy test.
  - **YÊU CẦU ĐÃ CHỐT** — đã nằm trong baseline/contract trước `WEB-00`.
  - **SUY LUẬN TĨNH** — hệ quả rút ra từ đọc mã, **chưa tái hiện runtime**; không được gọi là lỗi đã xác nhận bằng test.
  - **ĐẶC TẢ MỚI (WEB-00)** — quyết định sản phẩm/UX do `WEB-00` đưa vào; review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu.

## 1. Phạm vi

**Actor:** người dùng đã đăng nhập web (Dashboard User / Fleet Operator, hoặc chủ xe dùng web — `docs/PRD.md` §3). Quyền dữ liệu giữ nguyên theo tài khoản hiện hành; không thêm role admin/role hệ thống. Web vẫn là công cụ **quản lý/giám sát**; bắt đầu/kết thúc chuyến đi chỉ có trên mobile (`docs/ARCHITECTURE.md:90`; `docs/TEST_STRATEGY.md:112`).

**Trong phạm vi WEB-00 (chỉ đặc tả):**

1. Kiểm tra phiên đăng nhập web có trạng thái lỗi, retry và timeout 15 giây chỉ cho session verification.
2. Hồ sơ chỉ đọc email từ `GET /api/auth/me` hiện có.
3. Trang thông tin quyền riêng tư, nội dung có nguồn, qua gate nội dung riêng.
4. Cài đặt duy nhất: hiệu ứng giao diện "Theo hệ thống" / "Giảm chuyển động", lưu cục bộ.
5. Trợ giúp theo flow và route có thật.
6. Responsive/adaptive web cho app shell, bốn màn tài khoản và các trang web hiện có.

**Ngoài phạm vi (không làm trong `WEB-00`…`WEB-13`; ghi backlog riêng ở §10):** sửa hồ sơ, avatar, số điện thoại, ngày tham gia, đổi email/mật khẩu, quên mật khẩu, xoá/export tài khoản, quản lý phiên toàn thiết bị/global logout; consent center hoặc điều khiển GPS của thiết bị khác từ web; theme sáng/tối, ngôn ngữ, đồng bộ setting đa thiết bị; kênh hỗ trợ/ticket/chat; start/stop trip trên web; dashboard metric mới; backend retention job; quyền quản trị; Flutter, Unity, triển khai biometric. **Không thêm API, bảng hay cột** (`docs/API_CONTRACT.md`, `docs/DATA_MODEL.md` không đổi — xem §3 D02).

## 2. Hiện trạng tại mốc `430e325`

### 2.1. Bốn màn tài khoản và luồng phiên

| ID | Nhãn | Hiện trạng / nguồn | Hệ quả cho đặc tả |
|---|---|---|---|
| WEB-G01 | HIỆN CÓ | `/settings`, `/account/profile`, `/account/privacy`, `/help` và `/offline-sync` đều render `ComingSoonPage` (`apps/web/src/App.tsx:25–29`); trang chỉ có heading và câu "Tính năng này sẽ có ở bước triển khai tiếp theo" (`apps/web/src/pages/ComingSoonPage.tsx:7–13`). Menu tài khoản dẫn tới bốn route (`apps/web/src/components/layout/Sidebar.tsx:103–114`). PRD chỉ cam kết "đăng ký/đăng nhập, JWT session" (`docs/PRD.md:59`). | Cần đặc tả hành vi tối thiểu từng trang trước implementation. |
| WEB-G02 | HIỆN CÓ | `/me` trả `{id, email}` (`docs/API_CONTRACT.md:44–48`); `users` có `id, email, password_hash, created_at` (`docs/DATA_MODEL.md:14–22`); `UsersService` chỉ `findByEmail/findById/create` (`apps/backend/src/users/users.service.ts:13–24`); `UsersModule` không khai báo controller (`apps/backend/src/users/users.module.ts:6–11`). Route backend hiện có: auth `register/login/me` (`apps/backend/src/auth/auth.controller.ts:22,32,39`) — không có route sửa hồ sơ/đổi mật khẩu/xoá-export/preference/support/consent-management/global logout trong `apps/backend/src/*/*.controller.ts`. `docs/ARCHITECTURE.md:36` ghi "CRUD user cơ bản". | Hồ sơ đợt này chỉ đọc. Chữ "CRUD" ở ARCHITECTURE đã được đính chính (không có API sửa hồ sơ). "Không có endpoint" giới hạn trong backend của repo này. |
| WEB-G03 | YÊU CẦU ĐÃ CHỐT + HIỆN CÓ | FR-RETENTION-02 yêu cầu raw GPS tối đa 30 ngày (`docs/SRS.md:121`); `docs/DATA_MODEL.md:266` đính chính job cleanup/DROP partition **chưa từng implement**; migration `apps/backend/src/database/migrations/1721260000010-EnsureRawGpsPartitions.ts` chỉ tạo partition tháng hiện tại/kế tiếp. | Không được công bố "GPS tự xoá sau 30 ngày". Requirement FR-RETENTION-02 **giữ nguyên**, không hạ thấp; thiếu sót implementation là backlog riêng (§10). |
| WEB-G04 | YÊU CẦU ĐÃ CHỐT | Thu hồi quyền vị trí giữa chuyến còn **[OPEN]** (`docs/EDGE_CASES.md:12`); web là giám sát (`docs/ARCHITECTURE.md:90`). | Trang privacy chỉ giải thích; không có toggle thu hồi từ xa. |
| WEB-G05 | HIỆN CÓ + SUY LUẬN TĨNH | `fetchCurrentUser()` chỉ xoá token khi 401, lỗi khác ném tiếp (`apps/web/src/services/authService.ts:24–37`). `AppLayout` gọi `.then(...)` không có `catch`, state chỉ đổi khi resolve (`apps/web/src/layouts/AppLayout.tsx:17–27`); `LoginPage` cùng pattern (`apps/web/src/pages/LoginPage.tsx:17–24`). `apiClient` dùng `fetch` không có timeout (`apps/web/src/lib/apiClient.ts:21–41`). Có test service bảo toàn token khi lỗi mạng/500 (`apps/web/src/services/authService.spec.ts:88–114`), không có test UI retry. **Suy luận tĩnh:** khi `/me` lỗi mạng/500, AppLayout có thể kẹt ở "Đang kiểm tra phiên đăng nhập..." (`AppLayout.tsx:29–35`) và `/login` có unhandled rejection. Chưa tái hiện trên trình duyệt. | Đặc tả trạng thái `error` + retry + timeout (§4.1). `WEB-01` phải tái hiện bằng test UI trước khi sửa. |
| WEB-G06 | HIỆN CÓ | Card Dashboard hiển thị "—" và badge "Online" tĩnh (`apps/web/src/pages/DashboardPage.tsx:11–15,38`). | RWD chỉ đổi layout; metric thật là backlog riêng. |
| WEB-G07 | HIỆN CÓ + SUY LUẬN TĨNH | `LiveMapPage` gộp "không có trip" và "chưa có vị trí" vào cùng empty state (`apps/web/src/pages/LiveMapPage.tsx:15`); hook bỏ qua lỗi poll tới tick sau (`apps/web/src/services/useLiveTrip.ts:62–66`) và chỉ có position sau `location:broadcast` (`useLiveTrip.ts:101–110`). | Trợ giúp không được khẳng định empty state luôn có nghĩa "không có chuyến". Trạng thái map chính xác là backlog riêng. |
| WEB-G08 | HIỆN CÓ | Không có settings API/schema; không có `prefers-reduced-motion`/`MotionConfig` trong `apps/web/src`; radar lặp vô hạn (`apps/web/src/index.css:114–127`); motion ở login/dashboard (`framer-motion`, `apps/web/src/pages/LoginPage.tsx:3`). Token web nằm ở `sessionStorage` (`authService.ts:17,40`); "Ghi nhớ đăng nhập" đã bị gỡ vì lý do bảo mật lưu token (`apps/web/src/components/auth/LoginForm.tsx:6–16`). | Chỉ đặc tả một setting có hành vi và cách lưu rõ (§4.4). Preference không được chạm token/session. |
| WEB-G09 | HIỆN CÓ | Playwright chỉ có project `Desktop Chrome` (`apps/web/playwright.config.ts:26`); có test 404 (`apps/web/e2e/not-found.spec.ts`); không có test viewport/route tài khoản. | Mở rộng test theo ma trận (§5–§7); không dùng golden path làm bằng chứng RWD. |
| WEB-G10 | HIỆN CÓ (bổ sung sau review vòng 1, R04) | Backend đã có cả `MockBiometricProvider` và `AwsRekognitionBiometricProvider` (R2-6, `apps/backend/src/biometric/providers/aws-rekognition-biometric.provider.ts:33–46`). Mặc định là mock; AWS chỉ được chọn khi `BIOMETRIC_PROVIDER=aws-rekognition` (`apps/backend/src/biometric/biometric.module.ts:27–40`; `docs/architecture/TDR-biometric-provider-spike.md:76`). Câu "chưa implement, MVP vẫn dùng `MockBiometricProvider`" ở `docs/SRS.md:147` đã lỗi thời so với nguồn này. Provider thật của bản phát hành chưa được kiểm trong `WEB-00`. | Privacy Content Gate phải đối chiếu đúng provider của bản phát hành (§4.3); không suy ra từ SRS cũ hay từ cấu hình mặc định. |

### 2.2. Responsive và accessibility — phân tích tĩnh (chưa đo DOM)

| ID | Bề mặt | Hiện trạng / nguồn | Rủi ro cần đo (SUY LUẬN TĨNH) |
|---|---|---|---|
| WEB-U01 | App shell | Sidebar luôn render, `h-screen w-64 shrink-0` (`Sidebar.tsx:50`); shell `flex h-screen overflow-hidden`, `main` không có `min-w-0` (`AppLayout.tsx:42–44`). | Ở font gốc 16px, sidebar ≈256px; viewport 320px chỉ còn ≈64px cho nội dung. Đây là tính toán, không phải số đo. `overflow-hidden` có thể giấu tràn. |
| WEB-U02 | Navigation thấp/ngang | Nav flex-1, menu tài khoản ở đáy, sidebar không có `overflow-y` riêng (`Sidebar.tsx:50–100`). | Chiều cao thấp/text zoom có thể làm account/logout khó tiếp cận. Không khẳng định lỗi định vị dropdown khi chưa chạy. |
| WEB-U03 | Dashboard | `p-8`, grid tối thiểu 2 cột, `lg` 4 cột (`DashboardPage.tsx:25,70`). | Viewport hẹp cần một cột; action wrap. |
| WEB-U04 | Danh sách xe | Hàng/action và xác nhận xoá là flex ngang; button `whitespace-nowrap shrink-0` (`apps/web/src/pages/VehiclesPage.tsx:75–89,123–188`; `apps/web/src/components/ui/button.tsx:8`). | Tên xe dài, xe active, confirm delete có thể đẩy action khỏi viewport. |
| WEB-U05 | Form xe | Grid 1 cột → 3 cột ở `sm` theo viewport, form nằm trong shell đã trừ sidebar (`apps/web/src/components/vehicles/VehicleForm.tsx:37`). | Gần breakpoint ba field có thể quá hẹp. |
| WEB-U06 | Login | Panel brand ẩn dưới `lg`, form `max-w-sm`, có motion (`LoginPage.tsx:33–69`; `LoginForm.tsx:32–100`). | Có thích ứng cơ bản; cần đo min-width, zoom, bàn phím ảo, lỗi dài, ngang thấp. Không kết luận login hỏng. |
| WEB-U07 | Live map | Empty và map đều `min-h-[600px]`; overlay góc trên trái/phải tách rời (`LiveMapPage.tsx:17,33–47`). | Màn hình thấp phải cuộn; nhãn kết nối dài có thể đè tốc độ ở width hẹp. |
| WEB-U08 | Analytics | `ResponsiveContainer width="100%" height={320}`, cards `sm` 3 cột (`apps/web/src/pages/AnalyticsPage.tsx:138,145`). | ResponsiveContainer không tự chứng minh nhãn/legend đọc được ở width hẹp; tooltip chỉ hover. |
| WEB-U09 | Nút icon | Nút sửa/xoá xe chỉ chứa SVG, không `aria-label` tại call site (`VehiclesPage.tsx:173–187`); `icon-sm` là `size-8` (`button.tsx:30`). | Thiếu accessible name thấy trong source; cần kiểm accessibility tree. 32px không tự động vi phạm WCAG 2.5.8. |
| WEB-U10 | Motion/theme | Radar loop (`index.css:114–127`); có biến `.dark` (`index.css:37`) nhưng page dùng nhiều màu tối cố định. | Cần kiểm reduced motion toàn app; CSS `.dark` không đủ để phát hành switch theme. |

## 3. Quyết định đặc tả WEB-00

Trạng thái chung của bảng: **ĐẶC TẢ MỚI (WEB-00)** — hướng đã được chủ dự án đồng ý; nội dung chi tiết: review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu (REVIEW_NOTES §35–§38). Không quyết định nào ở đây là hành vi đã có.

| ID | Quyết định | Căn cứ |
|---|---|---|
| WEB-D01 | Hồ sơ chỉ đọc email người đang đăng nhập; không hiển thị ngày tham gia chỉ vì DB có `created_at`. | WEB-G02 |
| WEB-D02 | Không thêm API/bảng/cột. `API_CONTRACT.md` và `DATA_MODEL.md` không đổi cho toàn bộ chuỗi `WEB-01`…`WEB-13`; mọi nhu cầu ghi hồ sơ/consent/preference phía server là vòng đặc tả riêng. | WEB-G02, WEB-G08 |
| WEB-D03 | Quyền riêng tư là trang thông tin + hướng dẫn; nội dung retention/provider qua **Privacy Content Gate** (§4.3) trước khi phát hành. | WEB-G03, WEB-G04 |
| WEB-D04 | Cài đặt duy nhất là hiệu ứng giao diện web, lưu cục bộ theo tài khoản trên trình duyệt (§4.4). | WEB-G08 |
| WEB-D05 | Trợ giúp là nội dung tĩnh có nguồn, dẫn tới route có thật; không contact/ticket/chat chưa xác nhận. | WEB-G01, WEB-G07 |
| WEB-D06 | Responsive: drawer dưới 1024 CSS px, sidebar từ 1024; nội dung reflow theo không gian container. Ngưỡng 1024 là lựa chọn của NovaWay, không phải chuẩn bắt buộc. | WEB-U01…U10 |
| WEB-D07 | Phạm vi kiểm thử 320–1920 CSS px, portrait/landscape, zoom/text, bàn phím, nhiều engine; Safari iPhone và Android Chrome thật là gate riêng. | WEB-G09 |
| WEB-D08 | Timeout **15 giây** chỉ cho request kiểm tra phiên (`GET /api/auth/me` khi mount AppLayout/LoginPage); không áp blanket timeout lên API khác. Đây là ngưỡng UX mới, không phải hành vi đã có. | WEB-G05 |
| WEB-D09 | Thêm sau review vòng 1 (R01). Thao tác chủ động "Đăng nhập lại" từ trạng thái lỗi phiên xoá token và user cục bộ, vô hiệu hoá kiểm tra đang chờ, rồi về `/login`. Hệ thống không tự xoá token khi lỗi khác `401` hay khi retry. Thao tác này không revoke server, không kết thúc chuyến mobile. | WEB-G05; `LoginPage.tsx:17–24` |
| WEB-D10 | Thêm sau review vòng 1 (R02). Chỉ kết quả kiểm tra phiên còn hiệu lực (đúng thế hệ phiên và đúng token hiện hành) mới được đổi token, AuthContext, route hay UI, ở mọi tầng. | `authService.ts:15–18,25–33`; `AppLayout.tsx:18–25` |
| WEB-D11 | Thêm sau review vòng 1 (R05). Tách gate merge Windows khỏi gate công bố hỗ trợ thiết bị thật (§4.7). | WEB-D07 |

## 4. Hành vi chi tiết

### 4.1. Kiểm tra phiên (FR-WEBSESSION)

Trạng thái: `checking` → `authenticated` | `unauthenticated` | `error`.

Bảng dưới áp dụng cho **lần kiểm tra còn hiệu lực** — tức request thuộc đúng thế hệ phiên hiện hành (xem "Thế hệ phiên" bên dưới). Kết quả của lần kiểm tra đã mất hiệu lực bị bỏ qua hoàn toàn, kể cả `401`.

| Kết quả `/me` | Trạng thái | Token trong `sessionStorage` | Hiển thị |
|---|---|---|---|
| Không có token | `unauthenticated` | Không có | Về `/login` (giữ hành vi hiện có). |
| `200` | `authenticated` | Giữ | Route đã yêu cầu. |
| `401` | `unauthenticated` | Xoá theo contract hiện có — **chỉ** khi token mà request này xác minh vẫn là token hiện hành | Về `/login`. |
| Lỗi mạng, `500` | `error` | **Giữ** | Thông báo không kiểm tra được phiên, nút "Thử lại", nút "Đăng nhập lại". |
| `403` | `error` | **Giữ** | Thông báo không có quyền/không kiểm tra được; không được hiển thị như "mật khẩu sai". `/me` không định nghĩa `403` trong contract — mọi mã khác `401` được xử lý như lỗi không phải xác thực. |
| `429` | `error` | **Giữ** | Thông báo quá nhiều yêu cầu, thử lại sau; không tự retry dồn dập. |
| Quá 15 giây | `error` | **Giữ** | Như lỗi mạng; request bị huỷ. |

**Xử lý tự động vs thao tác người dùng (đính chính sau review vòng 1, R01).** Hệ thống **không bao giờ tự xoá** token khi lỗi khác `401` hoặc khi retry. Người dùng có thể chủ động chọn **"Đăng nhập lại"** từ trạng thái `error`. Hành động tường minh này:

1. xoá token trong `sessionStorage` và user trong AuthContext ở trình duyệt hiện tại;
2. vô hiệu hoá mọi lần kiểm tra phiên đang chờ (tăng thế hệ phiên);
3. điều hướng tới `/login` với form dùng được ngay. Vì không còn token, `/login` không tự kiểm tra phiên và không tự chuyển về dashboard.

Hành động này **không** gọi server để thu hồi token (không có endpoint revoke — WEB-G02), **không** kết thúc chuyến trên mobile, và **không** xoá preference giảm chuyển động.

Phương án đã cân nhắc (quyết định đặc tả; review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu):

| Phương án | Hệ quả | Kết luận |
|---|---|---|
| A. Chỉ điều hướng tới `/login`, giữ token | `LoginPage` tự kiểm tra token khi mount và chuyển về `/dashboard` nếu hợp lệ (`apps/web/src/pages/LoginPage.tsx:17–24`). Khi mạng phục hồi, người dùng bị đưa ngược lại và không đổi được tài khoản. Không có một expected result duy nhất. | Loại |
| B. "Đăng nhập lại" xoá phiên cục bộ rồi về `/login` (đề xuất của reviewer) | Hành vi xác định, dễ kiểm thử. Đổi lại, người dùng phải nhập lại mật khẩu dù token có thể vẫn hợp lệ. Chấp nhận được vì đây là thao tác chủ động, có nhãn rõ. | **Chọn** |
| C. Điều hướng kèm cờ bỏ qua auto-check, giữ token | Trạng thái ẩn; reload hoặc Back có thể "hồi sinh" phiên mà người dùng nghĩ đã rời; thêm nhánh điều kiện ở LoginPage. | Loại |

**Thế hệ phiên — chỉ kết quả còn hiệu lực mới có tác dụng (R02).** Thế hệ phiên là một khái niệm đặc tả; spec không bắt buộc tên class hay cách cài đặt cụ thể.

- Mỗi lần kiểm tra phiên gắn với token nó xác minh và thế hệ phiên tại lúc bắt đầu.
- Thế hệ phiên đổi khi: đăng nhập thành công, logout, "Đăng nhập lại", và khi bắt đầu một lần retry hay kiểm tra mới.
- Chỉ kết quả của lần kiểm tra còn hiệu lực (cùng thế hệ, token trong storage vẫn là token đã xác minh) mới được: ghi/xoá token, đặt/xoá user trong AuthContext, điều hướng, hoặc đổi UI.
- Kết quả mất hiệu lực, kể cả `200` và `401`, bị bỏ qua **ở mọi tầng**: service/storage, context và component. Guard chỉ ở component không đủ, vì xử lý `401` hiện nằm trong service (`apps/web/src/services/authService.ts:28–33`). Hiện trạng tham chiếu: guard `cancelled` trong `AppLayout.tsx:18–25` chỉ chặn callback của component, không chặn side effect trong service.
- Kịch bản bắt buộc có test: phiên A `/me` đang chờ → đăng nhập B thành công → A trả `401` hoặc `200`. Kết quả mong đợi: token, user và route của B giữ nguyên, không có dữ liệu A.

Ràng buộc chung:

- Retry thủ công có trạng thái bận; tại mọi thời điểm chỉ một request kiểm tra phiên còn hiệu lực; bấm nhiều lần không tạo request song song có hiệu lực.
- Request bị huỷ do timeout hoặc unmount là request đã mất hiệu lực, áp dụng quy tắc thế hệ phiên ở trên.
- `/login` không được có unhandled rejection khi kiểm tra phiên lỗi; form đăng nhập vẫn dùng được.
- Không đổi contract `/me`, không đổi nơi lưu token, không tuyên bố logout web thu hồi token trên mọi thiết bị (không có endpoint revoke — WEB-G02).

### 4.2. Hồ sơ cá nhân (FR-WEBPROFILE)

Bố cục: heading "Hồ sơ cá nhân", vùng "Email đăng nhập" với giá trị đầy đủ, link "Về Dashboard"; menu tài khoản và logout dùng chung shell. Không nút Lưu, không form. Không render `password_hash`; không tạo tên, ngày tham gia, số điện thoại, ảnh đại diện, trạng thái xác minh. Dữ liệu lấy từ user đã được AppLayout xác thực qua `/me` (AuthContext); không bắt buộc gọi `/me` lặp ở trang này — đây là hướng tái sử dụng, không đổi cơ chế session hiện tại.

### 4.3. Quyền riêng tư (FR-WEBPRIVACY) và Privacy Content Gate

Trang thông tin sản phẩm, **không** phải tuyên bố đã được chứng nhận pháp lý; luật nhắc trong `docs/SRS.md:167` không thay thế rà soát pháp lý tại thời điểm phát hành. Các phần nội dung:

1. **Tài khoản và phương tiện** — mục đích thông tin đăng nhập và dữ liệu xe, chỉ mô tả nhóm dữ liệu có trong contract auth/vehicle.
2. **Vị trí và chuyến đi** — consent trước tracking (FR-TRIP-01/02); dừng tracking bằng **kết thúc chuyến trên mobile** (FR-TRIP-04, FR-BGLOC-06). Đăng xuất web **không** được mô tả là dừng tracking mobile.
3. **Xác thực khuôn mặt** — consent riêng và nguyên tắc không lưu ảnh thô tại NovaWay (FR-BIOMETRIC-04, NFR-PRIVACY-03); chính sách lưu giữ của nhà cung cấp phải được xác nhận riêng. Không khẳng định "không có bên thứ ba xử lý" vì luồng session gửi capture trực tiếp tới provider (`docs/API_CONTRACT.md:119–155`).
4. **Thời hạn dữ liệu** — phân biệt raw GPS với trip summary; câu chữ theo retention **thực tế** đã có bằng chứng.
5. **Tìm hướng dẫn** — link `/help`. Chưa có export/delete/revoke hay địa chỉ liên hệ khi quy trình chưa được xác nhận.

**Privacy Content Gate (gate riêng, chặn `WEB-11` — không chặn `WEB-01/02/09/10` hay phần RWD):**

- Người xác nhận: BA + kỹ thuật + chủ dự án; reviewer không được là chính người viết nội dung.
- Phải có bảng trace nội bộ: mỗi cam kết dữ liệu trên trang → requirement + implementation có bằng chứng, hoặc quyết định vận hành đã được xác nhận.
- Retention: nếu cleanup TTL chưa có bằng chứng vận hành, câu "tự xoá sau 30 ngày" bị chặn; hoặc viết đúng thực tế, hoặc hoàn tất dependency retention (§10) trước.
- Provider sinh trắc — tách ba lớp (đính chính sau review vòng 1, R04; xem WEB-G10):
  1. **Có trong source:** adapter `AwsRekognitionBiometricProvider` đã được implement ở R2-6 (`apps/backend/src/biometric/providers/aws-rekognition-biometric.provider.ts:33–46`; flow session ở `docs/API_CONTRACT.md:119–155`).
  2. **Mặc định/fallback theo cấu hình:** `MockBiometricProvider`. AWS chỉ được chọn khi `BIOMETRIC_PROVIDER=aws-rekognition` (`apps/backend/src/biometric/biometric.module.ts:27–40`).
  3. **Provider thực sự của bản phát hành:** **cần xác nhận**, chưa kiểm trong `WEB-00` (không đọc cấu hình/secret môi trường, không gọi AWS). Chính sách lưu giữ của chính provider đó phải được xác nhận trước khi viết nội dung.

  Không được ghi "đang dùng AWS" hay "chỉ dùng mock" như sự thật đã kiểm chứng.
- Đầu mối xử lý yêu cầu dữ liệu chỉ công bố khi đã có quy trình.
- Gate **không** được đóng bằng suy luận của người viết đặc tả, và không thay đổi nghĩa vụ/luật áp dụng.

### 4.4. Cài đặt ứng dụng (FR-WEBSETTINGS)

**Lựa chọn:** "Theo hệ thống" (mặc định) / "Giảm chuyển động". Cả hai tôn trọng OS `prefers-reduced-motion: reduce`; không có lựa chọn ép animation bất chấp OS. "Giảm chuyển động" tắt chuyển động trang trí/transition không thiết yếu (radar, motion của login/dashboard…); dữ liệu realtime trên map vẫn cập nhật, có thể nhảy tức thì thay vì animate. Trang ghi rõ: "Chỉ áp dụng cho tài khoản này trên trình duyệt này."

**Persistence (ĐẶC TẢ MỚI):**

| Khía cạnh | Quy định |
|---|---|
| Nơi lưu | Web storage bền của trình duyệt (localStorage hoặc tương đương). Không API, không DB, không đồng bộ đa thiết bị. Tên key cụ thể do `WEB-12` đề xuất trong PR, không phải contract. |
| Namespace | Theo `user.id` của phiên đã xác thực. Cam kết là **app không chọn/áp dụng** preference của A cho B. Namespace (dù raw hay băm) **không** phải ranh giới quyền truy cập: storage cùng origin trên một browser profile đọc được bởi bất kỳ ai dùng profile đó (N01). Vì vậy chỉ lưu giá trị không nhạy cảm (dòng "Dữ liệu"); trên máy dùng chung, lựa chọn và định danh dùng làm key còn lại sau logout. |
| Dữ liệu | Bản ghi có `version` (bắt đầu `1`) và một giá trị enum (`system` hoặc `reduced`). **Không** email, token, mật khẩu, vị trí, dữ liệu khuôn mặt hay dữ liệu nghiệp vụ. |
| Trước khi biết user | Trang `/login` và màn "đang kiểm tra phiên" chỉ áp dụng OS setting; preference áp dụng sau khi phiên `authenticated`. |
| Reload | Đọc lại preference của đúng `user.id` sau khi xác thực; giữ lựa chọn. |
| Logout | Xoá session như hiện nay; preference được **giữ** để A đăng nhập lại nhận đúng lựa chọn của A. |
| A → B cùng trình duyệt | B nhận preference của B, hoặc mặc định nếu chưa có; không thừa hưởng của A. |
| Trình duyệt/thiết bị khác | Không giả định đã đồng bộ; mặc định "Theo hệ thống". |
| (a) Khởi tạo, **đọc** thất bại (storage bị chặn/ném lỗi khi đọc) | Không có giá trị đọc hợp lệ → "Theo hệ thống"; thông báo không đọc/lưu được lựa chọn trên trình duyệt này; không crash. Nếu sau đó người dùng chọn, áp dụng theo (b). |
| (b) Người dùng đã chọn hợp lệ nhưng **ghi** thất bại (quota, storage bị chặn khi ghi) | **Giữ và áp dụng** lựa chọn vừa chọn trong phiên trang đang mở — không quay về "Theo hệ thống", không bật lại animation; thông báo không lưu được (sẽ mất khi reload). Không đụng token. |
| (c) Giá trị đã lưu hỏng, enum lạ, `version` không hỗ trợ | Coi như không có giá trị đọc hợp lệ → "Theo hệ thống"; thông báo lựa chọn đã lưu không đọc được; lần lưu hợp lệ kế tiếp ghi đè; không đụng token. |
| Chung cho (a)(b)(c) | OS reduce motion vẫn luôn được tôn trọng; không thêm đồng bộ đa tab hay server (R03). |
| Phạm vi ảnh hưởng | Không đổi GPS sampling, consent, trip lifecycle, âm thanh/cảnh báo an toàn, dữ liệu realtime, API payload. |

Không thêm theme sáng/tối, ngôn ngữ, push notification, "giữ đăng nhập" (đã bị gỡ có chủ đích — `LoginForm.tsx:6–16`).

### 4.5. Trợ giúp (FR-WEBHELP)

Mục lục ngắn hoặc heading nối tiếp; không bắt buộc accordion/search. Nội dung tối thiểu và route đích có thật (`apps/web/src/App.tsx:21–29`):

| Chủ đề | Route đích | Ràng buộc nội dung |
|---|---|---|
| Đăng nhập/phiên hết hạn | `/login` | Không yêu cầu gửi mật khẩu/JWT cho ai. |
| Quản lý xe | `/vehicles` | Khớp thêm/sửa/xoá/chọn xe hoạt động hiện có. |
| Xem vị trí chuyến đi | `/start-trip` | Trang chỉ **xem** chuyến đang active; bắt đầu/kết thúc chuyến làm trên mobile. Tên route không có nghĩa web bắt đầu được chuyến. Không khẳng định "không có vị trí" luôn nghĩa là không có chuyến (WEB-G07). |
| Lịch sử/thống kê | `/trip-history` | Mô tả filter/biểu đồ hiện có, không thêm metric. |
| Quyền riêng tư | `/account/privacy` | Chỉ link; nội dung theo §4.3. |
| Lỗi thường gặp | — | Mất mạng, phiên hết hạn, bản đồ chưa có vị trí; không hứa khôi phục dữ liệu/cấp quyền không có cơ chế; không yêu cầu ảnh khuôn mặt. |

`/offline-sync` còn placeholder (`App.tsx:25`) — không được mô tả là chức năng web đầy đủ. Không có kênh liên hệ/ticket/form "gửi thành công" giả; chỉ thêm kênh liên hệ khi chủ dự án xác nhận có bên vận hành. Không đưa số step nội bộ/debug flag vào nội dung cho người dùng cuối.

### 4.6. Responsive/adaptive (NFR-RWD)

- Dưới 1024 CSS px: header + nút mở menu (drawer); từ 1024: sidebar cố định.
- Field/card xếp theo không gian container thực, không chỉ thêm cùng một breakpoint vào mọi component.
- Drawer: có accessible name; quản lý focus khi mở; đóng bằng Escape/nút đóng/bấm ngoài; trả focus về nút mở; chọn route thì đóng; menu ẩn không nhận Tab; resize qua 1024 không để kẹt scroll lock/backdrop hoặc nhân đôi tab stop.
- Mục tiêu vùng chạm control chính 44×44 CSS px là lựa chọn UX của NovaWay; đánh giá WCAG 2.5.8 riêng với ngưỡng 24×24 và ngoại lệ của nó.
- Tuyên bố hỗ trợ chỉ theo tổ hợp đã chạy và có evidence (§7.3). Không hứa "mọi thiết bị", không tuyên bố đạt WCAG từ việc viết tiêu chí. Browser emulation/WebKit automation không thay thế Safari trên iPhone thật.

### 4.7. Hai phạm vi nghiệm thu: gate merge Windows và gate công bố hỗ trợ thiết bị (R05)

Đây là đính chính sau review vòng 1. Mỗi micro-step RWD có **hai** phạm vi nghiệm thu tách biệt. Không phạm vi nào được dùng để che phạm vi kia.

| Phạm vi | Gồm | Môi trường | Khi chưa chạy |
|---|---|---|---|
| **Gate merge (Windows)** — điều kiện để merge PR của step | Test mục tiêu của step trên ma trận C/F/B/Z (Chromium, Firefox, touch/DPR emulation), regression nghiệp vụ, `npm run lint/test/build`, required PR checks. AC áp dụng: các AC-RWD của step **trừ** AC-RWD-11 và **trừ** phần bàn phím ảo thật của AC-RWD-06. | Windows; không cần Mac/iPhone/Android | Chặn merge. Không được tự miễn trong PR. |
| **Gate công bố hỗ trợ thiết bị** — điều kiện để công bố "hỗ trợ Safari iPhone" hoặc "hỗ trợ Android Chrome" | AC-RWD-11, phần bàn phím ảo thật của AC-RWD-06, các hàng ma trận có nhóm H (WEB-VH1, WEB-VH2) | iPhone thật (Safari) và/hoặc thiết bị Android thật. Mac chỉ cần nếu dùng Safari Web Inspector để thu evidence. | Ghi **NOT_RUN**, không tính PASS. **Không** chặn gate merge Windows. **Có** chặn việc công bố hỗ trợ thiết bị tương ứng. |

Quy tắc:

- Một step RWD được ghi "gate merge Windows PASS" khi đủ phạm vi thứ nhất. Trạng thái thiết bị ghi riêng theo từng thiết bị (`WEB-VH1`, `WEB-VH2`): NOT_RUN, PASS hoặc FAIL.
- Không dùng một chữ "COMPLETED" chung khi gate thiết bị còn NOT_RUN. `WEB-13` ghi kết quả theo **từng phạm vi** và từng thiết bị.
- Emulation không được ghi thay cho cột thiết bị thật.
- Cần Mac/iPhone/Android thật **chỉ** khi muốn đóng gate công bố hỗ trợ thiết bị; không cần cho bất kỳ gate merge nào của `WEB-01`…`WEB-12`.

## 5. Ma trận viewport và môi trường (WEB-V)

Kích thước là CSS px; DPR và touch ghi riêng. Tên nhóm là lớp kích thước, không xác nhận model thiết bị. Toàn bộ cột Actual: **NOT_RUN**.

| ID | Viewport / điều kiện | Mục đích | Engine/thiết bị đề xuất | Mức chạy | Actual |
|---|---|---|---|---|---|
| WEB-V01 | 320×568 | Bề rộng nhỏ; reflow text/form/menu | Chromium, DPR 1 + touch emulation | Mỗi PR layout liên quan | NOT_RUN |
| WEB-V02 | 360×800 | Điện thoại hẹp | Chromium, touch, DPR 2 | PR shell/account/form/map | NOT_RUN |
| WEB-V03 | 390×844 | Điện thoại đứng | Chromium emulation; đối chiếu Safari thật khi có | Smoke toàn route | NOT_RUN |
| WEB-V04 | 430×932 | Điện thoại rộng | Chromium touch | Trước release đợt | NOT_RUN |
| WEB-V05 | 844×390 | Điện thoại ngang, chiều cao thấp | Chromium touch; Safari thật bổ sung | Shell/menu/form/map | NOT_RUN |
| WEB-V06 | 768×1024 | Tablet đứng | Chromium touch | Shell/account/vehicles | NOT_RUN |
| WEB-V07 | 1024×768 | Tablet ngang, biên drawer/sidebar | Chromium touch + mouse | Shell/map/analytics | NOT_RUN |
| WEB-V08 | 1280×720 | Laptop thấp | Chromium; Edge thật nếu có | Mỗi PR | NOT_RUN |
| WEB-V09 | 1440×900 | Desktop trung bình | Chromium + Firefox | Smoke trước release | NOT_RUN |
| WEB-V10 | 1920×1080 | Desktop rộng, độ dài dòng | Chromium | Trước release | NOT_RUN |
| WEB-VB1 | 639/640/641 × 800 | Biên `sm` của form/cards | Chromium | Form/analytics | NOT_RUN |
| WEB-VB2 | 767/768/769 × 800 | Biên `md` | Chromium | Dashboard/shell | NOT_RUN |
| WEB-VB3 | 1023/1024/1025 × 800 | Biên `lg` và drawer | Chromium, resize hai chiều | Shell/login/account | NOT_RUN |
| WEB-VZ1 | Text-only 200% tại 390×844 và desktop | Giữ chữ/control đầy đủ | Firefox hoặc môi trường hỗ trợ tăng riêng text | Form/account/menu | NOT_RUN |
| WEB-VZ2 | Desktop 1280px, browser zoom 400% | Reflow tương đương 320 CSS px | Browser thật; ghi CSS viewport sau zoom | Toàn route; ngoại lệ map trong phạm vi map | NOT_RUN |
| WEB-VZ3 | Browser zoom 200% tại desktop | Focus, menu, form | Chromium/Firefox | Smoke toàn route | NOT_RUN |
| WEB-VH1 | Android Chrome thật: portrait/landscape, bàn phím | Visual viewport/keyboard/touch thật | Thiết bị mượn/test device | Trước tuyên bố hỗ trợ Android browser | NOT_RUN — cần thiết bị |
| WEB-VH2 | iPhone Safari thật: portrait/landscape, safe area, toolbar, bàn phím | Hành vi Safari iOS thật | iPhone do người dùng cung cấp | Gate hỗ trợ Safari iPhone | NOT_RUN — cần thiết bị |

Ngưỡng 320px và zoom/text bám W3C SC 1.4.10/1.4.4 (§7.4). Các kích thước khác là lựa chọn coverage của NovaWay. Biên 640/768/1024 bám class `sm/md/lg` đang dùng; trước khi chạy phải xác nhận breakpoint thật trong bản build.

## 6. Route × trạng thái × nhóm viewport (WEB-T)

Nhóm: **C** = V01/V03/V08; **F** = V01–V10; **B** = biên liên quan; **Z** = VZ1–VZ3; **H** = VH1/VH2. Mỗi hàng lưu actual riêng cho từng lần chạy; không điền một PASS chung cho mọi tổ hợp. Nhóm **H** thuộc gate công bố hỗ trợ thiết bị (§4.7): NOT_RUN không tính PASS, không chặn gate merge Windows, nhưng chặn việc công bố hỗ trợ thiết bị đó.

| ID | Route / vùng | Trạng thái dữ liệu và thao tác | Viewport tối thiểu | AC liên quan | Actual |
|---|---|---|---|---|---|
| WEB-T01 | `/login` | Trống; credential lỗi; submitting; token sẵn + `/me` 401/500/network/timeout; "Đăng nhập lại" từ trạng thái lỗi; đăng nhập B khi `/me` của A đang chờ; text dài; keyboard | C + V05 + VB3 + Z + H | AC-WEBSESSION-01→05, AC-WEBSESSION-07, AC-WEBSESSION-08, AC-RWD-01/04/06 | NOT_RUN |
| WEB-T02 | Shell/menu | Authenticated; mở/đóng drawer; dropdown tài khoản; đổi route; Escape; trả focus; email dài; chiều cao thấp | F + VB3 + Z + H | AC-RWD-01→04/10/11 | NOT_RUN |
| WEB-T03 | `/dashboard` | Card "—"; badge Online tĩnh; text wrap; không biến thành metric thật | C + VB2/VB3 + Z | AC-RWD-01/12 | NOT_RUN |
| WEB-T04 | `/vehicles` (list) | Loading; API error; empty; 1 xe; nhiều xe; active; `brand_model` dài; confirm delete; action error | C + V05/V06/V07 + Z | AC-RWD-05/09/10/12 | NOT_RUN |
| WEB-T05 | Form xe | Create/edit; required rỗng; hợp lệ; validation/API error; submitting; cancel; bàn phím ảo; text zoom | C + VB1/VB3 + Z + H | AC-RWD-06/12 | NOT_RUN |
| WEB-T06 | `/start-trip` | Không trip; trip chưa có vị trí; connected có vị trí/trail; disconnected/error; lỗi tile; resize | C + V05/V07 + VB3 + Z + H | AC-RWD-07 | NOT_RUN |
| WEB-T07 | `/trip-history` | Loading/error/empty; filter car/motorbike; ít/nhiều trip; số lớn; nhãn dài; tooltip/legend | C + V06/V07/V09 + VB1 + Z | AC-RWD-08/12 | NOT_RUN |
| WEB-T08 | `/account/profile` (sau `WEB-09`) | Email hợp lệ/dài; deep link; reload; logout/login tài khoản khác; 401/network | C + V06 + Z | AC-WEBPROFILE-01→04 | NOT_RUN ở phạm vi ma trận đầy đủ — màn đã triển khai ở WEB-09; kết quả theo từng tổ hợp ở §7.3 (`W09-*`) |
| WEB-T09 | `/account/privacy` (sau `WEB-11`) | Nội dung dài; heading/link; keyboard; không phát request consent/GPS/camera | C + V06 + Z | AC-WEBPRIVACY-01→06 | NOT_RUN — màn hiện placeholder |
| WEB-T10 | `/settings` (sau `WEB-12`) | Mặc định; hai lựa chọn; OS reduce motion; reload; A→B; storage đọc lỗi / ghi lỗi (quota) / giá trị hỏng; resize | C + V06 + Z | AC-WEBSETTINGS-01→08 | NOT_RUN — setting là đặc tả mới |
| WEB-T11 | `/help` (sau `WEB-10`) | Mục lục/link; text dài; keyboard; quay về route; không nêu tính năng chưa có | C + V06 + Z | AC-WEBHELP-01→05 | NOT_RUN ở phạm vi ma trận đầy đủ — màn đã triển khai ở WEB-10; kết quả theo từng tổ hợp ở §7.3 (`W10-*`) |
| WEB-T12 | Route bảo vệ/404/logout | Không token; token hết hạn; logout rồi Back; URL lạ; không lộ dữ liệu qua UI cache | C + V05 + Z | AC-WEBSESSION-01/06/07/09, AC-WEBPROFILE-04 | NOT_RUN |

WEB-T06 ghi nhận hiện trạng WEB-G07; không mặc định yêu cầu `WEB-07` sửa lại state machine của map. WEB-T03 không dùng kiểm thử RWD để phê duyệt số liệu dashboard tĩnh.

## 7. Phương pháp kiểm thử, dữ liệu và evidence

### 7.1. Cách đánh giá layout

- Kiểm cả `document` lẫn container scroll và bounding box của control/text; `overflow-hidden` có thể giấu lỗi dù trang không có scrollbar. Không kết luận PASS từ một phép so `scrollWidth/clientWidth`.
- Chụp ảnh mỗi trạng thái quan trọng, ghi CSS viewport, DPR, browser/version, zoom. Nội dung dưới fold nhưng cuộn tới được khác với nội dung bị cắt.
- Map được pan hai chiều trong canvas; sidebar, overlay trạng thái, action, attribution vẫn phải tiếp cận được. Ngoại lệ reflow của map không áp dụng cho toàn trang.
- Zoom 400%, text-only 200% và viewport nhỏ là ba phép kiểm khác nhau; đặt viewport 320px không được ghi thành đã đo browser zoom.
- Keyboard: Tab/Shift+Tab, Enter/Space, Escape cho drawer/dropdown; kiểm accessibility tree, không chỉ ảnh.
- Animation: thử OS reduce motion và preference của app; dữ liệu map vẫn đổi, chuyển động trang trí giảm.

### 7.2. Dữ liệu và môi trường

- Tài khoản/dữ liệu test trong môi trường isolated; email tổng hợp; không chụp email cá nhân; không dùng tài khoản hay dữ liệu production.
- Trạng thái lỗi/layout hiếm có thể dùng response fixture; evidence phải ghi **fixture UI**, không gọi là E2E API thật. Error body theo `docs/API_CONTRACT.md` §8 và cách parse của `apps/web/src/lib/apiClient.ts:27–33`. Không tạo route/field giả như thể API production đã có.
- Giữ ít nhất một lượt regression với backend thật cho auth + vehicle + quan sát trip + analytics (`docs/TEST_STRATEGY.md` §3).
- Storage/error là injection trong môi trường test; không sửa cấu hình người dùng thật; không cần raw GPS thật, biometric thật hay thiết bị đang tracking.

### 7.3. Evidence record (điền khi thực thi)

| Run ID | Commit | Test ID | Browser/version | CSS viewport/DPR | Zoom/text scale | Touch/keyboard | Backend thật/fixture | Expected | Actual | Result | Evidence path | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W01-R1 | base `3cf62b2` (trước sửa) | Tái hiện WEB-G05 và response phiên cũ | Chromium 149.0.7827.55 (Playwright 1.61.1) | 1280×720 / DPR 1 | 100% | Chuột | Fixture UI | Thoát màn chờ; `/login` không unhandled rejection; `401` muộn của A không xoá token B | Kẹt màn chờ sau 4 giây, 0 nút; `/login` có unhandled rejection; token B bị xoá | FAIL — lỗi được tái hiện trước sửa | `docs/REVIEW_NOTES.md` §40.1 | WEB-G05 |
| W01-R2 | nhánh `fix/web-session-check-recovery` | AC-WEBSESSION-01→09 ở tầng service/storage/state | Không trình duyệt: Vitest 4.1.10, Node 24.17.0 | — | — | — | `fetch` và storage stub; service thật | Theo AC | 92/92 pass (61 test mới) | PASS (local) | `apps/web/src/services/authSession.spec.ts`, `apps/web/src/services/authService.spec.ts` | — |
| W01-R3 | nhánh `fix/web-session-check-recovery` | AC-WEBSESSION-01→05, 07→09 trên UI | Chromium 149.0.7827.55 (Playwright 1.61.1) | 1280×720 / DPR 1 | 100% | Chuột + nhập form | Fixture UI | Theo AC | 26/26 pass | PASS (local) | `apps/web/e2e/session-check.fixture.spec.ts` | — |
| W01-R4 | nhánh `fix/web-session-check-recovery` | AC-WEBSESSION-01/06 regression + golden path + 404 | Chromium 149.0.7827.55 (Playwright 1.61.1) | 1280×720 / DPR 1 | 100% | Chuột + nhập form | Backend thật (local, database tạm) | Theo AC | 5/5 pass | PASS (local) | `apps/web/e2e/session-auth-regression.spec.ts` | Rate limit 5 lần/phút: không chạy hai lượt trong một phút |
| W01-R5 | head `34daf0d` (trước sửa vòng 2) | R01: hook thật, thất bại → retry → unmount → response muộn; R02: `/login` retry đang chờ | Chromium 149.0.7827.55 (Playwright 1.61.1) | 1280×720 / DPR 1 | 100% | Chuột | Hook thật + transport fixture; fixture UI | Unmount huỷ retry; `/login` có trạng thái bận | Hook: 8/12 fail (retry không bị abort, `401` muộn xoá token, `200` muộn đặt user); `/login`: 2/2 fail (không có `role="status"`) | FAIL — defect của review vòng 1 được tái hiện | `docs/REVIEW_NOTES.md` §41.2 | R01, R02 |
| W01-R6 | nhánh `fix/web-session-check-recovery` (sau sửa vòng 2) | AC-WEBSESSION-03/09 với hook thật: unmount huỷ retry; mount mới tiếp quản; StrictMode | Chromium 149.0.7827.55 (Playwright 1.61.1) | 1280×720 / DPR 1 | 100% | Chuột | Hook, store, service, apiClient thật; transport fixture bỏ qua abort | Theo AC | 12/12 pass | PASS (local) | `apps/web/e2e/session-check.hook.spec.ts`, `apps/web/e2e/harness/sessionCheckHarness.tsx` | Không chạy trên site đã deploy. **Kết quả này không ổn định (R03):** test chưa chờ unmount/cleanup; CI tại `43f10f0` là 44 passed + 1 flaky, Chrome 154 fail 11/60 lượt. Thay bằng W01-R9/R10 |
| W01-R7 | nhánh `fix/web-session-check-recovery` (sau sửa vòng 2) | AC-WEBSESSION-01→05, 07→09 trên UI, gồm trạng thái bận trên `/login` | Chromium 149.0.7827.55 (Playwright 1.61.1) | 1280×720 / DPR 1 | 100% | Chuột + nhập form | Fixture UI | Theo AC | 28/28 pass | PASS (local) | `apps/web/e2e/session-check.fixture.spec.ts` | — |
| W01-R8 | nhánh `fix/web-session-check-recovery` (sau sửa vòng 2) | Tầng service/storage/state + regression backend thật | Vitest 4.1.10; Chromium 149.0.7827.55 | 1280×720 / DPR 1 | 100% | Chuột + nhập form | Vitest: `fetch` stub; E2E: backend thật (database test cô lập) | Theo AC | Vitest 100/100; backend thật 5/5 | PASS (local) | `apps/web/src/services/authSession.spec.ts`, `apps/web/e2e/session-auth-regression.spec.ts` | Retry cả test regression có thể vượt rate limit (§41.4 N01, đính chính ở §42.5) |
| W01-R9 | head `43f10f0` (test trước sửa vòng 3; code sản phẩm không đổi) | R03: 12 ca hook × 5 lượt, `retries=0` | Chrome 154.0.8037.98 (bản cài sẵn, cấu hình ngoài Git) | 1280×720 / DPR 1 | 100% | Chuột | Hook thật + transport fixture | Ổn định, không cần retry | 49 pass / 11 fail; `mount()` trả về trước khi React unmount/cleanup | FAIL — test có race, được tái hiện | `docs/REVIEW_NOTES.md` §42.1, §42.3 | R03 |
| W01-R10 | nhánh `fix/web-session-check-recovery` (sau sửa vòng 3, chỉ test/harness) | AC-WEBSESSION-03/09 với hook thật, có hàng rào unmount/cleanup; 12 ca × 5 lượt, `retries=0` | Chrome 154.0.8037.98 và Chromium 149.0.7827.55 | 1280×720 / DPR 1 | 100% | Chuột | Hook, store, service, apiClient thật; transport fixture bỏ qua abort | Theo AC, không flaky | 60/60 trên mỗi trình duyệt; 28 fixture + 12 hook 40/40 trên mỗi trình duyệt; toàn bộ suite với backend thật 45/45, `retries=0` | PASS (local) | `apps/web/e2e/session-check.hook.spec.ts`, `apps/web/e2e/harness/sessionCheckHarness.tsx` | Không chạy trên site đã deploy |

Các dòng `W01-*` là kết quả local của người triển khai `WEB-01` cho AC-WEBSESSION, chạy ở một cấu hình Desktop Chrome duy nhất; chúng **không** phải kết quả của ma trận `WEB-V*`/`WEB-T*` (vẫn NOT_RUN ở §5–§6). `W01-R1`…`R4` là của head `34daf0d`, đã qua review độc lập vòng 1 với kết luận CHANGES_REQUESTED; `W01-R5`…`R8` là của head `43f10f0`, đã qua re-review vòng 2 (R01/R02 được xác nhận, R03 mở); `W01-R9`…`R10` là của vòng sửa R03 và chưa qua re-review. Kết quả do reviewer tự chạy không nằm trong bảng này (xem `docs/REVIEW_NOTES.md` §41.5, §42.7). Bảng AC → test: §40.3, bổ sung ở §41.2 và §42.

Các dòng `W02-*` dưới đây chỉ xác nhận shell/navigation của WEB-02, không đánh PASS toàn bộ route/ma trận RWD. Required PR checks đang chờ tại commit ghi record; gate thiết bị vẫn NOT_RUN.

| Run ID | Commit | Test ID | Browser/version | CSS viewport/DPR | Zoom/text scale | Touch/keyboard | Backend thật/fixture | Expected | Actual | Result | Evidence path | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W02-R1 | nhánh `feat/web-responsive-navigation` | AC-RWD-01→04/09, keyboard của -10; WEB-T02/T12 shell subset | Chrome 154.0.8037.98 | 320×568, 844×390, 1024×768, 1280×720; biên1023/1024/1025; touch case390×844/DPR2 | 100%; ca riêng root CSS font32px (stress) | Mouse/keyboard; touch emulation có tap riêng | Fixture API, UI thật | Shell/menu/form-state/focus/logout theo AC | 15/15 pass, retries0 | PASS local | `apps/web/e2e/responsive-navigation.fixture.spec.ts`; REVIEW_NOTES §44 | Không thay gate toàn route/thiết bị |
| W02-R2 | nhánh `feat/web-responsive-navigation` | WEB-VZ2/VZ3, shell/menu subset | Chrome154.0.8037.98 | Content1280×720 ở100%; CSS640×360/DPR2 ở200%; CSS320×180/DPR4 ở400% | Browser zoom thật200%/400%, rootfont16px | Mouse/keyboard | Fixture UI | Control/menu/focus tiếp cận được sau animation | PASS, đo bbox và capture surface | PASS local (Lead) | REVIEW_NOTES §44.3 | Không phải CSS zoom/viewport resize |
| W02-R3 | nhánh `feat/web-responsive-navigation` | WEB-VZ1, shell/menu subset | Firefox144.0 | 390×844 và1280×720/DPR1 qua viewport BiDi | Native text-only200%; font14→28px, glyph19→37px | Mouse/keyboard | Fixture UI | Width/DPR giữ nguyên, text/action đọc được | PASS | PASS local (Lead) | REVIEW_NOTES §44.3 | Firefox bundled151 không launch; dùng144 profile tạm |
| W02-R4 | nhánh `feat/web-responsive-navigation` | AC-RWD-10, tên control selected spot-check | Narrator10.0.26100.8972 + Chrome154 | 390×844/DPR1 | 100% | Narrator Speech recap thật | Fixture user tổng hợp, UI thật | Tên/vai trò được trình đọc nhận diện | Dialog/close/account/nav/3menuitems đọc đúng | PASS selected-name spot-check (Lead) | REVIEW_NOTES §44.3 | Không claim full Narrator navigation/WCAG; cleanup cần người dùng tắt |

W02 đã merge và required checks PASS theo REVIEW_NOTES §45; bảng W02 là snapshot local. Các dòng W03 chỉ xác nhận login subset; thiết bị/bàn phím thật vẫn NOT_RUN. Diễn giải AC-RWD-06 cho login: §46, không thêm hành vi form xe.

| Run ID | Commit | Test ID | Browser/version | CSS viewport/DPR | Zoom/text scale | Touch/keyboard | Backend thật/fixture | Expected | Actual | Result | Evidence path | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W03-R1 | base `1c02617` trước sửa | Credential error dài, AC-RWD-01/04 | Chrome154 | 320×568/DPR1 | Root CSS font32px, không native zoom | Mouse/input | Fixture UI | Nội dung không tràn/che | Paragraph rộng670px/scrollWidth3437px, parent che phần tràn | FAIL — tái hiện baseline | REVIEW_NOTES §47.1 | Đã sửa layout |
| W03-R2 | nhánh `style/web-login-responsive`, snapshot hash §47.2 | WEB-T01 login subset, C/V05/VB3, error/busy/resize/keyboard/touch | Chrome154.0.8037.98 | 320/360/390/430,844×390,1024/1280,biên1023/1024/1025; touch390×844/DPR2 | 100%, ca riêng CSS root32px/reduced-height | Mouse/keyboard; touch tap riêng | Fixture API, UI thật | Form/notice/control/data/focus dùng được | 18/18 PASS, retries0 | PASS local (Frontend) | `apps/web/e2e/login-responsive.fixture.spec.ts`; REVIEW_NOTES §47 | Không phải bàn phím thật |
| W03-R3 | cùng snapshot §47.2 | Login+navigation+sessionUI+hook regression | Chrome154 | Các viewport fixture; hook1280×720 | Theo từng fixture | Mouse/keyboard/touch riêng | Fixture/hook thật, transport stub | Regression giữ nguyên auth | 73/73 PASS, retries0 | PASS local (Lead) | REVIEW_NOTES §47.3; bốn fixture/hook spec | Không backend thật trong lượt này |
| W03-R4 | cùng snapshot §47.2 | WEB-VZ2/VZ3 login | Chrome154 | Content1280×720 ở100%; CSS640×360/DPR2 ở200%; CSS320×180/DPR4 ở400% | Native browser zoom200%/400% | Mouse/input | Fixture UI | Text/control/error/busy tiếp cận, giữ value/token | 8 lượt trạng thái PASS | PASS local (Lead) | REVIEW_NOTES §47.3 | Không CSS zoom/emulation |
| W03-R5 | cùng snapshot §47.2 | WEB-VZ1 login | Firefox144 | Viewport BiDi390×844 và1280×720/DPR1, width giữ nguyên | Native text-only200%, heading20→40px | Mouse/input | Fixture UI | Text/control/value/token tiếp cận | 6 lượt trạng thái PASS | PASS local (Lead) | REVIEW_NOTES §47.3 | Không phải Firefox toàn suite hoặc thiết bị thật |
| W03-R6 | cùng snapshot §47.2 | Probe QA độc lập login | Chrome154 | 8empty/error/resize +3notice/retry-busy cấu hình | 100%; CSS root32px stress riêng | Mouse/keyboard | Fixture khác tác giả | Bbox/text/scroll/focus/values/token đúng | 11 lượt cấu hình PASS; không finding chặn | PASS independent technical review | REVIEW_NOTES §47.2 | Required CI còn chờ khi ghi |

W03 đã merge, required CI78/78 sạch theo REVIEW_NOTES §48; bảng W03 là snapshot local. W04 chỉ xác nhận Dashboard và regression StatCard dùng chung, không đánh PASS toàn Analytics hoặc mọi route.

| Run ID | Commit | Test ID | Browser/version | CSS viewport/DPR | Zoom/text scale | Touch/keyboard | Backend thật/fixture | Expected | Actual | Result | Evidence path | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W04-R1 | base `20b9bc5` trước sửa | WEB-T03 text/layout stress | Chrome154 | 320×568/DPR1 | Root CSS font32px, không native zoom | Mouse | Fixture UI | Badge/text/CTA không tràn main | Online/CTA vượt320px, caption/value bị tràn | FAIL — tái hiện baseline | REVIEW_NOTES §49.1 | Đã sửa layout |
| W04-R2 | nhánh `style/web-dashboard-responsive`, snapshot §49.2 | WEB-T03, shared StatCard regression | Chrome154 | C320/360/390/430,V05,1280; biên md/lg; touch390×844/DPR2 | 100%; CSS32 stress riêng | Mouse/keyboard/tap riêng | Fixture auth/trip/vehicle đúng contract | Layout/read-only action và static values giữ | 13/13 PASS, retries0 | PASS local (Frontend) | `apps/web/e2e/dashboard-responsive.fixture.spec.ts`; REVIEW_NOTES §49 | Không wire metric thật |
| W04-R3 | cùng snapshot §49.2 | Independent Dashboard probe + analytics regression | Chrome154 | 13 cấu hình +1test analytics desktop | 100%; CSS32 stress riêng | Mouse/keyboard/emulation | Fixture UI | Main/text/icon/grid/focus/API đúng | 13 lượt probe và1/1 analytics PASS; không finding chặn | PASS independent technical review | REVIEW_NOTES §49.2 | Native zoom và gates thuộc Lead |
| W04-R4 | cùng snapshot §49.2 | WEB-VZ2/VZ3 Dashboard | Chrome154 | Content1280×720 ở100%; CSS640×360/DPR2 và320×180/DPR4 | Native browser zoom200%/400% | Mouse/CTA click | Fixture UI | Card/text/action dùng được, statics giữ | 2 lượt PASS, action đúng `/start-trip` | PASS local (Lead) | REVIEW_NOTES §49.3 | Không start/end trip write |
| W04-R5 | cùng snapshot §49.2 | WEB-VZ1 Dashboard | Firefox144 | BiDi390×844 và1280×720/DPR1 | Native text-only200%, heading24→48px/glyph32→64px | Mouse/CTA click | Fixture UI | Width/DPR giữ, text/action dùng được | 2 lượt PASS, statics và route giữ | PASS local (Lead) | REVIEW_NOTES §49.3 | Không full Firefox regression/thiết bị |
| W04-R6 | cùng snapshot §49.2 | Dashboard+login+navigation+sessionUI+hook regression | Chrome154 | Theo từng fixture | Theo từng fixture | Mouse/keyboard/touch riêng | Fixture/hook thật, transport stub | Không regression auth/analytics/style | 86/86 PASS, retries0 | PASS local (Lead) | REVIEW_NOTES §49.3; năm fixture/hook spec | Backend-real và CI còn chờ khi ghi |

W04 đã merge, required CI91/91 sạch theo REVIEW_NOTES §50. W05 bên dưới giữ các snapshot/thất bại và đối chứng lịch sử; gate Windows đã đóng bằng final review/CI110/110 sạch, merge PR #92 `1041e37` (REVIEW_NOTES §53), không chỉ từ fixture mục tiêu xanh. Reader-ON focus cause vẫn OPEN/NOT_VERIFIED.

| Run ID | Commit | Test ID | Browser/version | CSS viewport/DPR | Zoom/text scale | Touch/keyboard | Backend thật/fixture | Expected | Actual | Result | Evidence path | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W05-R1 | base `d5c6d46` trước sửa | WEB-T04 baseline | Chrome channel; version NOT_CAPTURED (đính chính §52) | 320×568 | CSS root32px, không native zoom | Keyboard/mouse | Fixture UI | Tên/action trong main | Add/plate/brand/badge tràn; unnamed icon32px | FAIL baseline | REVIEW_NOTES §50–§52 | Đã sửa layout; open/cancel không phải lỗi focus đã xác nhận |
| W05-R2 | snapshot §51.2 | WEB-T04/AC-RWD05/09/10 | Chrome channel; author version NOT_CAPTURED | 320,844×390,768,1024,1280; resize; touch390×844/DPR2 | 100%; CSS32 stress riêng | Keyboard/mouse/tap riêng | Fixture API | List/actions/CRUD/focus đúng | 19/19; subset repeat3:18/18 PASS, retries0 | PASS local (author) | `apps/web/e2e/vehicle-list-responsive.fixture.spec.ts`; REVIEW_NOTES §51–§52 | Không thay VehicleForm WEB-06 |
| W05-R3 | snapshot §51.2 | Probe độc lập list/focus | Chrome155.0.8059.79 | 10 normal layouts +3 CSS32 stress; states/focus riêng | 100%; CSS32 stress riêng | Keyboard/mouse | Fixture riêng | Bbox/control/focus/token đúng | 24 PASS,1 NOT_VERIFIED actual background blur | PASS phần đã kiểm | REVIEW_NOTES §51.3 | hasFocus=false instrumented không phải blur thật |
| W05-R4 | snapshot §51.2 | WEB-VZ2/VZ3 | Chrome155.0.8059.79 | Content1280×720; CSS640×360/DPR2 và320×180/DPR4 | Native browser200%/400% | Mouse/cancel | Fixture UI | Long names/actions/inline dùng được | 2 lượt PASS;3 xe active/inactive | PASS local (Lead) | REVIEW_NOTES §51.3 | Không request ghi hoặc device claim |
| W05-R5 | snapshot §51.2 | WEB-VZ1 | Firefox144 | BiDi390×844,1280×720/DPR1 | Native text-only200%, heading24→48px | Mouse/cancel | Fixture UI | Width/DPR giữ,text/action dùng được | 2 lượt PASS | PASS local (Lead) | REVIEW_NOTES §51.3 | Không full Firefox regression |
| W05-R6 | snapshot §51.2 | AC-RWD10 selected-name | Narrator10.0.26100.8972/Chrome155 | Headed fixture desktop | 100% | Native Tab; actual Speech recap | Fixture UI | Hành động + xe + role được đọc | Activate vàEdit đọc đúng,2 tên | PASS selected spot-check (Lead) | REVIEW_NOTES §51.3 | Không mọi nút/full a11y audit; Narrator cleanup do user |
| W05-R7 | snapshot §51.2 | Full fixture/hook regression + repeat resize | Chrome155 | Theo từng fixture | Theo từng fixture | Keyboard/mouse/touch riêng | Fixture/hook transport stub | Không regression focus | 103/105 PASS,2 FAIL;repeat riêng5/6 | FAIL — đang điều tra | REVIEW_NOTES §51.3–§51.4 | Không skip/increase retry hoặc gán nguyên nhân chưa chứng minh |
| W05-R8 | snapshot §51.2 | Full fixture/hook tuần tự | Chrome155 | Theo từng fixture | Theo từng fixture | Keyboard/mouse/touch riêng | Fixture/hook transport stub | Regression sạch | 105/105 PASS, retries0 | PASS lượt local (Lead) | REVIEW_NOTES §52.2 | Không xoá failure cũ hoặc tự kết luận ổn định |
| W05-R9 | snapshot §51.2 | Hai ca resize×10, reader còn process | Chrome155 | WEB-VB3/reduced-height | 100% | Focus giữ qua resize | Fixture UI | Focus không mất | 14 PASS,6 FAIL; raw/pre-focus probe cũng còn fail | FAIL — nguyên nhân OPEN | REVIEW_NOTES §52.2 | Browser runner đơn; không đủ căn cứ quy lỗi concurrency |
| W05-R10 | snapshot §51.2 | Hai ca resize×10 sau user báo tắt reader | Chrome155 | Như R9 | 100% | Keyboard/focus | Fixture UI | Đối chứng reader-OFF | 18 PASS,2 FAIL; process vẫn có trước lượt | FAIL; không gọi đối chứng OFF sạch | REVIEW_NOTES §52.2 | Phân biệt user report và trạng thái process |
| W05-R11 | snapshot §51.2 | Hai ca resize×10, reader process không còn | Chrome channel | Như R9 | 100% | Keyboard/focus | Fixture UI | Regression của cấu hình reader-OFF sạch | Runner status passed, failedTests rỗng,20 ca cấu hình | PASS cấu hình đã kiểm (Lead) | REVIEW_NOTES §52.2 | Không chứng minh nguyên nhân/full reader-ON compatibility |
| W05-R12 | snapshot §51.2 + golden locator §52.1 | Golden-path/404/auth regression | Chrome channel | Desktop | 100% | UI + REST/WebSocket | Backend thật, DB test riêng, biometric mock | Flow hiện có giữ nguyên | 5/5 PASS, retries0 | PASS local (Lead) | `apps/web/e2e/golden-path.spec.ts`; REVIEW_NOTES §52.1 | Không AWS hoặc thiết bị thật; CI head mới còn chờ |
| W05-R13 | cùng snapshot R12 | Full suite cuối / Node gates | Chrome channel, binary155.0.8059.79 | Theo từng fixture; reader process0 trước/sau | Theo từng fixture | Keyboard/mouse/touch riêng | 105 fixture/hook +5 backend thật | Không regression | 110/110 PASS,exit0,retries0;lint/build/test exit0,unit web100/backend174 PASS | PASS local (Lead) | REVIEW_NOTES §52.3 | Không flaky/skip trong lượt cuối; CI head mới riêng, reader-ON nguyên nhân OPEN |

W06 — snapshot source/test và actual local theo REVIEW_NOTES §54, giữ nguyên thời điểm trước CI trong record. Final independent approval và CI131/131 sạch đã đóng gate Windows, PR #93 merge `d70bb83` (REVIEW_NOTES §55); không dùng local PASS thay CI. Gate thiết bị vẫn NOT_RUN.

| Run ID | Commit | Test ID | Browser/version | CSS viewport/DPR | Zoom/text scale | Touch/keyboard | Backend thật/fixture | Expected | Actual | Result | Evidence path | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W06-R1 | base `1041e37` trước sửa | WEB-T05 baseline | Chrome channel; version NOT_CAPTURED | 320×568; viewport1440×900/form280 | 100% | Mouse | Fixture UI | Control44px/container nhỏ một cột | Select36px; form280 vẫn ba cột | 2 FAIL baseline (author) | REVIEW_NOTES §54.1 | Không hồi tố version của lượt sau |
| W06-R2 | hash §54.1 | WEB-T05/AC-RWD06 | Chrome155.0.8059.79 | C/V05/V07,sm639/640/641,lg resize; touch390×844/DPR2 | 100%; CSS-root32 stress riêng | Keyboard/mouse/tap | Fixture UI | Form/error/payload/focus đúng | 21/21 PASS, retries0 | PASS local (author) | `apps/web/e2e/vehicle-form-responsive.fixture.spec.ts`; REVIEW_NOTES §54.3 | Không native keyboard/device |
| W06-R3 | cùng snapshot | Probe form độc lập | Chrome155.0.8059.79 | 16 create/edit layouts +2short-height và8 state/contract cases | 100%; CSS-root32 riêng | Keyboard/mouse | Fixture riêng | Label/error/control/data/focus/contract giữ | 26/26 PASS | PASS independent technical review | REVIEW_NOTES §54.2 | Không nhận test của tác giả là tự chạy |
| W06-R4 | cùng snapshot | WEB-VZ2/VZ3 form | Chrome155.0.8059.79 | Content1280×720; CSS640×360/DPR2 và320×180/DPR4 | Native browser200%/400% | Mouse/input/cancel | Fixture UI | Create/edit/pending/lỗi dài tiếp cận được | 4/4 PASS; values/payload giữ | PASS local (Lead) | REVIEW_NOTES §54.3 | Không real software keyboard |
| W06-R5 | cùng snapshot | WEB-VZ1 form | Firefox144 | BiDi390×844 và1280×720/DPR1 | Native text-only200%, label14→28px | Mouse/input/cancel | Fixture UI | Width/DPR giữ; form/error dùng được | 4/4 PASS create/edit | PASS local (Lead) | REVIEW_NOTES §54.3 | Không full Firefox/device regression |
| W06-R6 | cùng snapshot | Full regression/Node gates | Chrome155.0.8059.79 | Theo từng fixture; reader process0 trước/sau | Theo từng fixture | Keyboard/mouse/touch riêng | 126 fixture/hook +5 backend thật, DB test/mock providers | Không regression nghiệp vụ | 131/131 PASS,retries0; lint/build/test exit0,unit web100/backend174 | PASS local (Lead) | REVIEW_NOTES §54.3 | Required CI/final review riêng; reader-ON cause OPEN |

W07 — snapshot source/test và actual theo REVIEW_NOTES §56. Final independent approval và required CI146/146 sạch đã đóng gate Windows, PR #94 merge `f3052d4` (§57). Không dùng completed native passes để xoá diagnostic chưa xác minh; gate thiết bị NOT_RUN.

| Run ID | Commit | Test ID | Browser/version | CSS viewport/DPR | Zoom/text scale | Touch/keyboard | Backend thật/fixture | Expected | Actual | Result | Evidence path | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W07-R1 | base `d70bb83` | WEB-T06 baseline | Chrome155.0.8059.79 | 320×568; resize/container | 100% | Mouse | Real UI/hook/MapLibre, fixture transports/style | Speed/status không đè; canvas khớp | 1 FAIL overlay collision,1 PASS resize | Baseline measured (author) | REVIEW_NOTES §56.1 | Không coi canvas resize là defect |
| W07-R2 | hash §56.1 | AC-RWD07/WEB-T06 | Chrome155.0.8059.79 | C/V05/V07/VB3,320×180,touch/DPR2 | 100%; CSS-root32 riêng | Mouse/keyboard/tap | Real UI/hook/map, fixture REST/WS/style/tile | Layout/canvas/attribution/status/menu đúng, không web write | 15 ca×2=30/30 PASS,retries0 | PASS local (author) | `apps/web/e2e/live-map-responsive.fixture.spec.ts`; REVIEW_NOTES §56.2 | Không backend/provider/GPS thật |
| W07-R3 | cùng snapshot | Probe độc lập map | Chrome155.0.8059.79 | 7 viewport,states,resize,root32 | 100%; CSS stress riêng | Keyboard/mouse | Fixture riêng; real hook/map | Settled bounds/control/contract đúng | 22/22 +resize5/5 PASS; R1 đo sớm21/22 giữ riêng | PASS independent technical review | REVIEW_NOTES §56.2 | Poll actual layout, không sleep/retry/source sửa |
| W07-R4 | cùng snapshot | WEB-VZ2/VZ3 | Chrome155.0.8059.79 | 640×360/DPR2,320×180/DPR4 từ content1280×720 | Native browser200/400 | Mouse/keyboard | Synthetic REST/Socket.IO server/style; real UI/hook/map | Reflow/canvas/credit/menu tiếp cận được | Completed6 ca PASS; thêm6 menu geometry/Enter/Escape PASS | PASS phần actual đã kiểm (Lead) | REVIEW_NOTES §56.3–§56.4 | Không gộp lượt diagnostic timeout hoặc claim mọi capture sạch |
| W07-R5 | cùng snapshot | WEB-VZ1 | Firefox144 | BiDi390×844,1280×720/DPR1 | Native text-only200,18→36px | Mouse | Synthetic server/style; real UI/hook/map | Text tăng nhưng width/DPR giữ, label/credit dùng được | 6/6 PASS | PASS local (Lead) | REVIEW_NOTES §56.3 | Không full Firefox/device certification |
| W07-R6 | cùng snapshot | Native diagnostic ngoại lệ | Chrome155.0.8059.79 | 200/400% | Native zoom | Header hit/keyboard riêng | Synthetic transport/style | Phân biệt capture với UI defect | Một attempt timeout5s alignment; một số ảnh trống, cause NOT_VERIFIED; control thực tế dùng được | INCOMPLETE diagnostic, không tính PASS | REVIEW_NOTES §56.4 | Không speculative production fix |
| W07-R7 | cùng snapshot | Full regression/Node gates | Chrome155.0.8059.79 | Theo fixture; reader process0 | Theo fixture | Keyboard/mouse/touch riêng | 141 fixture/hook +5 backend thật | Không regression | 146/146 PASS,retries0; lint/build/test exit0,unit web100/backend174 | PASS local (Lead) | REVIEW_NOTES §56.3 | Golden-path không tự chứng minh backend-real map UI |
| W07-R8 | cùng snapshot | Actual backend → live map UI | Chrome155.0.8059.79 | 390×844/DPR1 | 100% | Real browser + API/WS harness | NestJS/Postgres/PostGIS thật, biometric mock, chỉ style fixture | Browser join, GPS persisted/broadcast, marker/speed cập nhật, end trip | 1/1 PASS;2 broadcast ack,24→31,marker move; no web write | PASS local integration diagnostic (Lead) | REVIEW_NOTES §56.3 | Ngoài CI; không GPS field/provider measurement |

W08 — snapshot v3 và actual local theo REVIEW_NOTES §58; final approval/required CI còn chờ. Hash v2 bị thu hồi sau native Firefox, không dùng36/24 PASS cũ thay kết quả trên v3. Diagnostic825/768 và giới hạn capture lịch sử giữ riêng, không công bố FIXED hoặc mọi ảnh đều settled.

| Run ID | Commit | Test ID | Browser/version | CSS viewport/DPR | Zoom/text scale | Touch/keyboard | Backend thật/fixture | Expected | Actual | Result | Evidence path | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W08-R1 | base `f3052d4` | WEB-T07 baseline | Chrome channel; version NOT_CAPTURED | 320×568 | 100% | Mouse/keyboard | Fixture REST, actual Analytics/Recharts | Control44px, non-hover data, glyph trong SVG | Height34, thiếu disclosure, nhãn số lớn ngoài SVG | FAIL baseline (author) | REVIEW_NOTES §58.1 | Lỗi selector diagnostic tách riêng; không hồi tố version final |
| W08-R2 | v3 hash §58.4 | AC-RWD-08/12 | Chrome155.0.8059.82 | 320…1440;sm/lg/container;touch390/DPR2 | 100%; CSS-root32 + synthetic Y34px riêng | Keyboard/mouse/tap | Fixture UI, actual services/Recharts | Filter/data/tổng/glyph/disclosure đúng | 18×2=36/36 PASS,retries0 | PASS local (author) | `apps/web/e2e/analytics-responsive.fixture.spec.ts`; REVIEW_NOTES §58.4 | Synthetic34px không phải nativeFirefox |
| W08-R3 | cùng v3 | Probe độc lập analytics | Chrome155.0.8059.82 | 320…1920,parent320@1440,sm/lg,CSS32 | 100%; CSS stress riêng | Keyboard/touchDPR2 | Fixture riêng, integer duration/warnings | Rawsum/filter/sort/unknown/sameday/contract/geometry đúng | 24/24 PASS, API GET/search rỗng/no-write | PASS independent technical review | REVIEW_NOTES §58.2/§58.4 | Reviewer cuối đối chiếu evidence, không nhận là tự chạy24ca |
| W08-R4 | v2 hash §58.1 | Native headroom diagnostic | Firefox144 | 390×844/DPR1 | Native text-only200 | Mouse | Synthetic HTTP, actual UI/Recharts | Glyph bbox trong SVG | Hai top tick vượt2.75px, paint clipping chưa xác minh | FAIL containment, freeze v2 thu hồi | REVIEW_NOTES §58.3 | Margin20→32, không sửa nghiệp vụ |
| W08-R5 | v3 hash §58.4 | WEB-VZ2/VZ3 | Chrome155.0.8059.82 | 640×360/DPR2,320×180/DPR4 từ physical1280×720 | Native browser200/400 | Keyboard/filter/menu | Synthetic HTTP, actual UI/Recharts | Glyph/legend/data/control/mark centers đúng | 6/6 PASS, post-All geometry stable4rAF; capture từng phần scroller | PASS local (Lead) | REVIEW_NOTES §58.4 | Ảnh gốc page.screenshot bị crop giữ riêng; không certification từng PNG |
| W08-R6 | cùng v3 | WEB-VZ1 | Firefox144 | 390×844,1280×720/DPR1 | Native text-only200, heading24→48 | Keyboard/filter | Synthetic HTTP, actual UI/Recharts | Reflow/glyph/legend/data đúng, width/DPR giữ | 6/6 latest PASS; top clearance9.25px; stable4rAF snapshot | PASS local (Lead) | REVIEW_NOTES §58.4 | Một attempt desktop825/768 causeOPEN; per-PNG helper caveat không đổi |
| W08-R7 | cùng v3 | Node/fresh DB gates | Node24 | N/A | N/A | CLI | DB test riêng, mock providers | Không regression | lint/build/test exit0, web100/backend174;11 migration/partition PASS | PASS local (Lead) | REVIEW_NOTES §58.4 | Full E2E và CI ghi riêng sau khi có actual |
| W08-R8 | cùng v3 | Full regression | Chrome155.0.8059.82 | Desktop1280×720; từng fixture có viewport riêng | Theo từng fixture | CLI/browser | 159 fixture/hook +5 backend thật | Không regression, không retry/flaky | 164/164 PASS, expected164/unexpected0/flaky0/skipped0,retries0 | PASS local (Lead) | REVIEW_NOTES §58.5 | Không gán nativeFirefox hoặc hardware cho suite này; CI riêng |
| W08-R9 | cùng v3 | Analytics backend-real | Chrome155.0.8059.82 | 390×844 | 100% | Mouse/browser | REST/WS thật, DB riêng, biometric mock;2 ended trips/2 loại xe | All/car/motorbike, totals/disclosure đúng; màn chỉ GET | 3/3 filter PASS, pageerror0; GPS persistence ACK trước end | PASS local (Lead) | REVIEW_NOTES §58.5 | Dữ liệu GPS tổng hợp, không thực địa; attempt đầu sai payload test giữ là FAIL setup |
| W09-R1 | base `1fc5517` (chưa sửa) | Full regression baseline | Chromium149.0.7827.55 | Theo từng fixture | Theo từng fixture | CLI/browser | Fixture + 5 backend thật (DB test riêng) | Không regression | 164/164, unexpected/flaky/skipped 0 | PASS baseline (tác giả) | REVIEW_NOTES §60.4 | — |
| W09-R2 | base `1fc5517` (chưa sửa) | WEB-T08 spec mới trên placeholder | Chromium149.0.7827.55 | 320…1280 | 100% + CSS-root32 | Chuột/bàn phím/touch | Fixture UI | Fail vì thiếu tính năng | 16 fail (thiếu "Email đăng nhập") / 3 pass (auth WEB-01) | FAIL đúng lý do | REVIEW_NOTES §60.4 | — |
| W09-R3 | nhánh `feat/web-account-profile-readonly` | WEB-T08: AC-WEBPROFILE-01…04, bàn phím, touch/DPR2 | Chromium149.0.7827.55 | 320×568, 390×844, 768×1024, 844×390, 1280×720; resize 1023/1024/1025 | 100%; CSS-root32 (stress, không phải zoom) | Chuột/Tab/Shift+Tab/Enter/tap | Fixture UI, request ghi method/path/Bearer | Theo AC | 19/19; ×5 = 95/95, retries0, 2 worker | PASS local (tác giả) | `apps/web/e2e/account-profile.fixture.spec.ts` | — |
| W09-R4 | cùng nhánh | Độ nhạy: 5 lỗi cấy vào trang | Chromium149.0.7827.55 | Như W09-R3 | Như W09-R3 | Như W09-R3 | Fixture UI | Mỗi lỗi bị bắt | truncate 8, editable 2, show-id 1, stale-cache 1, write-request 16 ca fail; khôi phục 19/19 | PASS độ nhạy | REVIEW_NOTES §60.4 | — |
| W09-R5 | cùng nhánh | WEB-VZ2/VZ3 trên hồ sơ, email dài | Chrome155.0.8059.82 | Cửa sổ 1280×720 → CSS 631×312/DPR2 và 315×156/DPR4 | Native browser zoom 200/400 (Preferences) | Tab tới link | Fixture transport, UI thật | Email đầy đủ, không cuộn ngang, link với tới | 2/2 PASS; ảnh toàn khung qua CDP | PASS local (tác giả, probe ngoài Git) | REVIEW_NOTES §60.5 | — |
| W09-R6 | cùng nhánh | Cỡ chữ mặc định Chrome 32px | Chrome155.0.8059.82 | CSS 1262×624/DPR1 | Native font-size setting (không phải text-only zoom) | Tab tới link | Fixture transport, UI thật | Như W09-R5 | 1/1 PASS | PASS local (tác giả) | REVIEW_NOTES §60.5 | — |
| W09-R7 | snapshot tác giả | WEB-VZ1 text-only 200 | Firefox | — | Native text-only 200 | — | — | — | — | NOT_RUN (tác giả) | REVIEW_NOTES §60.6 | Đã bổ sung Lead riêng W09-R9, không hồi tố tác giả |
| W09-R8 | cùng nhánh | Full regression + backend thật hồ sơ | Chromium149.0.7827.55 | Theo từng fixture; backend thật 1280×720 | Theo từng fixture | CLI/browser | 178 fixture/hook + 5 backend thật (DB test riêng, đã xoá) | Không regression | 183/183, unexpected/flaky/skipped 0, retries0, 2 worker | PASS local (tác giả) | REVIEW_NOTES §60.4 | F1 `ECONNRESET` 1 lượt trước đó, NOT_VERIFIED (§60.6) |
| W09-R9 | source/App nguyên hash §60; fixture comment-only §61 | WEB-VZ1 + valid-boundary | Firefox144 | 320×568,390×844,1280×720,DPR1 giữ | Native text-only200,heading24→48 | Tab/focus/Enter | Synthetic HTTP, actual UI; thường + local64/tổng254 hợp lệ | Không crop/overflow; đầu/cuối/link với tới | 6/6 PASS | PASS local (Lead), evidence reviewer đối chiếu | REVIEW_NOTES §61.2 | Không backend/hardware/fullFirefox certification |
| W09-R10 | cùng snapshot | Backend-real valid-boundary | Chrome155.0.8059.82 | 320×568 | 100% | Browser | REST thật/DB test riêng, không stub; register/login setup riêng | Đúng email64/254, không write từ trang | 1/1 PASS, GET `/auth/me`, pageerror0 | PASS local (Lead) | REVIEW_NOTES §61.2 | Fixture65/155 chỉ stress, đã đính chính §61.1 |
| W09-R11 | cùng snapshot | Node/full regression | Chrome155.0.8059.82 | Theo fixture | Theo fixture | CLI | 178 fixture/hook +5backend thật | Không regression | lint/build/test exit0,100web/174backend;full183/183,retries0,flaky/skipped0 | PASS local (Lead) | REVIEW_NOTES §61.2 | CI đúng head sau đính chính vẫn riêng |
| W10-R1 | base `fbed872` (chưa sửa) | Full regression baseline | Chromium149.0.7827.55 | Theo từng fixture | Theo từng fixture | CLI/browser | 178 fixture/hook + 5 backend thật (DB test riêng) | Không regression | 183/183, unexpected/flaky/skipped 0 | PASS baseline (tác giả) | REVIEW_NOTES §62, §63.4 | — |
| W10-R2 | routing base (`App.tsx` = `HEAD`, `/help` placeholder) | WEB-T11 spec mới trên placeholder | Chromium149.0.7827.55 | 320…1280 | 100% + CSS-root32 | Chuột/bàn phím/touch | Fixture UI | Fail vì thiếu tính năng | 34 fail (32 thiếu mục lục, 2 thiếu heading mục) / 3 pass (auth WEB-01) | FAIL đúng lý do | REVIEW_NOTES §63.4 | — |
| W10-R3 | nhánh `feat/web-help-center` | WEB-T11: AC-WEBHELP-01…05, nội dung, link route/section, guard | Chromium149.0.7827.55 | 320×568, 390×844, 768×1024, 844×390, 1280×720; resize 1025/1024/1023 + xoay | 100%; CSS-root32 (stress, không phải zoom) | Chuột/Tab/Shift+Tab/Enter/tap, touch DPR2 | Fixture UI, request ghi method/path/Bearer | Theo AC | 37/37; ×5 = 185/185, retries0, 2 worker | PASS local (tác giả) | `apps/web/e2e/help-center.fixture.spec.ts` | — |
| W10-R4 | cùng nhánh | Độ nhạy: 8 lỗi cấy vào nội dung/trang | Chromium149.0.7827.55 | Như W10-R3 | Như W10-R3 | Như W10-R3 | Fixture UI | Mỗi lỗi bị bắt | Mất H-11 2, thêm liên hệ 2, đảo mục 3, heading không focus 11, truncate 8, tự gửi request 32, link sai route 4, gọi geolocation 15 ca fail; khôi phục đúng hash | PASS độ nhạy | REVIEW_NOTES §63.4 | — |
| W10-R5 | cùng nhánh | WEB-VZ2/VZ3 trên `/help`: mục lục, anchor, link | Chrome155.0.8059.82 | Cửa sổ 1280×720 → CSS 631×312/DPR2 và 315×156/DPR4 | Native browser zoom 200/400 (Preferences) | Tab/Enter tới heading và link mục | Synthetic HTTP, UI thật | Không cuộn ngang, heading/link không bị che | 2/2 PASS; ảnh toàn khung qua CDP | PASS local (tác giả, probe ngoài Git) | REVIEW_NOTES §63.5 | — |
| W10-R6 | cùng nhánh | Cỡ chữ mặc định Chrome 32px | Chrome155.0.8059.82 | CSS 1262×624/DPR1 | Native font-size setting (không phải text-only zoom) | Tab/Enter | Synthetic HTTP, UI thật | Như W10-R5 | 1/1 PASS | PASS local (tác giả) | REVIEW_NOTES §63.5 | — |
| W10-R7 | cùng nhánh | WEB-VZ1 text-only 200 | Firefox144.0 headless (geckodriver0.37.1 có sẵn, WebDriver HTTP) | 1280×635/DPR1; cửa sổ yêu cầu 390/320 bị kẹp ở CSS 500×759 và 500×483 | Native text-only 200 (`ui.textScaleFactor`, `os-zoom-behavior=2`), `h1` 24→48px | Tab/Enter | Synthetic HTTP, UI thật | Như W10-R5 | 3/3 PASS (1280 và 500 CSS px) | PASS local (tác giả); 320/390 CSS px NOT_RUN | REVIEW_NOTES §63.5 | — |
| W10-R8 | cùng nhánh, lượt đầu | Full regression + backend thật | Chromium149.0.7827.55 | Theo từng fixture | Theo từng fixture | CLI/browser | 215 fixture/hook + 5 backend thật (DB test riêng) | Không regression | 217/220: 3 fail `responsive-navigation` đếm landmark navigation trên `/help` | FAIL — đã thu hẹp 3 assertion về nav shell, không retry | REVIEW_NOTES §63.2, §63.4 | — |
| W10-R9 | cùng nhánh, cuối | Full regression + backend thật | Chromium149.0.7827.55 | Theo từng fixture; backend thật 1280×720 | Theo từng fixture | CLI/browser | 215 fixture/hook + 5 backend thật (DB test riêng, đã xoá) | Không regression | 220/220, unexpected/flaky/skipped 0, retries0, 2 worker | PASS local (tác giả) | REVIEW_NOTES §63.4 | F1 `ECONNRESET` OPEN/NOT_VERIFIED (§63.6) |
| W10-R10 | mã sản phẩm `f0f32b5` + spec vòng 1 | Regression R01–R03/N01 trước khi sửa | Chromium149.0.7827.55 | 1280×720 | 100% | Bàn phím/chuột | Fixture UI | Fail đúng nguyên nhân | 37 pass / 5 fail: `#%` và `#%E0%A4%A` → fallback toàn app; id ngoài Help được focus; copy H-02/H-03 và H-23 | FAIL đúng lý do | REVIEW_NOTES §64.2, §64.4 | R01–R03, N01 |
| W10-R11 | nhánh, sau sửa vòng 1 | WEB-T11 + R01–R03/N01 | Chromium149.0.7827.55 | 320×568, 390×844, 768×1024, 844×390, 1280×720; resize 1025/1024/1023 + xoay | 100%; CSS-root32 (stress) | Chuột/Tab/Shift+Tab/Enter/tap, touch DPR2 | Fixture UI, request ghi method/path/Bearer | Theo AC + review | 42/42; ×5 = 210/210, retries0, 2 worker | PASS local (tác giả) | `apps/web/e2e/help-center.fixture.spec.ts` | — |
| W10-R12 | cùng nhánh | Độ nhạy: 13 lỗi cấy (5 mới + 8 vòng 1) | Chromium149.0.7827.55 | Như W10-R11 | Như W10-R11 | Như W10-R11 | Fixture UI | Mỗi lỗi bị bắt | 13/13 bị bắt (2/1/1/1/1 cho R01/R01b/R02/R03/N01; 2/2/3/14/8/35/5/15 cho M1–M8); khôi phục đúng hash | PASS độ nhạy | REVIEW_NOTES §64.4 | — |
| W10-R13 | cùng nhánh | WEB-VZ2/VZ3 + cỡ chữ 32px, kèm fragment hỏng | Chrome155.0.8059.82 | CSS 631×312/DPR2, 315×156/DPR4, 1262×624/DPR1 | Native zoom 200/400; native font-size 32 | Tab/Enter | Synthetic HTTP, UI thật | Không tràn, heading/link không bị che, fragment hỏng giữ Help | 3/3 PASS | PASS local (tác giả, probe ngoài Git) | REVIEW_NOTES §64.5 | — |
| W10-R14 | cùng nhánh | WEB-VZ1 text-only 200 | Firefox144.0 headless (geckodriver0.37.1 có sẵn; BiDi `setViewport`) | CSS 320×568, 390×844, 1280×720/DPR1 | Native text-only 200 (`browser.zoom.full=false`, default zoom 200%), h1 24→48px | Chỉ bàn phím (lượt riêng) + click mục lục | Synthetic HTTP, UI thật | Như W10-R13; `:focus-visible`, outline 2px | 3/3 PASS | PASS local (tác giả); lượt Lead tại `f0f32b5` là bằng chứng riêng | REVIEW_NOTES §64.5 | — |
| W10-R15 | cùng nhánh | Full regression + backend thật | Chromium149.0.7827.55 | Theo từng fixture; backend thật 1280×720 | Theo từng fixture | CLI/browser | 220 fixture/hook + 5 backend thật (DB test riêng, đã xoá) | Không regression | 225/225, unexpected/flaky/skipped 0, retries0, 2 worker | PASS local (tác giả) | REVIEW_NOTES §64.4 | F1 OPEN/NOT_VERIFIED |

Không đánh PASS iOS từ Chromium emulation hoặc WebKit trên máy khác. Record phải ghi rõ mỗi dòng thuộc phạm vi nào: gate merge Windows hay gate công bố hỗ trợ thiết bị (§4.7). Gate merge Windows có thể hoàn tất trước; trạng thái thiết bị còn thiếu giữ riêng là NOT_RUN và không chặn merge, nhưng chặn công bố hỗ trợ thiết bị đó. Evidence path trong record phải là đường dẫn tương đối trong repo/CI artifact, không phải đường dẫn máy cá nhân.

### 7.4. Nguồn tiêu chuẩn tham khảo

Chỉ là tiêu chí chọn lọc, không phải audit WCAG đầy đủ, không phải chứng nhận:

- [W3C — Understanding Reflow, SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): nội dung cuộn một chiều ở bề rộng tương đương 320 CSS px; ví dụ 1280px zoom 400%; thành phần cần bố cục hai chiều như bản đồ có ngoại lệ trong phạm vi thành phần.
- [W3C — Understanding Resize Text, SC 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html): text tăng tới 200% không mất nội dung/chức năng.
- [W3C — Understanding Target Size (Minimum), SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): 24×24 CSS px hoặc ngoại lệ (vd. spacing). Mục tiêu 44×44 của NovaWay là lựa chọn UX bổ sung.

## 8. Traceability: requirement → AC → test case → micro-step → nguồn

Định nghĩa đầy đủ của `FR-*`/`NFR-*` ở `docs/SRS.md` §1.15/§2.1; Given/When/Then của `AC-*` ở `docs/ACCEPTANCE_CRITERIA.md` §12; user story ở `docs/USER_STORIES.md` §5; edge case ở `docs/EDGE_CASES.md` §9; chiến lược test ở `docs/TEST_STRATEGY.md` §2.12. Test case = mức test + hàng ma trận; tên file test cụ thể do micro-step đặt.

| Requirement | User story | AC | Test case (mức + ma trận) | Micro-step | Nguồn hiện trạng / quyết định |
|---|---|---|---|---|---|
| FR-WEBSESSION-01 | US-W-05 | AC-WEBSESSION-01, -02 | Unit/component (Vitest) state machine; Playwright WEB-T01, WEB-T12 | WEB-01 | WEB-G05; `AppLayout.tsx:7,17–39` |
| FR-WEBSESSION-02 | US-W-05 | AC-WEBSESSION-01, -02, -06, -07 | Unit `authService` (401 vs khác); component error/retry; Playwright "Đăng nhập lại" (token hợp lệ/không hợp lệ, mạng phục hồi, Browser Back); WEB-T01, WEB-T12 | WEB-01 | `authService.ts:24–37`; `authService.spec.ts:88–114`; `API_CONTRACT.md` §8 |
| FR-WEBSESSION-03 | US-W-05 | AC-WEBSESSION-03 | Unit timeout bằng fake timer; WEB-T01 (fixture treo) | WEB-01 | WEB-D08; `apiClient.ts:21–41` |
| FR-WEBSESSION-04 | US-W-05 | AC-WEBSESSION-03, -04, -05, -08, -09 | Unit/integration ở tầng service + storage + context (không chỉ DOM): kết quả `/me` của A về sau khi B đăng nhập (`401` và `200`); logout/unmount/timeout/retry làm mất hiệu lực; retry trùng; WEB-T01, WEB-T12 | WEB-01 | `AppLayout.tsx:17–27`; `LoginPage.tsx:17–24` |
| FR-WEBPROFILE-01 | US-W-01 | AC-WEBPROFILE-01, -02 | Component + Playwright WEB-T08 | WEB-09 | WEB-D01; `API_CONTRACT.md:44–48`; `authService.ts:5–8` |
| FR-WEBPROFILE-02 | US-W-01 | AC-WEBPROFILE-03 | Component (không field/request ghi); network inspection WEB-T08 | WEB-09 | WEB-G02; `DATA_MODEL.md:14–22` |
| FR-WEBPROFILE-03 | US-W-01 | AC-WEBPROFILE-04 | Playwright A→logout→B, Back; WEB-T08, WEB-T12 | WEB-09 | `Sidebar.tsx:41–45`; `authService.ts:43–45` |
| FR-WEBPRIVACY-01 | US-W-02 | AC-WEBPRIVACY-01, -06 | Content review theo Privacy Content Gate; Playwright WEB-T09 | WEB-11 | WEB-D03; `SRS.md:116–122,165–167` |
| FR-WEBPRIVACY-02 | US-W-02 | AC-WEBPRIVACY-03, -04 | Playwright/network: không request consent/GPS/camera; WEB-T09 | WEB-11 | WEB-G04; `EDGE_CASES.md:12`; `ARCHITECTURE.md:90` |
| FR-WEBPRIVACY-03 | US-W-02 | AC-WEBPRIVACY-02 | Content review (chặn câu TTL không bằng chứng) | WEB-11 + Privacy Content Gate | WEB-G03; `SRS.md:121`; `DATA_MODEL.md:266` |
| FR-WEBPRIVACY-04 | US-W-02 | AC-WEBPRIVACY-05 | Content review | WEB-11 + Privacy Content Gate | `API_CONTRACT.md:119–155`; `SRS.md:146–147` |
| FR-WEBSETTINGS-01 | US-W-03 | AC-WEBSETTINGS-01, -06 | Component + Playwright WEB-T10 | WEB-12 | WEB-D04 |
| FR-WEBSETTINGS-02 | US-W-03 | AC-WEBSETTINGS-02 | Playwright `reducedMotion` emulation + preference; WEB-T10 | WEB-12 | WEB-G08; `index.css:114–127` |
| FR-WEBSETTINGS-03 | US-W-03 | AC-WEBSETTINGS-03 | Unit storage adapter (namespace/version/enum); Playwright reload, A→B | WEB-12 | WEB-D04; `authService.ts:3,17,40` |
| FR-WEBSETTINGS-04 | US-W-03 | AC-WEBSETTINGS-04, -07, -08 | Unit riêng từng ca: đọc lỗi (a), ghi lỗi/quota (b), giá trị hỏng/version lạ (c); WEB-T10 | WEB-12 | §4.4 |
| FR-WEBSETTINGS-05 | US-W-03 | AC-WEBSETTINGS-05 | Regression: request/state nghiệp vụ không đổi; WEB-T06 với preference bật | WEB-12 | FR-TRIP-*, FR-REALTIME-*, FR-WARNUI-* |
| FR-WEBHELP-01 | US-W-04 | AC-WEBHELP-02, -05 | Playwright link tới đúng route/section; WEB-T11 | WEB-10 | `App.tsx:21–29` |
| FR-WEBHELP-02 | US-W-04 | AC-WEBHELP-01 | Content review + WEB-T11 | WEB-10 | `ARCHITECTURE.md:90`; `TEST_STRATEGY.md:112`; `App.tsx:25` |
| FR-WEBHELP-03 | US-W-04 | AC-WEBHELP-03, -04 | Content review; kiểm không có form/ticket giả | WEB-10 | WEB-G02 (không có support route) |
| NFR-RWD-01 | US-W-06 | AC-RWD-02, -03 | Playwright WEB-VB3 resize hai chiều; WEB-T02 | WEB-02 | WEB-U01, WEB-U02; WEB-D06 |
| NFR-RWD-02 | US-W-06 | AC-RWD-01, -04, -05, -06, -07, -08 | Playwright theo C/F + Z; WEB-T01…T11 | WEB-02…WEB-08 | WEB-U01…U08 |
| NFR-RWD-03 | US-W-06 | AC-RWD-02, -05, -10 | Accessibility tree + keyboard; WEB-T02, WEB-T04 | WEB-02, WEB-05 | WEB-U09; `VehiclesPage.tsx:173–187` |
| NFR-RWD-04 | US-W-06 | AC-RWD-09 | Đo kích thước control; WEB-T02, WEB-T04 | WEB-02, WEB-05 | WEB-U09; `button.tsx:26,30` |
| NFR-RWD-05 | US-W-06 | AC-RWD-03, -11 | Gate merge Windows: resize/orientation (AC-RWD-03). Gate thiết bị: AC-RWD-11 trên WEB-VH1/VH2, NOT_RUN không tính PASS | WEB-02 (gate merge), WEB-13 (ghi gate thiết bị) | WEB-D07 |
| NFR-RWD-06 | US-W-06 | AC-RWD-11 | Evidence record §7.3, ghi theo từng phạm vi §4.7 và từng thiết bị | WEB-13 | WEB-G09; `playwright.config.ts:26` |
| NFR-RWD-07 | US-W-06 | AC-RWD-12 | Regression auth/vehicle/live/analytics với backend thật | WEB-02…WEB-08 | `TEST_STRATEGY.md:112`; WEB-G06 |

## 9. Ánh xạ ID của gói khảo sát → ID chính thức

| Mã gói khảo sát | ID chính thức | Ghi chú |
|---|---|---|
| P-SESSION-01 | FR-WEBSESSION-01…04 | |
| P-ACCOUNT-01 | FR-WEBPROFILE-01…03 | |
| P-PRIVACY-01 | FR-WEBPRIVACY-01…04 | |
| P-SETTINGS-01 | FR-WEBSETTINGS-01…05 | |
| P-HELP-01 | FR-WEBHELP-01…03 | |
| P-RWD-01 | NFR-RWD-01…07 | |
| P-AC-AUTH-01…06 | AC-WEBSESSION-01…06 | Giữ số thứ tự. AC-WEBSESSION-07 (R01) và -08, -09 (R02) thêm sau review vòng 1, không có mã P tương ứng. |
| P-AC-PRO-01…04 | AC-WEBPROFILE-01…04 | Giữ số thứ tự. |
| P-AC-PRI-01…06 | AC-WEBPRIVACY-01…06 | Giữ số thứ tự. |
| P-AC-SET-01…06 | AC-WEBSETTINGS-01…06 | Giữ số thứ tự. Sau review vòng 1 (R03): AC-WEBSETTINGS-04 thu hẹp thành ca đọc lỗi; thêm -07 (ghi lỗi) và -08 (giá trị hỏng). |
| P-AC-HELP-01…05 | AC-WEBHELP-01…05 | Giữ số thứ tự. |
| P-AC-RWD-01…12 | AC-RWD-01…12 | Giữ số thứ tự. |
| D01…D06 | WEB-D01, WEB-D03, WEB-D04, WEB-D05, WEB-D06, WEB-D07 | D01→D01, D02→D03, D03→D04, D04→D05, D05→D06, D06→D07. WEB-D02 (không đổi API/DB) và WEB-D08 (timeout 15 giây) tách thành quyết định riêng. |
| G01…G09 | WEB-G01…G09 | |
| U01…U10 | WEB-U01…U10 | |
| V01…V10, VB1…VB3, VZ1…VZ3, VH1…VH2 | WEB-V01…V10, WEB-VB1…VB3, WEB-VZ1…VZ3, WEB-VH1…VH2 | |
| T01…T12 | WEB-T01…T12 | |
| E01…E38, X01…X03 | Trích dẫn trực tiếp `path:dòng` @`430e325`; X01…X03 → §7.4 | Không giữ mã E trong Git. |
| WEB-00…WEB-13 | Giữ nguyên | Đã đưa vào `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`. |

Tổng: 6 nhóm requirement → 19 `FR-*` + 7 `NFR-RWD-*`; 44 `AC-*` (9 + 4 + 6 + 8 + 5 + 12). Vòng 1 có 39 AC; thêm 5 AC sau review vòng 1.

## 10. Dependency và backlog ngoài WEB-00…WEB-13

| Backlog | Vì sao tách | Điều phải đặc tả trước code |
|---|---|---|
| Retention raw GPS 30 ngày (thiếu sót của FR-RETENTION-02 đã chốt, không phải feature mới) | Cleanup/DROP partition chưa có (`DATA_MODEL.md:266`); liên quan dữ liệu, idempotency | Cutoff UTC, bảo đảm tối đa 30 ngày thật (không chỉ DROP partition tháng), quan hệ `gps_event_dedup`/offline replay, backup/rollback, migration, test dữ liệu biên. Micro-step backend riêng; không gộp PR UI. |
| Hồ sơ có chỉnh sửa | Không có field/route (WEB-G02) | Field, validation, lỗi API, ownership, migration, xác minh email nếu đổi danh tính. |
| Đổi email/mật khẩu, quên mật khẩu, xoá/export tài khoản, quản lý phiên | Không có endpoint/lifecycle | Xác minh danh tính, vòng đời token/session, dữ liệu liên quan, lỗi nghiệp vụ. |
| Consent/điều khiển tracking từ web | `EDGE_CASES.md:12` còn OPEN; web/mobile tách | Quyền OS, trip active, offline queue, receipt/audit, revoke, an toàn khi lái. |
| Trạng thái live map chính xác | WEB-G07 | Loading/error/no trip/waiting GPS; contract nếu cần. |
| Dashboard metric/kết nối thật | WEB-G06 | Công thức, nguồn dữ liệu, refresh/staleness, phân biệt 0 và unknown. |
| Theme sáng/tối, ngôn ngữ, đồng bộ setting đa thiết bị | WEB-U10, WEB-G08 | Thiết kế + contract lưu trữ. |
| Test harness lớn (vd. thêm project Firefox/WebKit, công cụ a11y) | Có thể vượt scope một PR | Nếu cần, tách step infrastructure được duyệt trước khi code. |

## 11. Câu hỏi mở và quyết định chưa xác minh

Xem bảng đầy đủ ở `docs/REVIEW_NOTES.md` §35 (mục "Quyết định còn mở") và cập nhật sau review vòng 1 ở §36. Mục 7 của §35 (xoá token khi chủ động về đăng nhập) đã được chốt ở WEB-D09 (review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu, §37). Không mục nào khác được đóng bằng suy luận của tài liệu này.
