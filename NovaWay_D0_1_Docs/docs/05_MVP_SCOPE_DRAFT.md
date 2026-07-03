# NovaWay - MVP Scope Draft v0.5

## 1. MVP Goal

MVP NovaWay chứng minh được luồng cốt lõi:

```text
User đăng nhập
→ tạo/chọn phương tiện
→ bắt đầu chuyến đi trên mobile
→ gửi GPS realtime khi online
→ web dashboard thấy vị trí trên map
→ mất mạng thì mobile lưu local queue
→ có mạng lại thì sync batch qua REST
→ app ghi trip logs
→ raw GPS events có TTL/cleanup policy
→ có cảnh báo/overlay cơ bản trên map
→ mobile tracking có background/foreground behavior rõ
→ sync batch có chunking giới hạn 500 events/payload
→ WebSocket reconnect dùng exponential backoff with jitter
→ có Developer Mode ẩn để test GPS/network/thermal
```

## 2. In Scope - MVP

### 2.1. Backend

- NestJS project foundation.
- Environment config.
- Health check.
- Auth JWT.
- Users.
- Vehicles.
- Active vehicle.
- Trip start/end.
- GPS live event receive via WebSocket/Socket.io.
- Offline sync REST endpoint: `POST /api/trips/sync`.
- Batch sync limit: max 500 events/payload in MVP.
- Partial success/error response plan for sync.
- Sync API response format: MVP ưu tiên `200 OK` kèm `{ accepted, duplicate_count, failed_events[] }`; `207 Multi-Status` là option.
- Reconnect policy: exponential backoff with jitter for WebSocket clients.
- Realtime gateway.
- Basic validation.
- Basic rate limit.
- Idempotency via `client_event_id`.
- PostgreSQL/PostGIS schema.
- Raw GPS events table with TTL 30 days.
- Partitioning plan for raw GPS events.

### 2.2. Web Dashboard

- Login.
- Vehicle list.
- Basic live map.
- Current vehicle marker.
- Simple trip list.
- Basic warning overlay.
- Display sync/live status if available.

### 2.3. Mobile App

- Login.
- Location consent.
- Foreground/background location behavior for active trip.
- Android foreground service notification for background tracking.
- iOS background/always location permission flow if active trip tracking must continue while screen is locked.
- Vehicle selection required.
- Start/end trip.
- GPS realtime sending via WebSocket when online.
- Connected/disconnected status.
- Offline queue basic.
- REST batch sync when reconnecting.
- Vehicle-use screen with Map + AR Lite/warning overlay.
- Developer Mode ẩn for dev/test only.

### 2.4. Offline Sync

- WebSocket is only for live stream.
- Offline replay uses REST: `POST /api/trips/sync`.
- Local queue stores GPS/trip events when offline.
- Each event includes `client_event_id`.
- Server must avoid duplicate insert using idempotency.
- Batch size must be limited to 500 events/payload for MVP.
- Mobile must chunk local queue when it exceeds 500 events.
- Retry policy must be defined.
- API response should support clear accepted/rejected event reporting.
- Recommended MVP response: `200 OK` with `{ status, accepted, duplicate_count, failed_count, failed_events[] }`.
- `207 Multi-Status` may be documented as an alternative, but client logic must not be ambiguous.

### 2.5. Realtime Reconnect Resilience

- WebSocket reconnect must use Exponential Backoff with Jitter.
- Mobile must not reconnect in a tight loop.
- Reconnect delay must vary across clients to reduce thundering herd risk.
- Live stream resumes via WebSocket after reconnect.
- Offline queue remains synced via REST batch upload.

### 2.6. Data Retention

- Trip logs / trip summary: stored long-term.
- Raw GPS events: TTL 30 days.
- Raw GPS events require time-based partitioning or partitioning plan.
- Public/community warning data must use aggregate/reduced-identification data.

### 2.7. Map

- OpenStreetMap ecosystem.
- Web client: MapLibre GL JS recommended.
- Leaflet acceptable only for quick prototype.
- Tile provider candidate for MVP/dev:
  - Protomaps.
  - Mapbox Free Tier.
- Public OSM tiles only for low-traffic demo and compliant usage.
- Self-host tile server/vector tiles is Post-MVP.
- Mobile map plugin selected in D0.2/D0.3.

### 2.8. AR Lite

- Not VR.
- Not glasses.
- Not full Unity mesh in MVP core.
- Map-based warning overlay.
- Optional camera/AR preview only if safe.
- Fallback if device/environment is not suitable.
- Thermal/low-light state must be testable via simulator/dev mode.

### 2.9. Driver-friendly Warning UI

Vehicle mismatch / safety warnings in MVP must be safe for drivers:

- Large readable overlay on vehicle-use screen.
- One-tap action.
- Auto-dismiss after 10 seconds if no response.
- No complex form/input while driving.
- Warning can be viewed later in trip/warning log.

### 2.10. Simulator / Developer Mode

MVP includes a hidden Developer Mode for repeatable testing.

Developer Mode must support:

- Load mock GPS route file.
- Simulate highway route / special route.
- Simulate intermittent network loss.
- Simulate thermal state.
- Simulate low-light state.

Constraints:

- Hidden in production user flow.
- Controlled by env/build flag if possible.
- Only for test/dev builds or protected dev access.

### 2.11. Privacy / Safety

- Consent before GPS tracking.
- Stop tracking button.
- No tracking before trip starts.
- Basic anonymization for public warning data.
- Clear wording: no “gian lận”, no “phạt nguội”.

### 2.12. Security Baseline

- JWT auth.
- GPS event payload validation.
- Rate limit GPS events/endpoints.
- Ownership check for trip/vehicle.
- Idempotency for offline sync.
- Reconnect protection with exponential backoff + jitter.
- Batch limit enforcement for sync endpoint.

## 3. Out of Scope - MVP

- Full Unity AR Mesh Grid embedded in Flutter.
- Kafka/NATS.
- Full gamification.
- Crowdsourced trust scoring production-grade.
- AI camera pothole detection production-grade.
- Admin portal full version.
- Offline map download.
- Self-host tile server.
- App Attestation / Play Integrity / DeviceCheck.
- Payment/subscription.

## 4. Post-MVP

- Crowdsourced Trust Verification.
- Gamification points/badges.
- Redis adapter for scale.
- Better trip analytics.
- Routing engine integration.
- Push notifications.
- Admin moderation.
- App Attestation / Device trust score.
- Self-host tiles/vector tiles if needed.

## 5. R&D Track

- Unity AR terrain prototype.
- AR Foundation.
- Mesh grid / obstacle detection.
- Thermal/pin/FPS/low-light test.
- Decision whether to embed into mobile app.

## 6. MVP Test Gate

MVP đạt khi:

```text
- User đăng ký/đăng nhập được
- User tạo xe được
- User chọn xe trước khi đi
- Mobile gửi GPS realtime qua WebSocket khi online
- Android/iOS background tracking behavior được mô tả và test ở mức MVP
- Android foreground service notification xuất hiện khi active trip tracking chạy nền
- Web thấy marker realtime
- Mất mạng mobile không crash
- Offline events được lưu local queue
- Có mạng lại sync queue qua POST /api/trips/sync
- Queue > 500 events được chunk thành nhiều request
- Partial success response trả rõ accepted/failed/duplicate events
- WebSocket reconnect dùng exponential backoff with jitter
- Duplicate client_event_id không tạo record trùng
- Trip logs lưu được
- Raw GPS events có TTL policy 30 ngày
- Data model có partitioning plan cho raw GPS events
- Map hiển thị ổn bằng tile provider hợp lệ
- Có consent location
- Có cảnh báo/overlay cơ bản trên màn hình sử dụng phương tiện
- Vehicle mismatch warning hiển thị dạng overlay rõ, 1 chạm, auto-dismiss sau 10 giây
- Developer Mode chạy được mock GPS route
- Developer Mode giả lập được mất mạng/thermal/low-light
```
