# NovaWay - Technical Decision Record v0.5

## TDR-001: Backend Framework

### Decision

Chọn **NestJS + TypeScript** cho backend MVP.

### Context

NovaWay cần backend có các phần:

- REST API.
- Auth JWT.
- Vehicle Management.
- PostgreSQL/PostGIS.
- WebSocket realtime.
- REST batch sync for offline queue.
- Redis scale sau.
- Validation.
- Testing.
- Swagger/OpenAPI.
- Dễ đọc bởi AI agent/Codex/Claude Code.

### Options

| Option | Ưu điểm | Nhược điểm | Quyết định |
|---|---|---|---|
| NestJS | Có kiến trúc module rõ, TypeScript, hợp API/WebSocket/testing | Hiệu năng raw thấp hơn Go | Chọn cho MVP |
| Go | Hiệu năng cao, binary gọn | Code nhanh với AI/Product docs kém thuận lợi hơn cho giai đoạn đầu | Để sau cho service chuyên biệt |

### Rationale

NestJS phù hợp hơn cho NovaWay ở giai đoạn MVP vì dự án cần tốc độ build, cấu trúc rõ, dễ test, dễ chia module, dễ để AI agent đọc và triển khai theo từng phase.

### Consequence

Backend MVP dùng:

```text
NestJS
TypeScript
PostgreSQL + PostGIS
Prisma hoặc TypeORM
Socket.io/WebSocket
REST API for offline batch sync
Redis sau MVP hoặc khi scale
```

Go chỉ cân nhắc sau này cho:

- Routing worker hiệu năng cao.
- Telemetry processing service.
- High-throughput event processor.

---

## TDR-002: Map Stack

> **Cập nhật (R1-7, 07/2026):** Tile provider candidate (OQ-005) đã chốt final — xem `docs/architecture/TDR-tile-provider-spike.md`. Phần "Tile Provider Candidate" bên dưới giữ nguyên như bản gốc D0.2 để tránh mất lịch sử; quyết định final ở doc riêng đó.

### Decision

Dùng hệ sinh thái **OpenStreetMap** làm nguồn bản đồ. Không phụ thuộc trực tiếp vào public OSM tile server cho production.

### Recommended Stack

MVP/dev:

```text
OpenStreetMap data/ecosystem
MapLibre GL JS cho web dashboard
Protomaps hoặc Mapbox Free Tier làm tile provider candidate
```

Prototype cực nhanh:

```text
Leaflet + tile provider hợp lệ
```

Production hướng bền:

```text
MapLibre GL JS + vector tiles
OSM-derived tile provider hoặc self-host tile server/vector tiles
```

### Leaflet vs MapLibre

| Option | Khi dùng |
|---|---|
| Leaflet | Muốn nhanh, đơn giản, raster tiles, MVP nhỏ |
| MapLibre GL JS | Muốn vector tiles, style đẹp hơn, route/overlay phức tạp hơn, scale tốt hơn cho dashboard |

### Tile Provider Candidate

| Option | Vai trò | Ghi chú |
|---|---|---|
| Protomaps | Candidate ưu tiên cho OSM/vector-tile-friendly MVP/dev | Cần kiểm tra pricing/quota/hosting flow trước D0.3 |
| Mapbox Free Tier | Candidate fallback thực dụng | Cần kiểm tra quota/cost/current pricing trước khi implement |
| Public OSM tiles | Chỉ demo nhỏ/low traffic | Không dùng cho heavy production/offline prefetch |
| Self-host tiles/vector tiles | Post-MVP | Khi có nhu cầu kiểm soát chi phí/tải/production |

### Recommendation for NovaWay

- Web Dashboard: **MapLibre GL JS**.
- Mobile Flutter: chọn plugin map tương thích OSM/MapLibre sau khi chốt D0.2/D0.3.
- Tile provider MVP/dev: ghi cả Protomaps và Mapbox Free Tier làm candidate; chọn final ở bước technical spike trước khi code map.

### Important Note

OpenStreetMap data là miễn phí, nhưng public tile server của OSM có giới hạn, không có SLA và không dành cho heavy production/offline prefetch. Vì vậy NovaWay cần tile strategy rõ.

---

## TDR-003: AR Scope in MVP

### Decision

MVP có AR ở mức **AR Lite / Map-based Warning Overlay** trong màn hình sử dụng phương tiện.

### Not in MVP

- Không làm kính ảo.
- Không làm VR.
- Không bắt buộc Unity AR Mesh Grid trong app chính.
- Không quét camera liên tục nếu chưa đo pin/nhiệt.

### MVP Behavior

Màn hình sử dụng phương tiện gồm:

- Map.
- Marker vị trí hiện tại.
- Route/warning overlay.
- Cảnh báo địa hình trực quan.
- Optional AR/camera preview nếu thiết bị đủ điều kiện.
- Fallback khi thiết bị nóng, pin yếu, ánh sáng yếu hoặc camera không khả dụng.

### R&D Behavior

Unity AR Terrain Mesh làm project riêng:

- Plane/mesh detection.
- Obstacle mock.
- FPS/pin/thermal test.
- Low-light fallback.

Chỉ tích hợp vào mobile app sau khi R&D đạt test gate.

> **Cập nhật (08/2026):** quyết định tech stack cụ thể cho R&D prototype này (dùng cho báo cáo hội đồng, không phải hạng mục MVP) — xem TDR-012.

---

## TDR-004: Realtime Scale Strategy

### Decision

Không over-engineer Kafka từ đầu.

### Roadmap

```text
MVP: Single NestJS WebSocket Gateway
Scale 1: Redis adapter/pubsub
Scale 2: Queue/event processor
Scale lớn: Kafka/NATS nếu có tải thật
```

### Reason

MVP cần kiểm chứng nghiệp vụ trước. Kafka/NATS chỉ cần khi có tải lớn hoặc event processing phức tạp.

---

## TDR-005: Offline Sync Protocol

### Decision

Tách rõ 2 luồng dữ liệu:

```text
Live stream khi online: WebSocket/Socket.io
Replay dữ liệu offline: REST Batch Upload POST /api/trips/sync
```

### Reason

Khi mobile mất mạng lâu, local queue có thể chứa nhiều GPS events. Nếu vừa reconnect đã replay qua WebSocket, server dễ bị nghẽn, mất gói hoặc khó kiểm soát idempotency.

### Consequence

Backend phải có API batch sync:

```http
POST /api/trips/sync
```

Payload phải có:

- `trip_id`
- `events[]`
- `client_event_id`
- `timestamp`
- `latitude`
- `longitude`
- `speed_kmh`
- `accuracy_m`

Server phải:

- Validate batch size.
- Enforce MVP batch limit: max 500 events per payload.
- Return clear error if payload exceeds limit.
- Validate ownership của `trip_id`/`vehicle_id`.
- Idempotency theo `client_event_id` + `user_id` hoặc `trip_id`.
- Trả kết quả partial success nếu một số event lỗi.

### Partial Success Response Strategy

MVP ưu tiên dùng `200 OK` với response body rõ ràng để mobile xử lý đơn giản:

```json
{
  "status": "partial_success",
  "accepted": 490,
  "duplicate_count": 5,
  "failed_count": 10,
  "failed_events": [
    {
      "client_event_id": "evt_001",
      "error_code": "INVALID_COORDINATE",
      "message": "latitude/longitude is out of range"
    }
  ]
}
```

`207 Multi-Status` có thể dùng như option nếu team muốn semantic HTTP rõ hơn, nhưng không bắt buộc cho MVP. Điều quan trọng là response phải cho mobile biết event nào đã nhận, event nào trùng, event nào lỗi để không retry vô hạn.

---

## TDR-006: Data Retention and GPS Storage

### Decision

- Trip summary / `trip_logs`: lưu dài hạn.
- Raw GPS events: TTL 30 ngày ở MVP.
- Raw GPS events table cần thiết kế theo hướng partitioning theo thời gian.

### Reason

GPS realtime có thể tạo dữ liệu rất lớn. Nếu lưu raw GPS vô hạn trong PostgreSQL, database sẽ phình nhanh, backup chậm, query chậm và chi phí tăng.

### Consequence

D0.2/SRS phải yêu cầu:

- Data retention policy.
- Cleanup job hoặc scheduled task.
- Partitioning plan cho raw GPS events.
- Không dùng raw GPS làm dữ liệu public nếu chưa giảm định danh.

---

## TDR-007: Simulator / Developer Mode

### Decision

MVP cần Developer Mode ẩn để test các tình huống khó tái hiện ngoài thực tế.

### Scope

Developer Mode hỗ trợ:

- Load mock GPS route file.
- Giả lập route cao tốc / route đặc biệt.
- Giả lập mất mạng ngắt quãng.
- Giả lập thermal state.
- Giả lập low-light state.

### Reason

Không thể yêu cầu developer luôn lái xe thật, ra cao tốc, đưa máy vào môi trường tối hoặc làm nóng thiết bị để test. Simulator giúp test micro-step nhanh và lặp lại được.

### Constraint

Developer Mode:

- Không bật mặc định ở production.
- Không hiển thị cho user thường.
- Có thể bị tắt bằng env/build flag.

---

## TDR-008: Abuse Prevention Roadmap

### Decision

MVP có security baseline, còn App Attestation đưa vào Post-MVP.

### MVP Security Baseline

- JWT auth.
- Rate limit GPS endpoints/events.
- Payload validation.
- Ownership check.
- Idempotency key.
- Basic anomaly detection.

### Post-MVP Security Hardening

- Android Play Integrity API hoặc giải pháp tương đương.
- iOS DeviceCheck/App Attest hoặc giải pháp tương đương.
- Device trust score.
- Endpoint policy yêu cầu attestation token cho GPS/trust-sensitive endpoints.
- Abuse dashboard cho admin/moderator.

### Reason

App Attestation quan trọng, nhưng có thể làm phức tạp build mobile và test ban đầu. Nên đưa vào roadmap sau khi core GPS/realtime/offline ổn định.


---

## TDR-009: Mobile Background Location Service

### Decision

MVP phải thiết kế background location behavior cho active trip tracking.

### Scope

- Tracking chỉ chạy khi người dùng đã start trip và đã consent.
- Android: dùng Foreground Service khi tracking cần tiếp tục lúc app chạy nền/khóa màn hình, kèm notification liên tục.
- iOS: thiết kế permission flow phù hợp cho background/always location nếu cần tracking liên tục khi khóa màn hình.
- Nếu user không cấp quyền background, app vẫn có thể chạy foreground tracking nhưng phải cảnh báo giới hạn.

### Reason

Nếu không thiết kế background behavior từ đầu, trip logs và realtime tracking sẽ bị đứt gãy khi người dùng khóa màn hình hoặc chuyển app sang nền.

---

## TDR-010: Reconnect and Batch Sync Resilience

### Decision

NovaWay tách reconnect live stream và offline batch sync thành 2 cơ chế có kiểm soát.

### Rules

- WebSocket reconnect dùng Exponential Backoff with Jitter.
- Không retry đồng loạt ngay lập tức sau khi mạng quay lại.
- Offline queue sync qua REST `POST /api/trips/sync`.
- MVP batch limit: tối đa 500 events/payload.
- Mobile phải chunk queue nếu vượt 500 events.
- Server cần idempotency và partial success response plan.
- Partial success MVP ưu tiên `200 OK` + payload `{ accepted, duplicate_count, failed_events[] }`; `207 Multi-Status` là option.

### Reason

Giảm nguy cơ thundering herd khi nhiều client cùng reconnect sau khi ra khỏi vùng mất sóng, đồng thời tránh timeout HTTP khi payload đồng bộ quá lớn.

---

## TDR-011: Driver-friendly Warning UI

### Decision

Các cảnh báo quan trọng khi đang lái phải dùng driver-friendly overlay thay vì chỉ dựa vào push notification.

### Rules

- Overlay lớn, rõ, dễ đọc.
- Có hành động 1 chạm.
- Auto-dismiss sau 10 giây nếu không phản hồi.
- Không yêu cầu nhập liệu hoặc thao tác phức tạp khi đang lái.
- Không dùng từ tiêu cực như “gian lận” hoặc “phạt nguội”.

### Reason

Người dùng đang lái xe cần UI tối giản, ít gây mất tập trung và không che khuất bản đồ quá lâu.

---

## TDR-012: AR Terrain Thesis Prototype Stack (08/2026)

### Decision

Prototype nghiên cứu "AR Terrain Mesh" (R&D track ở TDR-003, không phải hạng mục MVP) dùng:

```text
Unity 6.3 LTS + ARKit Scene Reconstruction (LiDAR)
Thiết bị chính: iPhone 15 Pro Max
Fallback compatibility-only: iPhone 11 Pro (không có LiDAR Scene Reconstruction)
Build/deploy: MacBook Air M4 (Apple Silicon) qua Xcode, Apple Account miễn phí (Personal Team)
Export: `mesh_ar_local.ply` (AR-local, step 8.3) → `mesh_enu.ply` georeferenced + `transform_ar_to_enu.json` (step 8.4, bắt buộc); `mesh_enu.glb` (stretch goal, step 8.7)
Georeference: hai luồng tách biệt — RTK WGS84 → local ENU; Unity AR-local → local ENU qua pipeline hai bước (C_AXIS cho axis/handedness conversion, rồi rigid transform R_AR_TO_ENU/t_AR_TO_ENU, scale=1) — 5 control points + 3 checkpoint độc lập
```

Chi tiết đầy đủ: `docs/research/AR_TERRAIN_THESIS_BASELINE.md`.

### Context

R&D track này (đã mở ở TDR-003, hoãn ở `docs/REVIEW_NOTES.md` §15 vì thiếu Unity/thiết bị AR thật) nay phục vụ mục tiêu cụ thể: chứng minh tính khả thi kỹ thuật cho báo cáo hội đồng, với deadline code freeze `2026-11-15`.

### Options

| Option | Ưu điểm | Nhược điểm | Quyết định |
|---|---|---|---|
| Unity + ARKit Scene Reconstruction (LiDAR) trên iPhone | LiDAR cho mesh chất lượng cao, AR Foundation abstraction sẵn có cho ARKit | Chỉ chạy tốt trên thiết bị có LiDAR (iPhone 12 Pro trở lên); cần license Unity (Student hoặc Personal — xem Risk §13 trong baseline doc) | Chọn |
| Native ARKit/RealityKit (không qua Unity) | Miễn phí hoàn toàn, không phụ thuộc license Unity dưới bất kỳ hình thức nào | Phải viết lại từ đầu nếu đổi hướng giữa chừng — **phát sinh chi phí chuyển stack nếu thay đổi sau khi triển khai Unity đã bắt đầu** (chưa có Unity project tại thời điểm quyết định này) | **Loại (rejected)** cho quyết định hiện tại — chỉ xem xét lại nếu đã xác nhận Unity Personal **không đáp ứng điều kiện eligibility/license terms tại thời điểm đăng ký** (không phải giả định trước là dùng được), hoặc nếu Unity/AR Foundation gặp blocker kỹ thuật đã được chứng minh cụ thể trong lúc triển khai `8.1`/`8.2`. Không tự động chuyển sang phương án này chỉ vì Unity Student license bị SheerID từ chối — phải kiểm tra Unity Personal trước; nếu Unity Personal cũng không đủ điều kiện, dừng lại và báo Review Manager thay vì tự quyết định đổi stack |
| RTK streaming trực tiếp vào ARKit trong lúc quét | Có thể georeference realtime | Phức tạp, rủi ro cao, không cần thiết cho mục tiêu chứng minh khả thi | Không chọn — chỉ dùng RTK đo điểm khống chế rời rạc (5 control + 3 checkpoint), không streaming |
| Apple Developer Program trả phí | Cho phép TestFlight/App Store | Không cần thiết — không phát hành, chỉ demo trực tiếp từ Mac | Không chọn |

### Rationale

Mục tiêu là chứng minh khả thi kỹ thuật trong khung thời gian cố định (tới 15/11/2026), không phải xây sản phẩm hoàn chỉnh. Unity + ARKit Scene Reconstruction tận dụng LiDAR sẵn có trên iPhone 15 Pro Max mà không cần tự viết thuật toán tái tạo mesh từ đầu — quyết định này dựa trên đặc tính kỹ thuật của ARKit/Unity, không dựa trên giả định người dùng đã có kinh nghiệm Unity từ trước. RTK chỉ đo điểm khống chế (không streaming) giữ cho phiên quét AR đơn giản, tránh rủi ro đồng bộ hoá thời gian thực giữa hai hệ thống độc lập.

### Consequence

- Không cam kết kết quả cho diện tích >50×50 m hoặc sai số bắt buộc ≤2 cm — ngoài khả năng của iPhone LiDAR để cam kết trong khung thời gian này.
- **Về license Unity:** tại thời điểm chốt baseline này, người dùng **chưa xác nhận** Unity Student đã được SheerID duyệt — chỉ mới dự kiến đăng ký. Thứ tự xử lý bắt buộc: (1) đăng ký Unity Student — nếu SheerID duyệt, dùng Unity Student; (2) nếu SheerID từ chối, kiểm tra Unity Personal **eligibility/license terms tại đúng thời điểm đăng ký** (điều khoản có thể đổi theo thời gian/quy mô, không giả định trước); (3) chỉ dùng Unity Personal nếu xác nhận đáp ứng điều kiện; (4) **nếu Unity Personal không đáp ứng điều kiện, dừng lại và báo Review Manager** — không tự ý đổi tech stack (native ARKit/RealityKit) hoặc tự ý mua license trả phí; chỉ khi đã dừng-báo và có quyết định riêng, hoặc phát sinh blocker kỹ thuật cụ thể đã chứng minh với Unity/AR Foundation, mới đánh giá lại việc chuyển sang native ARKit/RealityKit.
- Track này không có backend/API dependency — không thêm bảng/endpoint vào `docs/DATA_MODEL.md`/`docs/API_CONTRACT.md` của sản phẩm chính.
