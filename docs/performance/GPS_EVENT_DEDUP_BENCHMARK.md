# GPS Event Dedup — Benchmark (R1-6)

> Nguồn: `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §8, `docs/roadmap/SPRINT_R1_STABILIZATION.md` R1-6.
> Mục tiêu: xác nhận chi phí ghi của `gps_event_dedup` (idempotency write trong `GpsEventsService.recordEvent()`) ở mức chấp nhận được trước khi có traffic thật. Đây là **load test nhỏ**, không phải benchmark quy mô lớn — `docs/TEST_STRATEGY.md` §4 loại trừ rõ ràng "load test quy mô lớn (nghìn client đồng thời)" khỏi phạm vi MVP.

## 1. Phương pháp

Script: [`apps/backend/scripts/benchmark-gps-dedup.js`](../../apps/backend/scripts/benchmark-gps-dedup.js), chạy bằng `pnpm --filter @novaway/backend benchmark:gps-dedup` (hoặc `node scripts/benchmark-gps-dedup.js` trong `apps/backend`).

- **Setup**: tạo trip thật qua các API HTTP thật đang chạy (register → login → create vehicle → activate → biometric verify → start trip), tránh phải tự dựng dữ liệu FK bằng SQL thủ công (trips có FK chain `user_id`, `vehicle_id`, `biometric_verification_id`).
- **Đo lường**: sau khi có `trip_id`/`vehicle_id`/`user_id` hợp lệ, phần đo latency/throughput dùng `pg` (raw parameterized query) trực tiếp, tái tạo đúng 2 câu lệnh insert trong transaction thật của `GpsEventsService.recordEvent()` — không đi qua HTTP/WebSocket layer, để đo đúng chi phí DB, không lẫn overhead mạng.
- **Phase 1 — Sequential latency (n=500)**: đo latency của (a) full transaction (`raw_gps_events` insert + `gps_event_dedup` insert, cùng 1 transaction) và (b) chỉ insert `raw_gps_events` (không dedup), để tính chi phí biên (marginal cost) của bước dedup.
- **Phase 2 — Concurrent throughput**: 4 kết nối Postgres độc lập chạy song song, mỗi kết nối thực hiện 200 lần full-transaction insert tuần tự (tổng 800 events), đo throughput tổng hợp (events/sec).
- **Môi trường**: backend + Postgres/PostGIS chạy local qua Docker Compose (`docker-compose.yml`), cùng cấu hình schema với staging (partition `raw_gps_events_2026_07`, PK `gps_event_dedup(user_id, client_event_id)`).
- **Giới hạn đã biết**: số lượng worker đồng thời (4) bị giới hạn bởi rate limit đăng nhập của `AuthController` (5 lần/60s/IP, xem R1-4) — script tự đăng nhập 1 lần/worker để tạo trip thật, cộng 1 lần cho phase sequential, nên tổng số lần login trong 1 lần chạy script phải ≤ 5. Đây là giới hạn của **tooling benchmark**, không phải giới hạn của hệ thống thật (traffic GPS thật không đi qua endpoint login).

## 2. Kết quả thực đo (2026-07-22, local)

### Phase 1 — Sequential latency (n=500 mỗi loại)

| | avg | p50 | p95 | p99 | max |
|---|---|---|---|---|---|
| Full transaction (`raw_gps_events` + `gps_event_dedup`) | 4.916 ms | 4.727 ms | 6.367 ms | 7.619 ms | 25.117 ms |
| `raw_gps_events` insert only (không dedup) | 3.551 ms | 3.461 ms | 4.701 ms | 5.856 ms | 6.375 ms |
| **Chi phí biên của `gps_event_dedup`** | **+1.365 ms** | — | **+1.666 ms** | — | — |

### Phase 2 — Concurrent throughput (4 kết nối song song × 200 events/kết nối = 800 events)

```
Processed 800 events across 4 concurrent connections in 984ms -> 813.3 events/sec aggregate
```

## 3. Đánh giá

- Chi phí biên của bước `gps_event_dedup` (~1.4 ms avg, ~1.7 ms p95) là nhỏ so với tổng thời gian ghi (~5 ms avg) — thiết kế idempotency (2 insert trong 1 transaction, `ON CONFLICT DO NOTHING`) không gây overhead đáng kể.
- p99/max của full transaction (7.6 ms / 25.1 ms) vẫn ở mức mili-giây thấp, chấp nhận được cho một sự kiện GPS thường đến mỗi vài giây/xe.
- Throughput đồng thời đo được (~813 events/sec với 4 kết nối) vượt xa quy mô traffic GPS thực tế dự kiến cho giai đoạn staging nội bộ (số xe hoạt động đồng thời còn nhỏ) — không có dấu hiệu nghẽn ở tầng DB tại mức tải này.
- **Không kết luận** về hành vi ở quy mô hàng nghìn client đồng thời — nằm ngoài phạm vi MVP theo `TEST_STRATEGY.md` §4. Nếu traffic thật tăng đáng kể, nên chạy lại benchmark này (tăng `CONCURRENT_WORKERS`/`CONCURRENT_ITERATIONS_PER_WORKER` qua env var) như một load test lớn hơn, ngoài phạm vi sprint R1.

## 4. Cách chạy lại

```bash
# Cần backend + Postgres đang chạy local (docker compose up -d postgres && cd apps/backend && node dist/main.js)
cd apps/backend
node scripts/benchmark-gps-dedup.js

# Env overrides (mặc định trong ngoặc):
#   API_BASE_URL (http://localhost:3000/api)
#   SEQUENTIAL_ITERATIONS (500)
#   CONCURRENT_WORKERS (4) — giữ (1 + CONCURRENT_WORKERS) <= 5 để không chạm rate limit login
#   CONCURRENT_ITERATIONS_PER_WORKER (200)
```

Sau khi chạy xong nên dọn dữ liệu test trong Postgres (theo đúng thứ tự FK): `vehicle_mismatch_warnings` → `raw_gps_events` → `gps_event_dedup` → `trip_logs` → `trips` → `biometric_verifications` → `vehicles` → `users`.
