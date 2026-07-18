# NovaWay — Data Requirements v0.1

> Step D0.2. Đây là yêu cầu dữ liệu ở mức khái niệm (entities, field, quan hệ, chính sách lưu trữ) — **không phải DDL cuối cùng**. Schema thật (migration, index, kiểu dữ liệu chính xác) thuộc step `1.2 feat/database-schema` sau khi có Architecture (D0.4).
>
> Tham khảo: `NovaWaySchemaDatabase.docx` (bản thảo trước D0.1) cho danh sách bảng gốc — đã điều chỉnh lại theo quyết định D0.1: sửa thuật ngữ vi phạm quy tắc (bỏ "phạt nguội"/"gian lận"), bổ sung bảng `raw_gps_events` (chưa có ở bản thảo gốc) để đáp ứng TTL 30 ngày, và tách rõ phần nào thuộc MVP vs Post-MVP/R&D (camera AI, vehicle color-matching).

## 1. Nguyên tắc chung

- Database: PostgreSQL + PostGIS (TDR-001).
- Toạ độ dùng kiểu không gian PostGIS (`GEOGRAPHY`/`GEOMETRY`, SRID 4326) thay vì lưu float rời rạc, để tận dụng index không gian và truy vấn theo bán kính (phục vụ cảnh báo địa hình gần vị trí hiện tại).
- Hai lớp dữ liệu chuyến đi tách biệt: **raw GPS events** (chi tiết, ngắn hạn) và **trip summary** (tổng hợp, dài hạn) — không gộp chung một bảng.
- Mọi bảng ghi dữ liệu người dùng phải có `created_at`; bảng nào cần dọn dẹp theo thời gian phải thiết kế được partitioning.

## 2. Entities (MVP)

### 2.1. `users`

Thông tin định danh và xác thực.

| Field | Ghi chú |
|---|---|
| `id` | UUID, khoá chính |
| `email` | duy nhất |
| `password_hash` | không lưu mật khẩu thô |
| `created_at` | |

### 2.2. `vehicles`

| Field | Ghi chú |
|---|---|
| `id` | UUID, khoá chính |
| `user_id` | FK → `users.id`, chủ sở hữu |
| `type` | ENUM (`motorbike`, `car`) — dùng để phân luồng routing và Vehicle Mismatch Detection |
| `license_plate` | dùng để định danh xe, **không** gắn với mục đích tra cứu vi phạm/xử phạt trong MVP |
| `brand_model` | thông tin hiển thị |
| `is_active` | xe hiện đang được chọn làm phương tiện hoạt động |

*Loại bỏ khỏi MVP so với bản thảo gốc:* field `color` phục vụ đối chiếu màu sắc bằng camera AI — thuộc Post-MVP/R&D (chưa có Computer Vision thật ở MVP).

### 2.3. `trips`

Vòng đời một chuyến đi (khác với `trip_logs`/summary — xem 2.4).

| Field | Ghi chú |
|---|---|
| `id` | UUID, khoá chính |
| `user_id` | FK → `users.id` |
| `vehicle_id` | FK → `vehicles.id` |
| `status` | `active` / `ended` |
| `consent_at` | thời điểm người dùng đồng ý chia sẻ vị trí cho chuyến đi này |
| `biometric_verification_id` | FK → `biometric_verifications.id` — xác thực đã mở khoá chuyến đi này (FR-BIOMETRIC-01) |
| `started_at` | |
| `ended_at` | nullable cho tới khi kết thúc |

### 2.3a. `vehicle_authorizations` (mới — theo quyết định D0.6, `REVIEW_NOTES.md` §1–2)

Uỷ quyền sử dụng phương tiện giữa chủ xe (owner) và người mượn (borrower).

| Field | Ghi chú |
|---|---|
| `id` | UUID, khoá chính |
| `vehicle_id` | FK → `vehicles.id` |
| `owner_id` | FK → `users.id`, phải trùng `vehicles.user_id` |
| `borrower_id` | FK → `users.id` |
| `granted_at` | |
| `expires_at` | thời điểm hết hiệu lực — bắt buộc, không cho phép uỷ quyền vô thời hạn ở MVP (FR-AUTHZ-01) |
| `revoked_at` | nullable — set khi chủ xe chủ động thu hồi (FR-AUTHZ-03) |
| `status` | `active` / `expired` / `revoked` — tính toán hoặc cache lại từ `expires_at`/`revoked_at` để query nhanh |

*Ràng buộc:* không cho phép hai `vehicle_authorizations` cùng `vehicle_id` với `status = active` chồng thời gian cho hai `borrower_id` khác nhau (một xe tại một thời điểm chỉ nên có tối đa một borrower hiệu lực, theo FR-AUTHZ-06) — enforce ở tầng ứng dụng, cân nhắc constraint DB ở D0.4 nếu PostgreSQL exclusion constraint khả thi cho range thời gian.

### 2.3b. `biometric_verifications` (mới — theo quyết định D0.6)

Kết quả xác thực khuôn mặt — **không lưu ảnh thô** (FR-BIOMETRIC-04, NFR-PRIVACY-03).

| Field | Ghi chú |
|---|---|
| `id` | UUID, khoá chính |
| `user_id` | FK → `users.id`, người thực hiện xác thực |
| `vehicle_id` | FK → `vehicles.id`, phương tiện đang được xác thực để sử dụng |
| `vehicle_authorization_id` | FK → `vehicle_authorizations.id`, nullable (null nếu user là chủ xe, không cần uỷ quyền — FR-AUTHZ-05) |
| `result` | `success` / `failed` |
| `verified_at` | |
| `provider` | tên dịch vụ/SDK xác thực khuôn mặt dùng ở MVP — giá trị cụ thể là Open Question, chốt ở D0.4 (FR-BIOMETRIC-05) |

### 2.4. `trip_logs` (Trip Summary)

Dữ liệu tổng hợp sau khi chuyến đi kết thúc — **lưu dài hạn**, phục vụ dashboard/thống kê.

| Field | Ghi chú |
|---|---|
| `id` | UUID, khoá chính |
| `trip_id` | FK → `trips.id` |
| `user_id`, `vehicle_id` | denormalized để query nhanh theo dashboard filter |
| `distance_km` | tổng quãng đường |
| `duration_minutes` | |
| `route_geometry` | `GEOMETRY(LineString, 4326)` — đường đi thực tế, dùng để hiển thị lại tuyến trên dashboard (không phải để "đối chiếu gian lận" như mô tả ở bản thảo gốc — đổi mục đích thành phục vụ xem lại hành trình) |
| `mismatch_warning_count` | số cảnh báo Vehicle Mismatch phát sinh trong chuyến |

### 2.5. `raw_gps_events` (mới so với bản thảo gốc)

Chi tiết từng điểm GPS — **TTL 30 ngày** (FR-RETENTION-02), cần partitioning theo thời gian (theo ngày hoặc tháng) để cleanup hiệu quả.

| Field | Ghi chú |
|---|---|
| `id` | UUID hoặc BIGSERIAL |
| `trip_id` | FK → `trips.id` |
| `vehicle_id` | denormalized cho truy vấn nhanh |
| `client_event_id` | **duy nhất** theo `(user_id, client_event_id)` — unique constraint ở tầng database, áp dụng cho mọi đường ghi (realtime WebSocket lẫn REST batch sync), không chỉ validate ở logic ứng dụng của riêng endpoint sync (FR-SYNC-02, NFR-SEC-02, NFR-SEC-03) |
| `location` | `GEOGRAPHY(Point, 4326)` |
| `speed_kmh` | |
| `accuracy_m` | |
| `source` | `gps` (mở rộng sau nếu có nguồn khác) |
| `event_timestamp` | thời điểm đo, do client gửi lên |
| `received_at` | thời điểm server nhận — dùng làm cột partition |
| `sync_channel` | `realtime` (qua WebSocket) hoặc `batch` (qua `/api/trips/sync`) — phục vụ debug/observability |

**Partitioning plan (đề xuất, cần xác nhận ở D0.4):** partition theo tháng trên `received_at`; job dọn dẹp chạy định kỳ (daily) xoá partition cũ hơn 30 ngày thay vì `DELETE` từng dòng, để tránh khoá bảng lớn.

### 2.6. `vehicle_mismatch_warnings`

Lưu lại các cảnh báo Vehicle Mismatch Detection (FR-MISMATCH), phục vụ hiển thị lại trong nhật ký chuyến đi (FR-WARNUI-05).

| Field | Ghi chú |
|---|---|
| `id` | UUID |
| `trip_id` | FK → `trips.id` |
| `detected_at` | |
| `declared_vehicle_type` | loại xe người dùng đã khai báo |
| `observed_behavior_summary` | tóm tắt lý do sinh cảnh báo (vd. tốc độ trung bình quan sát được) — dùng ngôn ngữ trung lập |
| `user_response` | `confirmed` / `changed_vehicle` / `no_response` |
| `resolved_at` | nullable |

### 2.7. `terrain_warnings` (đổi tên từ `obstacles`)

Cảnh báo địa hình hiển thị trên bản đồ (AR Lite/warning overlay — FR-AR-01). Ở MVP, nguồn dữ liệu chủ yếu từ cấu hình/mock, **không phải** từ Computer Vision thật (đó là Post-MVP/R&D theo `PRD.md` §7–§8).

| Field | Ghi chú |
|---|---|
| `id` | UUID hoặc SERIAL |
| `reported_by_trip_id` | FK → `trips.id`, nullable nếu là dữ liệu seed/mock |
| `location` | `GEOGRAPHY(Point, 4326)` |
| `severity` | ENUM (`warning`, `danger`) — đổi từ `Orange/Red` sang tên trung lập, dễ map với UI |
| `description` | vd. "Ổ gà lớn", "Độ dốc cao" |
| `source` | `mock_seed` (MVP) hoặc `computer_vision` (Post-MVP/R&D, chưa dùng ở MVP) |
| `created_at` | |

*Loại bỏ khỏi MVP so với bản thảo gốc:* việc ghi nhận obstacle trực tiếp từ camera AI theo thời gian thực qua WebSocket khi đang lái — thuộc R&D track (AR Terrain Mesh), chưa có ở MVP.

## 3. Relationships

- `users` 1—N `vehicles`
- `users` 1—N `trips`; `vehicles` 1—N `trips`
- `vehicles` 1—N `vehicle_authorizations`; `users` 1—N `vehicle_authorizations` (theo cả `owner_id` và `borrower_id`)
- `users` 1—N `biometric_verifications`; `vehicles` 1—N `biometric_verifications`; `vehicle_authorizations` 1—N `biometric_verifications` (nullable)
- `trips` 1—1 `biometric_verifications` (qua `trips.biometric_verification_id`, xác thực đã mở khoá chuyến đi)
- `trips` 1—1 `trip_logs` (tạo khi trip kết thúc)
- `trips` 1—N `raw_gps_events`
- `trips` 1—N `vehicle_mismatch_warnings`
- `trips` 1—N `terrain_warnings` (qua `reported_by_trip_id`, nullable cho seed data)

## 4. Data Retention Summary

| Bảng | Chính sách |
|---|---|
| `users`, `vehicles` | Lưu vô thời hạn (theo vòng đời tài khoản) |
| `trips`, `trip_logs` | Lưu dài hạn (FR-RETENTION-01) |
| `raw_gps_events` | TTL 30 ngày, partition theo thời gian, cleanup tự động (FR-RETENTION-02) |
| `vehicle_authorizations` | Lưu dài hạn (lịch sử uỷ quyền/thu hồi phục vụ đối chiếu khi cần) |
| `biometric_verifications` | Lưu dài hạn **chỉ kết quả** (không ảnh thô — NFR-PRIVACY-03); nếu có yêu cầu pháp lý về xoá dữ liệu cá nhân, cần cơ chế xoá theo yêu cầu người dùng ở Post-MVP |
| `vehicle_mismatch_warnings` | Lưu dài hạn (gắn với trip_logs, phục vụ xem lại lịch sử) |
| `terrain_warnings` | Lưu dài hạn ở MVP (số lượng nhỏ, chủ yếu seed/mock); chính sách retention cho dữ liệu Computer Vision thật sẽ xác định lại ở Post-MVP |

## 5. Open Items for D0.3 / D0.4

- Xác nhận partitioning theo tháng hay theo tuần cho `raw_gps_events` (phụ thuộc ước tính tải thật).
- Xác nhận có cần bảng riêng cho "offline sync batch log" (audit từng lần gọi `/api/trips/sync`) hay đủ dùng `sync_channel` trên `raw_gps_events`.
- `vehicle_mismatch_warnings.observed_behavior_summary` cần định dạng cụ thể (free text hay structured JSON) — quyết định khi thiết kế API_REQUIREMENTS chi tiết hơn ở D0.4.
- Chọn nhà cung cấp/SDK xác thực khuôn mặt cho `biometric_verifications.provider` (FR-BIOMETRIC-05) — ảnh hưởng trực tiếp tới việc có thực sự "không lưu ảnh thô" hay chỉ là dữ liệu tạm thời trong quá trình gọi API bên thứ ba; cần xác nhận chính sách lưu trữ của nhà cung cấp trước khi chọn.
- Cân nhắc exclusion constraint (PostgreSQL `EXCLUDE USING gist`) cho `vehicle_authorizations` để enforce "không chồng thời gian hiệu lực giữa 2 borrower" ở tầng database thay vì chỉ ở application.
