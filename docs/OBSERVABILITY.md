# NovaWay — Observability Baseline (step `9.1`)

> Đáp ứng `NFR-OBS-01` (`docs/SRS.md` §2): health check, structured logging, metrics cơ bản — đủ để debug realtime/location issues. Không phải một observability stack đầy đủ (Prometheus server, Grafana, log aggregator) — đó là Post-MVP khi có tải thật (đúng tinh thần TDR-004: không over-engineer hạ tầng trước khi cần).

## 1. Health check — `GET /health`

Không nằm dưới prefix `/api` (giống `/metrics`, xem `main.ts`).

```json
{ "status": "ok", "timestamp": "2026-07-18T13:00:00.000Z", "database": { "status": "ok" } }
```

- `status: "degraded"` khi Postgres không truy vấn được (`SELECT 1` thất bại) — dấu hiệu đầu tiên cần kiểm tra khi mọi thứ có vẻ "treo".
- Không kiểm tra WebSocket/socket.io ở đây — nếu gateway down thì cả HTTP server cũng down (cùng một process Nest), `GET /health` không trả lời được là đủ tín hiệu.

## 2. Metrics — `GET /metrics`

Định dạng Prometheus text exposition (`# HELP` / `# TYPE` + `metric{labels} value`), không nằm dưới `/api`. In-memory, reset khi restart process — không nhằm để lưu lịch sử dài hạn, chỉ để xem trạng thái hiện tại khi debug.

| Metric | Loại | Ý nghĩa |
|---|---|---|
| `http_requests_total{method,status}` | counter | Tổng request HTTP theo method + status code |
| `gps_events_processed_total` | counter | GPS event được chấp nhận và ghi vào `raw_gps_events` |
| `gps_events_rejected_total{reason}` | counter | GPS event bị từ chối, `reason` = error_code (`VALIDATION_ERROR`, `TRIP_NOT_FOUND`, `TRIP_NOT_ACTIVE`) |
| `mismatch_warnings_total{vehicle_type}` | counter | Số cảnh báo Vehicle Mismatch đã tạo |
| `ws_connections_current` | gauge | Số socket `/realtime` đang xác thực thành công tại thời điểm hiện tại |

Xem nhanh: `curl http://localhost:3000/metrics`.

## 3. Structured logging

Dùng `@nestjs/common` `Logger` (built-in, đã dùng sẵn ở `FallbackRoutingProvider`) — không thêm thư viện logging riêng (Winston/Pino) ở MVP. Mỗi dòng log có context (`[HTTP]`, `[RealtimeGateway]`, `[MismatchDetectionService]`, ...), level, timestamp.

- **`[HTTP]`**: một dòng mỗi request — `METHOD path status durationMs`, qua `LoggingInterceptor` (global, `app.module.ts`).
- **`[RealtimeGateway]`**: connect/disconnect (kèm `user`/`socket.id`), `location:update` accepted (debug level, kèm trip/speed) hoặc rejected (warn level, kèm `error_code`).
- **`[MismatchDetectionService]`**: warn level khi tạo cảnh báo mới (kèm `trip_id`/`vehicle_type`).

## 4. Debug checklist — các tình huống thường gặp

**GPS event không hiện lên web dashboard:**
1. `GET /health` — Postgres có `ok` không?
2. `GET /metrics` — `gps_events_rejected_total{reason=...}` có tăng không? Nếu có, xem log `[RealtimeGateway]` dòng `rejected` gần nhất để biết `error_code` cụ thể (thường là `TRIP_NOT_ACTIVE` — trip đã `end` trước khi mobile ngừng gửi, hoặc `TRIP_NOT_FOUND` — sai `trip_id`/không phải chủ trip).
3. Nếu `gps_events_processed_total` tăng nhưng web không thấy gì: kiểm tra web đã `join:trip` đúng phòng (`trip:{id}`) chưa — xem log `[RealtimeGateway]` dòng `Connected`.

**Socket không kết nối được (`connection:rejected`):**
1. Token JWT hết hạn hoặc sai — kiểm tra `JWT_SECRET` khớp giữa lần issue token (login) và lần verify (gateway).
2. `ws_connections_current` không tăng dù client báo đã connect → khả năng client connect nhưng auth thất bại ngay sau đó (xem `handleConnection` — reject không tăng gauge).

**Cảnh báo Vehich Mismatch không xuất hiện dù tốc độ rõ ràng bất thường:**
1. Loại xe khai báo có phải `motorbike` không? MVP chỉ có ngưỡng cho `motorbike` (xem `mismatch-detection.service.ts`) — `car` không bao giờ tạo cảnh báo ở bước này.
2. Tốc độ có giữ liên tục trên ngưỡng đủ 3 phút không, hay bị ngắt quãng (một điểm GPS về dưới ngưỡng sẽ reset lại bộ đếm)? Xem `mismatch_warnings_total` trước/sau, và log `[RealtimeGateway]` các dòng `location:update accepted` liên tiếp để xem chuỗi tốc độ thực tế.

**Server có vẻ "treo", không phản hồi:**
1. `GET /health` trước tiên — timeout hoàn toàn (không có response) khác với `status: "degraded"` (Postgres lỗi nhưng process còn sống).
2. Kiểm tra có process Node khác đang chiếm cổng 3000 không (`netstat -ano | grep :3000` trên Windows) — nguồn lỗi hay gặp nhất khi test local là một backend cũ (build khác) vẫn còn chạy nền.
