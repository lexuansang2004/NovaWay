# NovaWay - D0.1 Changelog v0.3

## 1. Lý do cập nhật

Bản v0.3 cập nhật theo feedback mới của NotebookLM nhằm làm bộ đầu vào D0.2 “chống đạn” hơn trước khi tạo PRD/SRS.

## 2. Thay đổi chính

### 2.1. Offline Sync

Trước:

```text
Mobile local queue + sync-on-reconnect
```

Sau:

```text
Live online: WebSocket/Socket.io
Offline replay: REST Batch Upload POST /api/trips/sync
Idempotency: client_event_id
```

### 2.2. Simulator / Developer Mode

Bổ sung vào MVP:

- Mock GPS route file.
- Giả lập route cao tốc.
- Giả lập mất mạng ngắt quãng.
- Giả lập thermal state.
- Giả lập low-light state.

### 2.3. Data Retention

Chốt:

- `trip_logs` / trip summary: lưu dài hạn.
- Raw GPS events: TTL 30 ngày.
- Raw GPS events cần partitioning/time-based cleanup.

### 2.4. Tile Provider Strategy

Chốt candidate:

- Protomaps.
- Mapbox Free Tier.

Quy tắc:

- Không dùng public OSM tiles cho heavy production/offline prefetch.
- Self-host tile server/vector tiles để Post-MVP.

### 2.5. Abuse Prevention

MVP có:

- Auth JWT.
- Rate limit.
- Payload validation.
- Ownership check.
- Idempotency.

Post-MVP có:

- Android Play Integrity API.
- iOS DeviceCheck/App Attest.
- Device trust score.
- Endpoint policy cho GPS/trust-sensitive endpoints.

## 3. Files đã cập nhật

- `00_SOURCE_SUMMARY.md`
- `01_OPEN_QUESTIONS.md`
- `02_NOTEBOOKLM_FEEDBACK_REVIEW.md`
- `03_REQUIREMENT_DELTA_V0_2.md`
- `04_TECH_DECISION_RECORD.md`
- `05_MVP_SCOPE_DRAFT.md`
- `06_NEXT_STEP_D0_2_INPUT.md`
- `07_MASTER_PROMPT_D0_2.md`
- `README.md`

## 4. Commit message đề xuất

```bash
git commit -m "docs: update D0.1 requirements after NotebookLM review"
```
