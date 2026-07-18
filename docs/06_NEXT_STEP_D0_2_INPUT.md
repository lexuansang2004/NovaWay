# NovaWay - Input for Step D0.2 PRD/SRS Draft v0.5

## 1. Purpose

File này là input sạch để chuyển sang Step D0.2: viết PRD/SRS nháp.

D0.2 chưa code. D0.2 chỉ tạo tài liệu PRD/SRS/user stories/acceptance criteria/risk/edge cases.

## 2. Product Name

NovaWay

## 3. Product Description

NovaWay là hệ thống định tuyến vị trí, quản lý phương tiện cá nhân hóa và cảnh báo địa hình thời gian thực cho người lái xe. Hệ thống gồm Backend Server, Web Dashboard, Mobile App, Map Layer và AR Lite/Warning Overlay trong màn hình sử dụng phương tiện.

## 4. Current Decisions

| Area | Decision |
|---|---|
| Backend | NestJS + TypeScript |
| Database | PostgreSQL + PostGIS |
| Realtime live stream | WebSocket/Socket.io |
| Realtime reconnect | Exponential Backoff with Jitter |
| Offline replay/sync | REST Batch Upload: `POST /api/trips/sync` |
| Batch sync limit | MVP max 500 events/payload; mobile chunks larger queues |
| Batch sync response | MVP ưu tiên `200 OK` với `{ accepted, duplicate_count, failed_events[] }`; `207 Multi-Status` là option |
| Web | React |
| Mobile | Flutter, cần chốt final ở D0.2 |
| Mobile background location | Required for active trip tracking; Android Foreground Service notification; iOS background/always permission flow if needed |
| Map data | OpenStreetMap ecosystem |
| Map web library | MapLibre GL JS recommended; Leaflet only for quick prototype |
| Tile provider MVP/dev | Protomaps hoặc Mapbox Free Tier candidate; verify quota/cost before implementation |
| Public OSM tiles | Demo nhỏ/low traffic only, không heavy production/offline prefetch |
| Self-host tiles | Post-MVP |
| AR | AR Lite / Map-based Warning Overlay in MVP |
| Warning UI | Driver-friendly overlay, one-tap action, auto-dismiss after 10 seconds |
| Full AR Mesh | R&D, not MVP core |
| Routing | Mock theo vehicle trước, OSRM/GraphHopper sau |
| Privacy | Consent required before GPS tracking |
| Offline | Local queue + REST sync-on-reconnect required |
| Raw GPS retention | TTL 30 ngày |
| Trip logs | Store long-term summary |
| Simulator | Hidden Developer Mode required for GPS/network/thermal testing |
| Abuse prevention | MVP baseline; App Attestation post-MVP |

## 5. MVP Functional Requirements Draft

1. User Authentication
   - Register/login.
   - JWT.
   - Get current user.

2. Vehicle Management
   - Create/read/update/delete vehicle.
   - Set active vehicle.
   - Vehicle required before starting trip.

3. Trip Tracking
   - Start trip.
   - Support foreground/background location behavior for active trip.
   - Android foreground service notification when tracking runs in background.
   - iOS background/always permission flow if trip tracking must continue while screen is locked.
   - Send live GPS events via WebSocket when online.
   - Queue GPS events locally when offline.
   - End trip.
   - Store trip logs.

4. Offline Sync
   - Mobile queues events when offline.
   - Mobile syncs events when connection returns via REST `POST /api/trips/sync`.
   - Each event has `client_event_id`.
   - Server handles idempotency.
   - Server returns partial success details: accepted count, duplicate count, failed events list.
   - Recommended MVP response is `200 OK` with `{ status, accepted, duplicate_count, failed_count, failed_events[] }`; `207 Multi-Status` can be documented as an optional alternative.
   - MVP batch limit: max 500 events per payload.
   - Mobile chunks local queue into multiple requests when queue exceeds 500 events.
   - WebSocket is not used for batch replay.

5. Realtime Dashboard
   - Web dashboard receives current location.
   - Map marker updates realtime.
   - Dashboard can show current status if available.
   - WebSocket clients use exponential backoff with jitter when reconnecting.

6. Location Privacy
   - Consent before tracking.
   - Stop tracking.
   - No GPS before trip starts.
   - Public/community data must be anonymized or aggregated.

7. AR Lite / Warning Overlay
   - Display terrain/route warnings on map screen.
   - No VR/glasses.
   - Fallback if AR/camera not available.
   - Fallback for thermal/low-light state.
   - Vehicle mismatch/safety warnings use large driver-friendly overlay, one-tap action, and auto-dismiss after 10 seconds.

8. Developer Mode / Simulator
   - Hidden dev/test mode.
   - Mock GPS route file.
   - Simulate intermittent offline.
   - Simulate thermal state.
   - Simulate low-light state.

9. Data Retention
   - Trip logs / trip summary stored long-term.
   - Raw GPS events TTL 30 days.
   - Raw GPS events partitioning/time-based cleanup plan.

## 6. Non-functional Requirements Draft

- Reliability: app must not crash when network is weak.
- Mobile background reliability: active trip tracking must define behavior when app is backgrounded or screen is locked.
- Privacy: GPS data requires explicit consent.
- Performance: GPS event frequency must be rate limited.
- Battery: AR/camera should not run continuously without safeguards.
- Scalability: realtime layer should be designed to add Redis adapter later.
- Reconnect resilience: WebSocket reconnect must use exponential backoff with jitter.
- Data retention: raw GPS events must not be stored indefinitely by default.
- Maintainability: code must be modular and readable by AI agents.
- Testability: each micro-step must have test gate; simulator is required for hard-to-reproduce scenarios.
- Security: validate payloads, rate limit GPS, check ownership, use idempotency for sync.
- API stability: offline sync API must enforce max 500 events/payload in MVP and require mobile chunking.
- API stability: offline sync API must define partial success response shape before implementation.
- Safety UX: warnings shown while driving must be driver-friendly, one-tap, and auto-dismiss.
- Abuse roadmap: App Attestation belongs to Post-MVP security hardening.

## 7. Edge Cases

- User denies location permission.
- User starts trip without active vehicle.
- Mobile loses network.
- Mobile app is backgrounded or screen is locked during active trip.
- Mobile reconnects with large local queue.
- Many devices reconnect at the same time after losing signal in the same area.
- Duplicate GPS event after reconnect.
- Batch sync partially fails.
- Partial success response shape is ambiguous if not specified.
- Local queue exceeds 500 events and must be chunked.
- WebSocket disconnects.
- GPS payload is invalid.
- GPS event is too frequent.
- Device overheats.
- Low light makes AR/camera unreliable.
- User switches vehicle mid-trip.
- Vehicle mismatch warning appears while user is driving and must not distract.
- User reports false obstacle.
- Tile provider quota exceeded.
- Raw GPS table grows too fast.
- Developer Mode accidentally exposed in production.

## 8. D0.2 Output Required

Step D0.2 must produce:

```text
docs/PRD.md
docs/SRS.md
docs/USER_STORIES.md
docs/ACCEPTANCE_CRITERIA.md
docs/RISK_REGISTER.md
docs/EDGE_CASES.md
docs/DATA_REQUIREMENTS.md
docs/API_REQUIREMENTS.md
docs/TEST_STRATEGY.md
```

## 9. D0.2 Must Include

PRD/SRS phải thể hiện rõ:

- MVP / Post-MVP / R&D boundary.
- Offline sync uses REST batch upload.
- WebSocket is for live stream only.
- WebSocket reconnect uses exponential backoff with jitter.
- `client_event_id` idempotency.
- Batch sync limit: max 500 events/payload and mobile chunking.
- Batch sync response contract: prefer `200 OK` + `{ accepted, duplicate_count, failed_events[] }`; `207 Multi-Status` optional.
- Raw GPS TTL 30 days.
- Partitioning/time-based cleanup plan.
- Tile provider strategy: Protomaps/Mapbox candidate, self-host later.
- Developer Mode/Simulator requirements.
- Background Location Service requirements for active trip tracking.
- Driver-friendly warning UI: overlay, one-tap action, auto-dismiss after 10 seconds.
- App Attestation is post-MVP.
- No negative wording like “gian lận” or “phạt nguội”.

## 10. D0.2 Test Gate

D0.2 đạt khi:

```text
- PRD có vision, users, problem, scope, out-of-scope
- SRS có functional + non-functional requirements
- User stories có acceptance criteria
- MVP/Post-MVP/R&D rõ ràng
- Offline sync protocol rõ: REST /api/trips/sync
- Sync batch limit rõ: tối đa 500 events/payload và mobile chunking
- Batch sync response rõ: accepted/duplicate/failed_events, không mơ hồ partial success
- Live realtime protocol rõ: WebSocket/Socket.io
- Reconnect protocol rõ: exponential backoff with jitter
- Data retention rõ: trip logs long-term, raw GPS TTL 30 ngày
- Simulator/dev mode có trong MVP testability
- Mobile background location service có requirement và fallback
- Warning UI khi đang lái có rule overlay/one-tap/auto-dismiss 10 giây
- Tile provider strategy rõ
- Abuse prevention roadmap rõ
- Không còn nhầm NovaPay
- Không dùng wording gian lận/phạt nguội
- Không yêu cầu code
- Có open questions còn lại nếu chưa chốt
```
