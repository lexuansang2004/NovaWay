# NovaWay - NotebookLM Feedback Review v0.4

## 1. Mục tiêu review

NotebookLM đã đưa ra nhiều bổ sung quan trọng về pin/nhiệt, offline mode, privacy, chống spam, realtime scale, gamification, sync strategy, simulator, data retention, tile provider và abuse prevention.

Tài liệu này phân loại lại feedback đó để tránh đưa toàn bộ vào MVP gây phình scope, đồng thời cập nhật những điểm thật sự cần có ngay từ bản PRD/SRS D0.2.

## 2. Feedback được chấp nhận ngay vào MVP

| Feedback | Quyết định | Đưa vào tài liệu nào |
|---|---|---|
| Tiêu thụ pin/nhiệt khi AR chạy lâu | Chấp nhận | NFR, AR Risk, Test Strategy |
| AR hoạt động kém ban đêm/trời mưa | Chấp nhận | Edge Cases, AR Fallback |
| Mất mạng khi di chuyển | Chấp nhận | Offline Queue, Sync-on-Reconnect |
| GPS consent / quyền riêng tư | Chấp nhận | Privacy Requirements |
| Idempotency cho event sync lại | Chấp nhận | Offline Sync, API Contract |
| REST Batch Upload thay vì WebSocket replay | Chấp nhận | API Requirement `/api/trips/sync` |
| Developer Mode/Simulator để test GPS/network/thermal | Chấp nhận | MVP Scope, Test Strategy |
| Raw GPS TTL 30 ngày | Chấp nhận | Data Retention, Database Requirements |
| Partitioning raw GPS events | Chấp nhận ở thiết kế DB MVP | Data Model, Migration Plan |
| Tile provider strategy rõ ràng | Chấp nhận | Tech Decision Record |

## 3. Feedback chấp nhận nhưng đưa sau MVP

| Feedback | Quyết định | Lý do |
|---|---|---|
| Crowdsourced Trust Verification production-grade | Post-MVP | Cần có dữ liệu thật và moderation model |
| Gamification | Post-MVP | Không phải core tracking/routing |
| Redis adapter / PubSub scale | Scale step sau MVP hoặc khi cần | MVP nên đơn giản trước |
| Kafka/NATS | Post-MVP/scale lớn | Không cần khi chưa có tải thật |
| App Attestation: Play Integrity/DeviceCheck | Post-MVP security hardening | Quan trọng nhưng có thể làm sau khi flow GPS ổn |
| Full Unity AR Mesh | R&D | Rủi ro pin/nhiệt/FPS/camera cao |

## 4. Feedback cần sửa thuật ngữ

### 4.1. Sai tên dự án

Không dùng:

```text
NovaPay
```

Dùng:

```text
NovaWay
```

### 4.2. Tránh từ tiêu cực trong product/UI wording

Không ưu tiên dùng:

```text
gian lận
chống gian lận
phạt nguội
camera phạt nguội
```

Dùng thay thế:

```text
sai lệch phương tiện
Vehicle Mismatch Detection
xác nhận lại phương tiện
cảnh báo an toàn
cảnh báo địa hình
```

## 5. Cải tiến kỹ thuật được bổ sung vào D0.2 Input

### 5.1. Offline sync phải tách live stream và replay

Không gửi bù lượng lớn GPS events bằng WebSocket sau khi reconnect.

Quy tắc:

```text
Live GPS khi online: WebSocket/Socket.io
Offline queue replay: REST Batch Upload POST /api/trips/sync
```

### 5.2. Simulator là một phần của MVP testability

Developer không thể luôn lái xe ra cao tốc, làm máy nóng hoặc ngắt mạng thật. Vì vậy MVP cần Developer Mode ẩn để giả lập:

- File mock GPS route.
- Tọa độ cao tốc / route đặc biệt.
- Mất mạng ngắt quãng.
- Thermal state / low-light state.

### 5.3. Data retention phải rõ từ đầu

- Trip summary: lưu dài hạn.
- Raw GPS events: TTL 30 ngày.
- Bảng raw GPS cần có partitioning/time-based cleanup.

### 5.4. Tile provider strategy phải rõ

- Không dùng public OSM tiles cho heavy production.
- MVP/dev chọn candidate: Protomaps hoặc Mapbox Free Tier.
- Self-host tile server/vector tiles chuyển sang Post-MVP.

### 5.5. Abuse prevention cần roadmap

MVP có:

- Auth JWT.
- Rate limit.
- Payload validation.
- Idempotency key.

Post-MVP có:

- App Attestation.
- Device trust score.
- Crowdsourced trust verification.
- Abuse detection dashboard.

## 6. Kết luận review

Feedback NotebookLM hợp lý và nên giữ. Tuy nhiên phải đưa vào tài liệu theo phân tầng:

```text
MVP bắt buộc
→ Post-MVP
→ R&D
```

Không được để feedback biến MVP thành hệ thống quá lớn ngay từ đầu.


## 7. Feedback bổ sung v0.4 - Mobile Resilience Edge Cases

Vòng review tiếp theo của NotebookLM đánh giá bộ D0.1 v0.3 đã đủ sạch để chuyển sang D0.2, nhưng đề xuất thêm 4 edge cases kỹ thuật để tài liệu đầu vào PRD/SRS chắc hơn.

Các điểm được chấp nhận:

1. **Background Location Service**: Mobile phải xử lý tracking khi khóa màn hình/chạy nền, có Foreground Service notification trên Android và permission flow phù hợp trên iOS.
2. **Exponential Backoff with Jitter**: WebSocket reconnect không được retry đồng loạt để tránh thundering herd khi nhiều tài xế mất sóng rồi có mạng lại cùng lúc.
3. **Batch Size & Chunking**: `POST /api/trips/sync` giới hạn 500 events/payload trong MVP; mobile phải chia local queue thành chunks.
4. **Driver-friendly Warning UI**: Cảnh báo sai lệch phương tiện phải là overlay rõ, 1 chạm, auto-dismiss sau 10 giây; không phụ thuộc vào push notification nhỏ khi người dùng đang lái.

Quyết định: đưa cả 4 điểm vào Requirement Delta, MVP Scope và D0.2 Input.
