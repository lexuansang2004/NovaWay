# NovaWay D0.1 Changelog v0.5

## Purpose

Bản v0.5 là bản polish cuối cho D0.1 trước khi chuyển sang D0.2 viết PRD/SRS nháp. Bản này không thay đổi kiến trúc chính, chỉ làm rõ 3 chi tiết nhỏ theo feedback NotebookLM.

## Changes

### 1. Đồng bộ version Master Prompt D0.2

- Cập nhật `07_MASTER_PROMPT_D0_2.md` từ v0.3 lên v0.5 để khớp với pack hiện tại.
- Giữ nguyên các yêu cầu D0.1 v0.4: Background Location Service, Exponential Backoff with Jitter, batch limit 500 events, Driver-friendly Warning UI.

### 2. Làm rõ Partial Success cho Batch Sync API

- Bổ sung response strategy cho `POST /api/trips/sync`.
- MVP ưu tiên dùng `200 OK` kèm payload rõ ràng:

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

- `207 Multi-Status` được ghi là option, không bắt buộc cho MVP.
- Mục tiêu: Codex/Claude Code không bị mơ hồ khi thiết kế API response ở các phase implementation.

### 3. Nhắc Micro-step Implementation Critical Rules

- Step 3.1 `feat/realtime-location-gateway` phải ghi rõ WebSocket reconnect policy contract: Exponential Backoff with Jitter, không tight reconnect loop, không replay offline queue qua WebSocket.
- Step 4.3 `feat/mobile-realtime-location` phải implement Foreground/Background Location Service behavior, Android Foreground Service notification, iOS background/always permission flow nếu cần, Exponential Backoff with Jitter và REST batch sync chunking.

## D0.1 Status

D0.1 v0.5 đạt trạng thái sẵn sàng chuyển sang D0.2 để tạo PRD/SRS nháp.

Chưa code. Chưa implementation.
