# NovaWay — API Contract v0.1

> Step D0.4. Cụ thể hoá `API_REQUIREMENTS.md` (D0.2) thành contract đủ chi tiết để backend/web/mobile code theo mà không phải đoán field. Không phải OpenAPI YAML chính thức (có thể sinh ra sau từ đây ở step `1.1`), nhưng đủ rõ để dùng làm nguồn tham chiếu duy nhất (single source of truth) cho request/response.

## 0. Conventions

- Base URL: `/api` (versioning: chưa cần `/v1` ở MVP — 1 backend, chưa có breaking change cần quản lý song song; thêm version prefix nếu cần ở Post-MVP).
- Auth: `Authorization: Bearer <JWT>` cho mọi endpoint trừ `POST /api/auth/register`, `POST /api/auth/login`, `GET /health`.
- Content-Type: `application/json` cho mọi request/response có body.
- Timestamp: ISO 8601 UTC (`2026-07-18T13:00:00.000Z`).
- ID: UUID v4 dạng chuỗi.
- Lỗi: xem §8 (Error Format) — áp dụng thống nhất cho mọi endpoint.

## 1. Auth

### `POST /api/auth/register`

Request:
```json
{ "email": "driver@example.com", "password": "min-8-chars" }
```

Response `201`:
```json
{ "id": "uuid", "email": "driver@example.com", "created_at": "2026-07-18T13:00:00.000Z" }
```

Response lỗi: `409 EMAIL_ALREADY_EXISTS`.

### `POST /api/auth/login`

Request:
```json
{ "email": "driver@example.com", "password": "..." }
```

Response `200`:
```json
{ "access_token": "jwt...", "user": { "id": "uuid", "email": "driver@example.com" } }
```

Response lỗi: `401 INVALID_CREDENTIALS`.

### `GET /api/auth/me`

Response `200`:
```json
{ "id": "uuid", "email": "driver@example.com" }
```

## 2. Vehicles

### `GET /api/vehicles`

Response `200`:
```json
{ "vehicles": [ { "id": "uuid", "type": "motorbike", "license_plate": "59A-12345", "brand_model": "Honda SH", "is_active": true } ] }
```

### `POST /api/vehicles`

Request:
```json
{ "type": "motorbike", "license_plate": "59A-12345", "brand_model": "Honda SH" }
```

Response `201`: object xe vừa tạo (cùng shape ở trên).

### `PATCH /api/vehicles/:id`

Request: bất kỳ tập con field nào của vehicle (trừ `id`, `user_id`).

Response `200`: object xe đã cập nhật. Lỗi `403 NOT_VEHICLE_OWNER` nếu không thuộc user.

### `DELETE /api/vehicles/:id`

Response `204`. Lỗi `403 NOT_VEHICLE_OWNER`.

### `POST /api/vehicles/:id/activate`

Response `200`: `{ "id": "uuid", "is_active": true }`. Tự động set `is_active = false` cho xe active trước đó của cùng user (unique index ở `DATA_MODEL.md` §2.2 enforce ở DB, API chỉ cần đảm bảo transaction đúng).

## 3. Vehicle Authorization

### `POST /api/vehicles/:id/authorizations`

> Chỉ owner của `:id` gọi được.

Request:
```json
{ "borrower_email": "borrower@example.com", "expires_at": "2026-07-19T00:00:00.000Z" }
```

Response `201`:
```json
{ "id": "uuid", "vehicle_id": "uuid", "owner_id": "uuid", "borrower_id": "uuid", "granted_at": "...", "expires_at": "...", "status": "active" }
```

Lỗi:
- `403 NOT_VEHICLE_OWNER`
- `404 BORROWER_NOT_FOUND`
- `409 OVERLAPPING_AUTHORIZATION` — trùng thời gian hiệu lực với uỷ quyền khác đang active cho cùng xe
- `400 BORROWER_IS_OWNER` — không cho tự cấp cho chính mình (Edge Case §2.1)

### `GET /api/vehicles/:id/authorizations`

Response `200`: `{ "authorizations": [ {...}, ... ] }` (chỉ owner xem được).

### `DELETE /api/vehicles/:id/authorizations/:authId`

Response `200`: object uỷ quyền với `status: "revoked"`, `revoked_at` set. Không xoá cứng (giữ lịch sử — `DATA_REQUIREMENTS.md` §4).

### `GET /api/authorizations/me`

Response `200`: `{ "authorizations": [ { "vehicle": {...}, "owner_email": "...", "expires_at": "...", "status": "active" } ] }` — dùng cho UI "Chủ xe X phê duyệt, còn Y giờ" (FR-AUTHZ-04).

## 4. Biometric Verification

### `POST /api/vehicles/:id/verify`

Request (draft — payload thực tế phụ thuộc `provider` đã chọn ở D0.7, ví dụ multipart cho ảnh/video ngắn hoặc token từ SDK client-side):
```json
{ "provider_payload": "..." }
```

Response `200`:
```json
{ "verification_id": "uuid", "result": "success" }
```

hoặc

```json
{ "verification_id": "uuid", "result": "failed", "error_code": "FACE_NOT_MATCHED" }
```

Lỗi trước khi verify (không tốn chi phí gọi provider — FR-BIOMETRIC-02):
- `403 NOT_AUTHORIZED_FOR_VEHICLE` — không phải owner, không có `vehicle_authorizations` active

**Cam kết dữ liệu:** response và toàn bộ log liên quan **không bao giờ** chứa ảnh/video khuôn mặt thô — chỉ `verification_id` và `result` (NFR-PRIVACY-03).

## 5. Trips

### `POST /api/trips/start`

Request:
```json
{ "vehicle_id": "uuid", "consent": true, "verification_id": "uuid" }
```

Response `201`:
```json
{ "id": "uuid", "vehicle_id": "uuid", "status": "active", "started_at": "..." }
```

Lỗi:
- `400 CONSENT_REQUIRED`
- `400 NO_ACTIVE_VEHICLE`
- `400 VERIFICATION_INVALID` — `verification_id` không tồn tại, `result != success`, hoặc đã quá ngưỡng thời gian (giá trị ngưỡng: Open Item, `API_REQUIREMENTS.md` §9 gốc)
- `409 TRIP_ALREADY_ACTIVE` — user đã có trip active khác (unique index `DATA_MODEL.md` §2.5)

### `POST /api/trips/:id/end`

Response `200`: object trip với `status: "ended"`, `ended_at` set, kèm `trip_log` tóm tắt vừa tạo.

### `GET /api/trips`

Query param tuỳ chọn: `?vehicle_id=uuid`.

Response `200`: `{ "trips": [ { "id", "vehicle_id", "status", "started_at", "ended_at", "distance_km", "duration_minutes", "mismatch_warning_count" }, ... ] }`.

`duration_minutes`/`mismatch_warning_count` bổ sung 07/2026 (trước step `7.2`) — cần cho biểu đồ analytics của web dashboard, lấy thẳng từ `trip_logs` giống `distance_km` (đều `0` cho trip đang active, chưa có `trip_log`). Không phải thay đổi breaking — chỉ thêm field vào response đã có.

### `GET /api/trips/:id`

Response `200`: chi tiết trip + `trip_log` (nếu đã kết thúc) + danh sách `vehicle_mismatch_warnings` liên quan.

## 6. Realtime (WebSocket, namespace `/realtime`)

### Client → Server: `location:update`

```json
{
  "trip_id": "uuid",
  "client_event_id": "uuid",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "speed_kmh": 35.5,
  "accuracy_m": 12.0,
  "timestamp": "2026-07-18T13:00:00.000Z"
}
```

Server validate: `trip_id` thuộc user đã auth qua handshake, toạ độ hợp lệ (`-90..90`, `-180..180`), `speed_kmh >= 0`. Payload sai bị drop kèm event `location:rejected` trả về client (không broadcast, không lưu).

### Server → Client: `location:broadcast`

```json
{ "trip_id": "uuid", "vehicle_id": "uuid", "latitude": 10.762622, "longitude": 106.660172, "speed_kmh": 35.5, "timestamp": "..." }
```

### Server → Client: `mismatch:warning`

```json
{ "trip_id": "uuid", "warning_id": "uuid", "declared_vehicle_type": "motorbike", "observed_behavior_summary": "Tốc độ trung bình 85 km/h trong 3 phút" }
```

### Client → Server: `location:rejected` (ack lỗi, không phải event nghiệp vụ)

```json
{ "client_event_id": "uuid", "error_code": "INVALID_COORDINATE" }
```

## 7. Offline Batch Sync

### `POST /api/trips/sync`

Request:
```json
{
  "trip_id": "uuid",
  "events": [
    {
      "client_event_id": "uuid",
      "vehicle_id": "uuid",
      "timestamp": "2026-07-18T13:00:00.000Z",
      "latitude": 10.762622,
      "longitude": 106.660172,
      "speed_kmh": 35.5,
      "accuracy_m": 12.0,
      "source": "gps"
    }
  ]
}
```

Ràng buộc: tối đa 500 events/mảng `events`. Vượt → `400 BATCH_TOO_LARGE`.

Response `200`:
```json
{
  "status": "partial_success",
  "accepted": 490,
  "duplicate_count": 5,
  "failed_count": 5,
  "failed_events": [
    { "client_event_id": "evt_001", "error_code": "INVALID_COORDINATE", "message": "latitude/longitude is out of range" }
  ]
}
```

`status` có thể là `success` (100% accepted, không lỗi/trùng), `partial_success`, hoặc `all_failed`.

## 8. Error Format (áp dụng toàn hệ thống)

```json
{ "error_code": "STRING_CONSTANT", "message": "Human-readable, không dùng thuật ngữ bị cấm" }
```

| HTTP Status | Khi nào dùng |
|---|---|
| `400` | Payload sai/thiếu field, vượt giới hạn (batch size, v.v.) |
| `401` | Thiếu/sai token |
| `403` | Có token hợp lệ, resource tồn tại nhưng không thuộc sở hữu của user (vd. `NOT_VEHICLE_OWNER`) — quy ước thống nhất toàn backend, xem §11 |
| `404` | Resource không tồn tại thật sự (không tồn tại ID đó ở bất kỳ user nào) |
| `409` | Xung đột trạng thái (trip đã active, uỷ quyền chồng thời gian, email đã tồn tại) |
| `429` | Vượt rate limit (GPS event, login attempts) |
| `500` | Lỗi hệ thống không lường trước |

## 9. Terrain Warnings (read-only ở MVP)

### `GET /api/terrain-warnings?bbox=lat1,lng1,lat2,lng2`

Response `200`: `{ "warnings": [ { "id", "location": {"lat", "lng"}, "severity", "description" }, ... ] }`.

## 10. Routing (mock, step `5.1`)

> Bổ sung 07/2026 — tự rà trước khi code step `5.1`: `ARCHITECTURE.md` §3.2/§7 mô tả `RoutingProvider` từ D0.4 nhưng chưa từng có contract HTTP tương ứng ở đây. Xem `SRS.md` §1.14 (FR-ROUTING), `REVIEW_NOTES.md` §14.

### `POST /api/routes/preview`

Request:
```json
{ "vehicle_id": "uuid", "origin": { "lat": 10.762622, "lng": 106.660172 }, "destination": { "lat": 10.780000, "lng": 106.700000 } }
```

Response `200`:
```json
{ "vehicle_type": "motorbike", "distance_km": 5.2, "duration_min": 9, "polyline": [ [10.762622, 106.660172], [10.771311, 106.680086], [10.780000, 106.700000] ] }
```

Lỗi:
- `400 VALIDATION_ERROR` — thiếu/sai `vehicle_id`, `origin`, hoặc `destination`
- `403 NOT_AUTHORIZED_FOR_VEHICLE` — không phải owner, không có `vehicle_authorizations` active cho `vehicle_id` (cùng quy ước §4)

Ghi chú: MVP sinh route mock bằng nội suy tuyến tính giữa `origin`/`destination` kèm vài điểm trung gian; `duration_min` tính theo tốc độ trung bình giả lập khác nhau theo `vehicle_type` (`motorbike` nhanh hơn `car` trong đô thị) để lộ trình quan sát được là khác nhau theo loại xe (FR-ROUTING-02). Thay bằng OSRM/GraphHopper thật ở step `5.2`, giữ nguyên contract này.

## 11. Open Items for D0.7

- ~~`403` vs `404` cho resource không thuộc sở hữu~~ — **Đã chốt (07/2026, trước step `1.4`)**: dùng `403` kèm error_code cụ thể theo resource (vd. `NOT_VEHICLE_OWNER`), áp dụng cho toàn backend — khớp đúng ví dụ đã có sẵn ở §2. Lý do: vehicle ID (và các resource tương tự sau này) không phải thông tin nhạy cảm cần giấu tồn tại; 403 + error_code rõ ràng giúp FE hiển thị thông báo chính xác hơn "not found" chung chung, và tránh phải query 2 lần (exists-but-not-mine vs not-exists) ở mọi endpoint. `404` chỉ dùng khi resource thật sự không tồn tại (ID sai/đã xoá) — xem §8.
- Payload cụ thể cho `POST /api/vehicles/:id/verify` phụ thuộc nhà cung cấp biometric đã chọn — placeholder `provider_payload` sẽ được thay bằng schema thật. **Vẫn mở** sau MVP.
- ~~Ngưỡng thời gian hợp lệ của `verification_id` trước khi bị coi là hết hạn để dùng cho `trips/start`~~ — **Đã chốt (07/2026, step `7.1`)**: 5 phút (`VERIFICATION_VALIDITY_MINUTES`, xem `apps/backend/.env.example`).
- Rate limit cụ thể theo endpoint (số request/giây/user) — cần benchmark. **Chưa triển khai** — không có middleware rate-limit nào trong `apps/backend` tính tới MVP baseline. Xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`.
