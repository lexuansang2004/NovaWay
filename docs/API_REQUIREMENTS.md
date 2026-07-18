# NovaWay — API Requirements v0.1

> Step D0.2. Mức yêu cầu API, không phải OpenAPI contract cuối cùng (đó là việc của D0.4 `API_CONTRACT.md`). Mục tiêu: đủ rõ để D0.3 review tính nhất quán, đủ rõ để bước 1.1–3.1 trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` bắt đầu implement mà không phải đoán.

## 0. Conventions

- Tất cả endpoint (trừ `/health`, `register`, `login`) yêu cầu header `Authorization: Bearer <JWT>`.
- Không có token hoặc token không hợp lệ → `401`.
- Truy cập tài nguyên không thuộc sở hữu → `403` hoặc `404` (quyết định cụ thể ở D0.4, nhưng phải nhất quán toàn hệ thống).
- Base path đề xuất: `/api`.

## 1. Auth API

| Method | Path | Mục đích | Auth |
|---|---|---|---|
| GET | `/health` | Health check | Không |
| POST | `/api/auth/register` | Đăng ký tài khoản | Không |
| POST | `/api/auth/login` | Đăng nhập, trả JWT | Không |
| GET | `/api/auth/me` | Lấy thông tin người dùng hiện tại | Có |

**Request `register`/`login`** (draft): `{ "email": string, "password": string }`
**Response `login`** (draft): `{ "access_token": string, "user": { "id": uuid, "email": string } }`

Liên quan: FR-AUTH-01 → FR-AUTH-04.

## 2. Vehicle API

| Method | Path | Mục đích | Auth |
|---|---|---|---|
| GET | `/api/vehicles` | Danh sách xe của user hiện tại | Có |
| POST | `/api/vehicles` | Tạo xe mới | Có |
| GET | `/api/vehicles/:id` | Chi tiết một xe (chỉ nếu thuộc user) | Có |
| PATCH | `/api/vehicles/:id` | Cập nhật thông tin xe | Có |
| DELETE | `/api/vehicles/:id` | Xoá xe | Có |
| POST | `/api/vehicles/:id/activate` | Đặt xe này làm "đang hoạt động" | Có |

Liên quan: FR-VEHICLE-01 → FR-VEHICLE-04. Ownership check bắt buộc cho toàn bộ endpoint có `:id`.

## 3. Trip API

| Method | Path | Mục đích | Auth |
|---|---|---|---|
| POST | `/api/trips/start` | Bắt đầu chuyến đi (yêu cầu có xe active + consent) | Có |
| POST | `/api/trips/:id/end` | Kết thúc chuyến đi, tạo `trip_logs` | Có |
| GET | `/api/trips` | Danh sách chuyến đi của user (filter theo `vehicle_id` tuỳ chọn) | Có |
| GET | `/api/trips/:id` | Chi tiết một chuyến đi + warnings liên quan | Có |

**Request `start`** (draft): `{ "vehicle_id": uuid, "consent": true }` — server từ chối nếu `consent` không phải `true` hoặc `vehicle_id` không phải xe active của user.

Liên quan: FR-TRIP-01 → FR-TRIP-05.

## 4. Realtime Location (WebSocket)

**Namespace/gateway đề xuất:** `/realtime` (Socket.io).

| Event (client → server) | Payload | Mục đích |
|---|---|---|
| `location:update` | `{ trip_id, client_event_id, latitude, longitude, speed_kmh, accuracy_m, timestamp }` | Gửi một điểm GPS khi online |

| Event (server → client) | Payload | Mục đích |
|---|---|---|
| `location:broadcast` | `{ trip_id, vehicle_id, latitude, longitude, speed_kmh, timestamp }` | Đẩy vị trí realtime tới dashboard đang theo dõi |
| `connection:ack` | `{ status: "connected" }` | Xác nhận kết nối thành công sau auth |
| `mismatch:warning` | `{ trip_id, warning_id, declared_vehicle_type, ... }` | Đẩy cảnh báo Vehicle Mismatch tới client liên quan (nếu thiết kế realtime push cho warning) |

**Reconnect policy (bắt buộc, FR-REALTIME-07):** client dùng Exponential Backoff with Jitter, không retry tức thì.

**Auth cho WebSocket:** JWT truyền qua handshake (query param hoặc auth payload theo Socket.io) — chi tiết cơ chế chốt ở D0.4.

Liên quan: FR-REALTIME-01 → FR-REALTIME-08.

## 5. Offline Batch Sync (REST)

```http
POST /api/trips/sync
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**

```json
{
  "trip_id": "uuid",
  "events": [
    {
      "client_event_id": "uuid",
      "vehicle_id": "uuid",
      "timestamp": "2026-06-28T13:00:00.000Z",
      "latitude": 10.762622,
      "longitude": 106.660172,
      "speed_kmh": 35.5,
      "accuracy_m": 12.0,
      "source": "gps"
    }
  ]
}
```

**Constraints:**

- Tối đa **500 events/payload** (FR-SYNC-05). Vượt giới hạn → `400` với lỗi rõ ràng.
- Server validate ownership của `trip_id` và từng `vehicle_id` trong `events[]`.
- Idempotency theo `(user_id, client_event_id)`.

**Response (200 OK, MVP mặc định):**

```json
{
  "status": "partial_success",
  "accepted": 490,
  "duplicate_count": 5,
  "failed_count": 5,
  "failed_events": [
    {
      "client_event_id": "evt_001",
      "error_code": "INVALID_COORDINATE",
      "message": "latitude/longitude is out of range"
    }
  ]
}
```

`207 Multi-Status` là option thay thế, không bắt buộc cho MVP (TDR-005).

Liên quan: FR-SYNC-01 → FR-SYNC-08.

## 6. Vehicle Mismatch Detection — Internal Trigger

Không phải endpoint gọi trực tiếp từ client — đây là logic server-side chạy trên luồng GPS event (realtime hoặc sync), mô tả ở đây để rõ hợp đồng dữ liệu đầu ra:

- Khi phát hiện sai lệch, server tạo bản ghi `vehicle_mismatch_warnings` và đẩy `mismatch:warning` qua WebSocket nếu client đang kết nối (fallback: client poll qua `GET /api/trips/:id` nếu không nhận được realtime).

| Method | Path | Mục đích | Auth |
|---|---|---|---|
| POST | `/api/trips/:id/warnings/:warningId/respond` | Người dùng xác nhận hoặc đổi phương tiện sau cảnh báo | Có |

**Request** (draft): `{ "action": "confirmed" | "changed_vehicle", "new_vehicle_id"?: uuid }`

Liên quan: FR-MISMATCH-01 → FR-MISMATCH-05, FR-WARNUI-01 → FR-WARNUI-05.

## 7. Terrain Warnings (Read-only ở MVP)

| Method | Path | Mục đích | Auth |
|---|---|---|---|
| GET | `/api/terrain-warnings?bbox=...` | Lấy cảnh báo địa hình trong khu vực bản đồ đang xem | Có |

MVP: dữ liệu chủ yếu từ seed/mock (xem `DATA_REQUIREMENTS.md` §2.7), chưa có endpoint ghi từ Computer Vision thật.

## 8. Error Format (Đề xuất chung)

```json
{
  "error_code": "STRING_CONSTANT",
  "message": "Human-readable, không dùng thuật ngữ bị cấm"
}
```

Áp dụng cho mọi lỗi 4xx/5xx để client (mobile/web) xử lý nhất quán.

## 9. Open Items for D0.4

- Cơ chế truyền JWT qua WebSocket handshake — chốt cụ thể theo thư viện Socket.io version dùng ở NestJS.
- Có cần endpoint riêng `PATCH /api/trips/:id/vehicle` để đổi xe giữa chuyến hay không — phụ thuộc quyết định ở `EDGE_CASES.md` §2 (hiện đề xuất KHÔNG cho đổi giữa chuyến ở MVP).
- Rate limit cụ thể (số request/giây) cho `location:update` và `/api/trips/sync` — cần số liệu benchmark trước khi chốt.
