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
| FR-BIOMETRIC-05 | MVP dùng dịch vụ/SDK xác thực khuôn mặt có sẵn (không tự xây dựng model nhận diện từ đầu); nhà cung cấp cụ thể **đã đánh giá (R1-8, 07/2026): AWS Rekognition Face Liveness** làm primary candidate, xem `docs/architecture/TDR-biometric-provider-spike.md` — chưa implement, MVP vẫn dùng `MockBiometricProvider`. |

### 1.14. Routing (FR-ROUTING)

> Bổ sung 07/2026 — tự rà trước khi code step `5.1`: `ARCHITECTURE.md` §3.2/§7 đã mô tả `RoutingProvider` (mock theo `vehicleType`, step `5.1`) từ D0.4, nhưng chưa từng có FR tương ứng ở đây, và `API_CONTRACT.md` chưa có endpoint nào cho routing. Xem `REVIEW_NOTES.md` §14.

| ID | Yêu cầu |
|---|---|
| FR-ROUTING-01 | Hệ thống cung cấp endpoint xem trước lộ trình (route preview) giữa điểm đi và điểm đến, gắn với một phương tiện cụ thể của người dùng. |
| FR-ROUTING-02 | Lộ trình trả về phải khác nhau theo loại phương tiện (`motorbike` so với `car`) — MVP dùng dữ liệu mock (`RoutingProvider`), thay bằng routing engine thật (OSRM/GraphHopper) ở step `5.2` mà không đổi contract gọi từ web/mobile. |
| FR-ROUTING-03 | Chỉ chủ xe hoặc borrower đang có uỷ quyền hiệu lực (FR-AUTHZ-02) cho phương tiện mới xem được route preview của phương tiện đó. |

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
