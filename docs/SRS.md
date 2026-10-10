# NovaWay — Software Requirements Specification (SRS) v0.1

> Step D0.2. Chưa yêu cầu code. Mỗi yêu cầu có mã định danh (`FR-xxx`, `NFR-xxx`) để `ACCEPTANCE_CRITERIA.md` và `TEST_STRATEGY.md` trace ngược lại. Nguồn: `docs/03_REQUIREMENT_DELTA_V0_2.md`, `docs/04_TECH_DECISION_RECORD.md`, `docs/05_MVP_SCOPE_DRAFT.md`.

## 0. Scope

SRS này bao phủ **MVP** của NovaWay: Backend (NestJS), Web Dashboard (React), Mobile App (Flutter). Post-MVP/R&D được đánh dấu rõ, không mô tả chi tiết ở đây (xem `PRD.md` §7–§8).

## 1. Functional Requirements

### 1.1. Authentication (FR-AUTH)

| ID | Yêu cầu |
|---|---|
| FR-AUTH-01 | Hệ thống cho phép người dùng đăng ký tài khoản (email/password tối thiểu cho MVP). |
| FR-AUTH-02 | Hệ thống cho phép đăng nhập, trả về JWT access token. |
| FR-AUTH-03 | Hệ thống có endpoint lấy thông tin người dùng hiện tại (`me`) dựa trên token hợp lệ. |
| FR-AUTH-04 | Request không có token hoặc token không hợp lệ tới endpoint được bảo vệ phải bị từ chối (401). |

### 1.2. Vehicle Management (FR-VEHICLE)

| ID | Yêu cầu |
|---|---|
| FR-VEHICLE-01 | Người dùng có thể tạo, xem, sửa, xoá phương tiện thuộc sở hữu của mình. |
| FR-VEHICLE-02 | Người dùng không thể xem/sửa/xoá phương tiện của người dùng khác. |
| FR-VEHICLE-03 | Người dùng có thể đặt một phương tiện làm "đang hoạt động" (active vehicle). |
| FR-VEHICLE-04 | Hệ thống không cho phép bắt đầu chuyến đi nếu chưa có phương tiện đang hoạt động. |

### 1.3. Trip Lifecycle (FR-TRIP)

| ID | Yêu cầu |
|---|---|
| FR-TRIP-01 | Người dùng phải cấp quyền vị trí và đồng ý (consent) chia sẻ vị trí trước khi bắt đầu chuyến đi. |
| FR-TRIP-02 | Hệ thống không gửi/ghi nhận GPS trước khi người dùng bấm bắt đầu chuyến đi. |
| FR-TRIP-03 | Người dùng có thể bắt đầu chuyến đi khi đã có phương tiện đang hoạt động, đã đồng ý consent, **và** đã xác thực khuôn mặt thành công cho phương tiện đó (FR-BIOMETRIC-01, FR-AUTHZ-02). |
| FR-TRIP-04 | Người dùng có thể kết thúc chuyến đi bất kỳ lúc nào; hành động này dừng toàn bộ tracking (foreground và background). |
| FR-TRIP-05 | Mỗi chuyến đi tạo một bản ghi `trips` (vòng đời) gắn với `user_id`/`vehicle_id` ngay khi bắt đầu; khi kết thúc, hệ thống tạo thêm một bản ghi `trip_logs` (tổng hợp/summary) tương ứng — xem `DATA_REQUIREMENTS.md` §2.3–2.4 cho định nghĩa 2 entity này. |

### 1.4. Realtime Location (FR-REALTIME)

| ID | Yêu cầu |
|---|---|
| FR-REALTIME-01 | Khi online, mobile gửi GPS event realtime qua WebSocket/Socket.io. |
| FR-REALTIME-02 | Backend validate payload GPS (toạ độ hợp lệ, thuộc đúng `trip_id`/`vehicle_id` của người gửi) trước khi broadcast. |
| FR-REALTIME-03 | Web dashboard nhận vị trí realtime và cập nhật marker trên bản đồ. |
| FR-REALTIME-04 | GPS event có rate limit để tránh spam/quá tải server. |
| FR-REALTIME-05 | Mobile hiển thị trạng thái kết nối (connected/disconnected) cho người dùng. |
| FR-REALTIME-06 | Khi WebSocket mất kết nối, mobile chuyển sang lưu local queue thay vì rớt dữ liệu. |
| FR-REALTIME-07 | WebSocket reconnect dùng **Exponential Backoff with Jitter**; không reconnect đồng loạt tức thì. |
| FR-REALTIME-08 | Sau khi reconnect thành công, live stream tiếp tục qua WebSocket; dữ liệu tồn đọng lúc offline **không** replay qua WebSocket (dùng REST batch — xem FR-SYNC). |

### 1.5. Offline Queue & Batch Sync (FR-SYNC)

| ID | Yêu cầu |
|---|---|
| FR-SYNC-01 | Mobile lưu GPS/trip events vào hàng đợi cục bộ khi mất mạng. |
| FR-SYNC-02 | Mỗi event có `client_event_id` duy nhất để đảm bảo idempotency. |
| FR-SYNC-03 | Khi có mạng trở lại, mobile gọi `POST /api/trips/sync` để gửi các event tồn đọng theo batch. |
| FR-SYNC-04 | Server từ chối/không lưu trùng event đã tồn tại với cùng `client_event_id`. |
| FR-SYNC-05 | Batch tối đa **500 events/payload** ở MVP; mobile phải chia local queue thành nhiều chunk nếu vượt giới hạn, gửi tuần tự. |
| FR-SYNC-06 | Server trả lỗi rõ ràng nếu một payload vượt giới hạn batch. |
| FR-SYNC-07 | Server trả kết quả partial success: `200 OK` kèm `{ status, accepted, duplicate_count, failed_count, failed_events[] }`. `207 Multi-Status` là lựa chọn thay thế, không bắt buộc. |
| FR-SYNC-08 | Server validate quyền sở hữu (`trip_id`/`vehicle_id` phải thuộc người gửi request). |

### 1.6. Vehicle Mismatch Detection (FR-MISMATCH)

| ID | Yêu cầu |
|---|---|
| FR-MISMATCH-01 | Hệ thống so sánh hành vi di chuyển (tốc độ/lộ trình) với loại phương tiện đã đăng ký cho chuyến đi hiện tại. |
| FR-MISMATCH-02 | Nếu tốc độ vượt ngưỡng hợp lý cho loại phương tiện trong một khoảng thời gian đủ dài, hệ thống tạo một cảnh báo (warning). |
| FR-MISMATCH-03 | Cảnh báo không tự động khoá tài khoản, không tự kết luận vi phạm — chỉ gợi ý xác nhận lại phương tiện. |
| FR-MISMATCH-04 | Người dùng có thể xác nhận phương tiện hiện tại hoặc đổi sang phương tiện khác ngay từ cảnh báo. |
| FR-MISMATCH-05 | Nội dung cảnh báo dùng ngôn ngữ trung lập (xem Terminology Rules — không dùng "gian lận"). |

### 1.7. Driver-friendly Warning UI (FR-WARNUI)

| ID | Yêu cầu |
|---|---|
| FR-WARNUI-01 | Cảnh báo Vehicle Mismatch / an toàn hiển thị dạng overlay lớn, dễ đọc trên màn hình sử dụng phương tiện — không dựa vào push notification nhỏ làm kênh chính khi đang lái. |
| FR-WARNUI-02 | Overlay cho phép xác nhận bằng một chạm (one-tap). |
| FR-WARNUI-03 | Nếu người dùng không phản hồi, overlay tự ẩn sau **10 giây**. |
| FR-WARNUI-04 | Overlay không che khuất bản đồ quá lâu, không yêu cầu nhập liệu phức tạp. |
| FR-WARNUI-05 | Sau khi tự ẩn, cảnh báo vẫn được lưu vào nhật ký chuyến đi để xem lại sau. |

### 1.8. AR Lite / Terrain Warning Overlay (FR-AR)

| ID | Yêu cầu |
|---|---|
| FR-AR-01 | Màn hình sử dụng phương tiện hiển thị bản đồ + marker vị trí + overlay cảnh báo địa hình. |
| FR-AR-02 | Không yêu cầu kính thực tế ảo/VR; không chạy AR mesh nặng trong lõi MVP. |
| FR-AR-03 | Nếu thiết bị quá nóng, pin yếu, hoặc ánh sáng quá yếu, hệ thống chuyển sang chế độ fallback: chỉ hiển thị cảnh báo trên bản đồ (không camera/AR). |
| FR-AR-04 | Ứng dụng không được crash khi camera/AR không khả dụng. |

> **R&D note (cập nhật 09/2026):** Unity AR Terrain Mesh (nhắc tới ở FR-AR-02 như phần "không bắt buộc trong lõi MVP") có baseline riêng cho một prototype nghiên cứu độc lập phục vụ báo cáo hội đồng — xem `docs/research/AR_TERRAIN_THESIS_BASELINE.md`. Hướng Survey Mode/Drive Mode và hiển thị TPP/FPP được ghi ở `docs/research/AR_TERRAIN_SURVEY_DRIVE_MODE_ADDENDUM.md`; Second-Person không thuộc runtime lái xe. Không có `FR-*` mới nào được thêm cho track này vì nó chưa phải tính năng MVP.

### 1.9. Mobile Background Location (FR-BGLOC)

| ID | Yêu cầu |
|---|---|
| FR-BGLOC-01 | Tracking nền chỉ chạy khi chuyến đi đang active và người dùng đã đồng ý consent. |
| FR-BGLOC-02 | Android: dùng Foreground Service kèm notification liên tục khi tracking chạy nền. |
| FR-BGLOC-03 | iOS: có luồng xin quyền phù hợp (background/always) nếu cần tiếp tục tracking khi khoá màn hình. |
| FR-BGLOC-04 | Nếu người dùng không cấp quyền nền, ứng dụng vẫn tracking ở chế độ foreground và thông báo rõ giới hạn. |
| FR-BGLOC-05 | Khoá màn hình trong lúc chuyến đi active không được làm mất trạng thái chuyến đi ngay lập tức. |
| FR-BGLOC-06 | Kết thúc chuyến đi (Stop trip) phải dừng cả foreground và background tracking. |

### 1.10. Developer Mode / Simulator (FR-DEVMODE)

| ID | Yêu cầu |
|---|---|
| FR-DEVMODE-01 | Có chế độ ẩn cho phép nạp file mock GPS route để giả lập di chuyển. |
| FR-DEVMODE-02 | Có thể giả lập mất mạng ngắt quãng để kiểm tra local queue/sync. |
| FR-DEVMODE-03 | Có thể giả lập thermal state và low-light state để kiểm tra fallback AR Lite. |
| FR-DEVMODE-04 | Developer Mode không hiển thị/khả dụng cho người dùng thường trong bản production; bật/tắt qua env hoặc build flag. |

### 1.11. Data Retention (FR-RETENTION)

| ID | Yêu cầu |
|---|---|
| FR-RETENTION-01 | Trip logs / trip summary được lưu dài hạn. |
| FR-RETENTION-02 | Raw GPS events chỉ được lưu tối đa **30 ngày** (TTL), sau đó bị dọn dẹp tự động. |
| FR-RETENTION-03 | Dữ liệu công khai/cộng đồng (cảnh báo địa hình) chỉ dùng dữ liệu đã giảm định danh hoặc tổng hợp (aggregate), không dùng raw GPS định danh trực tiếp người dùng. |

### 1.12. Vehicle Authorization (FR-AUTHZ)

> Đưa vào MVP theo quyết định D0.6 — xem `REVIEW_NOTES.md` §1. Thứ tự triển khai: sau khi Auth/Vehicle/Trip nền tảng đã ổn định (`PRD.md` §5.1).

| ID | Yêu cầu |
|---|---|
| FR-AUTHZ-01 | Chủ xe (owner) có thể cấp quyền sử dụng một phương tiện của mình cho người dùng khác (borrower) trong một khoảng thời gian xác định (có `expires_at`). |
| FR-AUTHZ-02 | Người mượn chỉ được chọn phương tiện đó làm "đang hoạt động" và bắt đầu chuyến đi nếu đang trong thời hạn uỷ quyền còn hiệu lực. |
| FR-AUTHZ-03 | Chủ xe có thể thu hồi uỷ quyền bất kỳ lúc nào; sau khi thu hồi, người mượn không thể bắt đầu chuyến đi mới với xe đó. |
| FR-AUTHZ-04 | Ứng dụng hiển thị rõ cho người mượn: đang mượn xe của ai, còn hiệu lực bao lâu (vd. "Chủ xe Trần Văn B phê duyệt, còn 24h"). |
| FR-AUTHZ-05 | Chủ xe có toàn quyền sử dụng phương tiện của chính mình, không cần bản ghi uỷ quyền riêng. |
| FR-AUTHZ-06 | Một phương tiện có thể có nhiều uỷ quyền với nhiều borrower khác nhau theo thời gian, nhưng tại một thời điểm chỉ một người (owner hoặc một borrower đang hiệu lực) được xác thực để lái. |

### 1.13. Biometric Vehicle Binding (FR-BIOMETRIC)

> Đưa vào MVP theo quyết định D0.6 — xem `REVIEW_NOTES.md` §1. Gắn trực tiếp vào luồng bắt đầu chuyến đi (FR-TRIP-03), nằm sau bước chọn phương tiện.

| ID | Yêu cầu |
|---|---|
| FR-BIOMETRIC-01 | Trước khi bắt đầu chuyến đi, người dùng phải hoàn tất xác thực khuôn mặt gắn với phương tiện đã chọn (chủ xe hoặc borrower còn hiệu lực theo FR-AUTHZ). |
| FR-BIOMETRIC-02 | Hệ thống kiểm tra người dùng hiện tại có quyền với phương tiện đã chọn (owner, hoặc borrower có uỷ quyền còn hiệu lực) **trước khi** tiến hành xác thực khuôn mặt — tránh chạy xác thực cho một phiên chắc chắn sẽ bị từ chối. |
| FR-BIOMETRIC-03 | Nếu xác thực khuôn mặt thất bại, người dùng không thể bắt đầu chuyến đi; được thử lại tối đa một số lần hợp lý trước khi phải quay lại bước chọn phương tiện. |
| FR-BIOMETRIC-04 | Hệ thống **không lưu trữ ảnh khuôn mặt thô**; chỉ lưu kết quả xác thực (thành công/thất bại, thời điểm, phương tiện liên quan). |
| FR-BIOMETRIC-05 | MVP dùng dịch vụ/SDK xác thực khuôn mặt có sẵn (không tự xây dựng model nhận diện từ đầu); nhà cung cấp cụ thể **đã đánh giá (R1-8, 07/2026): AWS Rekognition Face Liveness** làm primary candidate, xem `docs/architecture/TDR-biometric-provider-spike.md` — chưa implement, MVP vẫn dùng `MockBiometricProvider`. *Đính chính hiện trạng (10/2026, `WEB-00` review vòng 1, R04 — requirement không đổi):* câu "chưa implement" đã lỗi thời. Từ R2-6, backend có `AwsRekognitionBiometricProvider` song song `MockBiometricProvider`. Mặc định là mock; AWS chỉ được chọn khi `BIOMETRIC_PROVIDER=aws-rekognition` (`apps/backend/src/biometric/biometric.module.ts`, TDR spike mục "Cập nhật (R2-6)"). Provider thực sự của từng môi trường/bản phát hành phải được xác nhận riêng, không suy ra từ câu này. |

### 1.14. Routing (FR-ROUTING)

> Bổ sung 07/2026 — tự rà trước khi code step `5.1`: `ARCHITECTURE.md` §3.2/§7 đã mô tả `RoutingProvider` (mock theo `vehicleType`, step `5.1`) từ D0.4, nhưng chưa từng có FR tương ứng ở đây, và `API_CONTRACT.md` chưa có endpoint nào cho routing. Xem `REVIEW_NOTES.md` §14.

| ID | Yêu cầu |
|---|---|
| FR-ROUTING-01 | Hệ thống cung cấp endpoint xem trước lộ trình (route preview) giữa điểm đi và điểm đến, gắn với một phương tiện cụ thể của người dùng. |
| FR-ROUTING-02 | Lộ trình trả về phải khác nhau theo loại phương tiện (`motorbike` so với `car`) — MVP dùng dữ liệu mock (`RoutingProvider`), thay bằng routing engine thật (OSRM/GraphHopper) ở step `5.2` mà không đổi contract gọi từ web/mobile. |
| FR-ROUTING-03 | Chỉ chủ xe hoặc borrower đang có uỷ quyền hiệu lực (FR-AUTHZ-02) cho phương tiện mới xem được route preview của phương tiện đó. |

### 1.15. Web Account & Session Recovery (FR-WEBSESSION, FR-WEBPROFILE, FR-WEBPRIVACY, FR-WEBSETTINGS, FR-WEBHELP)

> **Bổ sung sau Baseline v1.0 — micro-step `WEB-00` (10/2026), trạng thái: review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu** (`docs/REVIEW_NOTES.md` §35–§37). Chủ dự án đã đồng ý hướng; đây **chưa** là hành vi đã triển khai (`WEB-01`…`WEB-13` NOT STARTED). Đặc tả chi tiết, hiện trạng có nguồn, ma trận viewport và traceability: `docs/web/WEB_ACCOUNT_RWD_SPEC.md`. **Không thêm API/bảng/cột:** `API_CONTRACT.md`/`DATA_MODEL.md` giữ nguyên; hồ sơ chỉ dùng `GET /api/auth/me` hiện có (FR-AUTH-03).

| ID | Yêu cầu |
|---|---|
| FR-WEBSESSION-01 | Web kiểm tra phiên khi vào route bảo vệ và ở `/login` với bốn trạng thái `checking`/`authenticated`/`unauthenticated`/`error`; không được treo vô hạn ở trạng thái kiểm tra. |
| FR-WEBSESSION-02 | Hệ thống **tự động** xoá phiên cục bộ và về đăng nhập chỉ khi không có token, hoặc khi lần kiểm tra còn hiệu lực của `GET /api/auth/me` trả `401` (giữ FR-AUTH-04). Lỗi mạng, `403`, `429`, `500`, timeout hoặc retry không bao giờ tự xoá token; chúng chuyển sang `error` với thông báo phù hợp (không hiển thị như sai mật khẩu), có "Thử lại" và "Đăng nhập lại". **"Đăng nhập lại"** là thao tác chủ động của người dùng: xoá token và user cục bộ, vô hiệu hoá kiểm tra phiên đang chờ, rồi về `/login` với form dùng được; không revoke server, không kết thúc chuyến mobile, không xoá preference. |
| FR-WEBSESSION-03 | Timeout **15 giây** chỉ áp dụng cho request kiểm tra phiên; không áp timeout chung cho API nghiệp vụ khác. Ngưỡng là quyết định đặc tả mới của `WEB-00`. |
| FR-WEBSESSION-04 | Retry thủ công có trạng thái bận và chỉ một request kiểm tra phiên còn hiệu lực. Chỉ kết quả của lần kiểm tra còn hiệu lực — cùng thế hệ phiên, và token trong storage vẫn là token request đó xác minh — mới được ghi/xoá token, đặt/xoá user trong AuthContext, điều hướng hay đổi UI. Đăng nhập, logout, "Đăng nhập lại", retry, timeout và unmount làm mất hiệu lực các lần kiểm tra trước. Kết quả mất hiệu lực (kể cả `200` hoặc `401`) bị bỏ qua ở mọi tầng: service/storage, context, component. `/login` không có unhandled rejection. Logout/login, đổi tài khoản và Browser Back giữ auth guard; không đổi contract `/me`, không đổi nơi lưu token, không tuyên bố logout web thu hồi token trên mọi thiết bị. |
| FR-WEBPROFILE-01 | `/account/profile` hiển thị email đầy đủ của người đang đăng nhập (dữ liệu `/me` qua cơ chế auth chung), đọc được cả email dài, có đường về Dashboard. |
| FR-WEBPROFILE-02 | Hồ sơ chỉ đọc: không form/nút lưu, không request ghi; không hiển thị trường `/me` không trả (tên, số điện thoại, avatar, ngày tham gia, trạng thái xác minh) và không bao giờ hiển thị `password_hash`. |
| FR-WEBPROFILE-03 | Sau logout rồi đăng nhập tài khoản khác (hoặc dùng Browser Back), không hiển thị email của tài khoản trước. |
| FR-WEBPRIVACY-01 | `/account/privacy` là trang thông tin (không phải chứng nhận pháp lý) mô tả nhóm dữ liệu, mục đích, cách dừng tracking trên mobile và phạm vi xử lý của bên thứ ba; mỗi cam kết dữ liệu phải trace được tới requirement + implementation có bằng chứng hoặc quyết định vận hành đã xác nhận. |
| FR-WEBPRIVACY-02 | Trang không có công tắc consent/GPS giả, không xin quyền camera/geolocation, không bắt đầu/kết thúc chuyến, không ghi consent. Dừng tracking được mô tả là thao tác kết thúc chuyến trên mobile (FR-TRIP-04); đăng xuất web không được mô tả là dừng tracking mobile. |
| FR-WEBPRIVACY-03 | Nội dung về thời hạn lưu GPS và chính sách nhà cung cấp phải qua gate nội dung riêng (Privacy Content Gate) trước khi phát hành; không khẳng định raw GPS "tự xoá sau 30 ngày" khi chưa có bằng chứng cleanup. FR-RETENTION-02 giữ nguyên, không bị hạ thấp vì implementation chưa đáp ứng. |
| FR-WEBPRIVACY-04 | Phần sinh trắc tách giới hạn xử lý tại NovaWay (FR-BIOMETRIC-04, NFR-PRIVACY-03) khỏi chính sách của nhà cung cấp; không hứa "không có bên thứ ba xử lý". |
| FR-WEBSETTINGS-01 | `/settings` chỉ có một lựa chọn hiệu ứng giao diện web: "Theo hệ thống" (mặc định) / "Giảm chuyển động"; áp dụng ngay; ghi rõ chỉ áp dụng cho tài khoản này trên trình duyệt này. |
| FR-WEBSETTINGS-02 | Cả hai lựa chọn tôn trọng thiết lập giảm chuyển động của hệ điều hành; không có lựa chọn ép animation bất chấp OS. |
| FR-WEBSETTINGS-03 | Preference lưu cục bộ trên trình duyệt, có `version`, namespace theo `user.id`, chỉ chứa giá trị lựa chọn; không lưu email/token/mật khẩu/vị trí/dữ liệu khuôn mặt; không đồng bộ qua API/DB. Namespace chỉ bảo đảm app không áp dụng lựa chọn của tài khoản này cho tài khoản khác. Namespace **không** phải ranh giới quyền truy cập giữa các tài khoản trên cùng browser profile. |
| FR-WEBSETTINGS-04 | Reload giữ lựa chọn của đúng tài khoản; app không áp dụng lựa chọn riêng của tài khoản trước cho tài khoản khác cùng trình duyệt. Lỗi storage xử lý theo ba ca: (a) khởi tạo không đọc được giá trị hợp lệ → "Theo hệ thống"; (b) người dùng đã chọn hợp lệ nhưng ghi thất bại/hết quota → giữ và áp dụng lựa chọn trong phiên trang đang mở; (c) giá trị hỏng, enum lạ, `version` không hỗ trợ → "Theo hệ thống". Cả ba ca đều có thông báo, không crash, không đụng token/session, luôn tôn trọng OS. Không đồng bộ đa tab/server. |
| FR-WEBSETTINGS-05 | Preference không thay đổi GPS, consent, vòng đời chuyến đi, cảnh báo an toàn, dữ liệu realtime hay API payload. |
| FR-WEBHELP-01 | `/help` hướng dẫn theo flow và route có thật (đăng nhập, `/vehicles`, `/start-trip` chỉ để xem, `/trip-history`, `/account/privacy`, lỗi thường gặp); link tới đúng route. |
| FR-WEBHELP-02 | Trợ giúp phân biệt web quản lý/giám sát với mobile bắt đầu/kết thúc chuyến; không hướng dẫn thao tác không tồn tại; không mô tả `/offline-sync` là chức năng web đầy đủ khi còn placeholder. |
| FR-WEBHELP-03 | Không có kênh liên hệ/ticket/form giả; chỉ hiển thị kênh đã được chủ dự án xác nhận. Hướng dẫn không yêu cầu gửi mật khẩu, JWT hoặc ảnh khuôn mặt. |

## 2. Non-Functional Requirements

| ID | Yêu cầu |
|---|---|
| NFR-REL-01 | Ứng dụng không được crash khi mạng yếu hoặc mất mạng đột ngột. |
| NFR-REL-02 | Backend phải chịu được việc nhiều client reconnect gần như đồng thời sau khi mất mạng diện rộng mà không sập (nhờ exponential backoff + jitter ở phía client). |
| NFR-PRIVACY-01 | Không thu thập GPS trước khi người dùng đồng ý consent và bắt đầu chuyến đi. |
| NFR-PRIVACY-02 | Người dùng luôn có cách dừng tracking ngay lập tức. |
| NFR-PRIVACY-03 | Dữ liệu sinh trắc học (khuôn mặt) là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP — chỉ xử lý tạm thời để xác thực (FR-BIOMETRIC-04, không lưu ảnh thô), có consent riêng biệt với consent vị trí, và người dùng phải được thông báo rõ mục đích trước khi quét. |
| NFR-PERF-01 | Tần suất gửi GPS event phải được giới hạn (rate limit) ở cả client và server. |
| NFR-PERF-02 | Marker vị trí trên web dashboard cập nhật với độ trễ chấp nhận được cho realtime (mục tiêu ≤ 5 giây, xem `PRD.md` §4). |
| NFR-BATTERY-01 | Tính năng AR/camera không được chạy liên tục không kiểm soát — phải có safeguard/fallback theo nhiệt độ và pin. |
| NFR-SCALE-01 | Tầng realtime MVP dùng một NestJS WebSocket Gateway đơn; thiết kế phải cho phép thêm Redis adapter ở bước scale tiếp theo mà không phải viết lại từ đầu. |
| NFR-MAINT-01 | Code phải modular, chia theo domain (auth/vehicle/trip/realtime/sync), dễ đọc bởi AI coding agent. |
| NFR-TEST-01 | Mỗi micro-step (theo `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`) phải có test gate riêng; các kịch bản khó tái hiện ngoài đời thật (mất mạng, thermal, low-light) bắt buộc test được qua Developer Mode/Simulator. |
| NFR-SEC-01 | Mọi payload ghi dữ liệu (đặc biệt GPS, batch sync) phải được validate và kiểm tra quyền sở hữu (ownership) trước khi xử lý. |
| NFR-SEC-02 | Offline sync phải có cơ chế idempotency theo `client_event_id` để chống ghi trùng khi client gửi lại. |
| NFR-SEC-03 | Ràng buộc idempotency `(user_id, client_event_id)` phải được enforce ở tầng database (unique constraint trên `raw_gps_events`), áp dụng cho **mọi** đường ghi dữ liệu — cả GPS event gửi qua WebSocket lẫn qua REST batch sync — không chỉ ở logic riêng của endpoint `/api/trips/sync` (phát hiện ở `REVIEW_NOTES.md` §3). |
| NFR-API-01 | `POST /api/trips/sync` phải enforce giới hạn batch tối đa 500 events/payload và trả lỗi rõ ràng nếu vượt. |
| NFR-UX-01 | Cảnh báo hiển thị khi đang lái phải tối giản, không yêu cầu thao tác phức tạp (xem FR-WARNUI). |
| NFR-OBS-01 | Backend phải có health check, structured logging, và metrics cơ bản (đủ để debug realtime/location issues) — tương ứng step `9.1 chore/observability-baseline` trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`. |

### 2.1. Responsive/adaptive web (NFR-RWD)

> Bổ sung sau Baseline v1.0 — micro-step `WEB-00` (10/2026), **review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu**. Chưa có hành vi nào dưới đây được triển khai; ma trận viewport/trạng thái và phương pháp đo ở `docs/web/WEB_ACCOUNT_RWD_SPEC.md` §4.6–§7.

| ID | Yêu cầu |
|---|---|
| NFR-RWD-01 | Web dùng header + drawer dưới 1024 CSS px và sidebar từ 1024 CSS px; nội dung xếp theo không gian container thực. Ngưỡng 1024 là lựa chọn của NovaWay. |
| NFR-RWD-02 | Ở bề rộng tương đương 320 CSS px, text 200% và browser zoom 400% tại 1280px, app shell, bốn màn tài khoản và các trang web hiện có không mất nội dung/chức năng và không cần cuộn ngang để đọc nội dung thông thường (bản đồ được ngoại lệ trong phạm vi bản đồ). |
| NFR-RWD-03 | Điều hướng bằng bàn phím có thứ tự hợp lý, focus nhìn thấy và không bị che; drawer quản lý focus, đóng bằng Escape/nút/bấm ngoài, trả focus, không còn tab stop ẩn; control icon có accessible name. |
| NFR-RWD-04 | Control chính trên thiết bị cảm ứng đặt mục tiêu vùng chạm 44×44 CSS px (lựa chọn UX của NovaWay); WCAG 2.5.8 được đánh giá riêng theo ngưỡng 24×24 và ngoại lệ của nó. |
| NFR-RWD-05 | Resize, đổi orientation, bàn phím ảo và safe area không làm mất route/form đang nhập, không kẹt scroll lock/backdrop, không che header/action; safe area chỉ được đánh PASS trên thiết bị thật. |
| NFR-RWD-06 | Chỉ tuyên bố hỗ trợ theo tổ hợp browser/viewport/thiết bị đã chạy và có evidence; emulation không thay Safari trên iPhone thật hoặc Android Chrome thật; không tuyên bố "mọi thiết bị" hay đạt WCAG chỉ từ việc viết tiêu chí. |
| NFR-RWD-07 | Thay đổi layout không đổi contract/cách tính nghiệp vụ (auth, CRUD xe, quan sát trip, analytics); không thêm metric mới hoặc start/end trip trên web. |

## 3. Constraints

- Backend: NestJS + TypeScript, PostgreSQL + PostGIS (TDR-001).
- Realtime: WebSocket/Socket.io, không dùng WebSocket để replay dữ liệu offline lớn (TDR-004, TDR-005).
- Offline sync: REST Batch Upload duy nhất qua `POST /api/trips/sync` (TDR-005).
- Bản đồ: hệ sinh thái OpenStreetMap; web dashboard ưu tiên MapLibre GL JS; Leaflet chỉ chấp nhận cho prototype nhanh (TDR-002).
- Tile provider MVP/dev: Protomaps hoặc Mapbox Free Tier là candidate — chưa chốt final, cần kiểm tra quota/cost trước khi implement (Open Question OQ-005).
- AR: chỉ AR Lite/overlay trên màn hình sử dụng phương tiện; không VR, không kính thực tế ảo (TDR-003).
- Không dùng Kafka/NATS ở MVP (TDR-004).
- Không đưa App Attestation vào MVP — chỉ baseline JWT/rate limit/validation/idempotency (TDR-008).
- Raw GPS TTL 30 ngày, cần thiết kế partitioning theo thời gian (TDR-006).

## 4. Traceability

Mỗi `FR-*`/`NFR-*` ở đây tương ứng với ít nhất một mục trong `ACCEPTANCE_CRITERIA.md` và ít nhất một test case trong `TEST_STRATEGY.md`. Khi thêm/sửa requirement ở bước D0.3 trở đi, cập nhật đồng thời cả ba tài liệu để tránh lệch.

## 5. Terminology Rules

- Luôn dùng **NovaWay**, không dùng "NovaPay".
- Không dùng "gian lận", "chống gian lận", "phạt nguội", "camera phạt nguội".
- Dùng **"sai lệch phương tiện"** / **"Vehicle Mismatch Detection"**, **"xác nhận lại phương tiện"**, **"cảnh báo an toàn"**, **"cảnh báo địa hình"**.

## 6. Open Items for D0.3

- OQ-001: Flutter cho mobile — đề xuất chốt "có" trừ khi có lý do kỹ thuật mới xuất hiện.
- ~~OQ-006: Plugin bản đồ cho Flutter~~ — **Đã chốt (R1-5, 07/2026):** `flutter_map` + OSM public tile, xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §7.
- OQ-007: Tần suất lấy mẫu GPS (đề xuất 1–5 giây/event khi chuyến đi active) — cần test ảnh hưởng pin trước khi chốt.
- OQ-005: Tile provider final (Protomaps vs Mapbox Free Tier) — cần technical spike trước khi code map.
