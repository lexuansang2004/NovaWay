# NovaWay — Test Strategy v0.1

> Step D0.2. Chiến lược test cho MVP; test case cụ thể (file, tool version) sẽ được viết ở từng micro-step theo `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`, mỗi step tự có "Test gate" riêng. Tài liệu này định hình **loại test nào chạy ở đâu** và cách test những tình huống khó tái hiện ngoài đời thật.

## 1. Test Levels

| Level | Phạm vi | Công cụ đề xuất | Chạy khi nào |
|---|---|---|---|
| Unit | Service/logic đơn lẻ (vd. Vehicle Mismatch rule, batch validation, idempotency check) | Jest (NestJS), Flutter test | Mỗi PR |
| Integration | API endpoint + database thật (test DB), WebSocket gateway | Jest + Supertest, NestJS Testing Module, PostgreSQL test container | Mỗi PR liên quan backend |
| E2E | Luồng người dùng đầu-cuối: đăng nhập → chọn xe → bắt đầu chuyến đi → nhận vị trí trên dashboard → kết thúc chuyến đi | Playwright/Cypress (web), Flutter integration test (mobile) | Trước khi merge vào `develop`, và trên CI (`9.2 chore/ci-cd-pipeline`) |
| Simulator-based | Mất mạng, thermal/low-light, mock GPS route, nhiều client reconnect đồng thời | Developer Mode/Simulator nội bộ (FR-DEVMODE) | Mỗi khi động tới offline sync, realtime, hoặc AR fallback |
| Manual/exploratory | UX cảnh báo khi đang lái, cảm giác driver-friendly overlay | Test thủ công trên thiết bị thật/emulator | Trước khi release milestone |

## 2. Coverage by Feature Area

### 2.1. Auth (FR-AUTH)

- Unit: hash password, validate JWT, guard reject không token.
- Integration: register → login → me trả đúng user; login sai password bị từ chối.

### 2.2. Vehicle Management (FR-VEHICLE)

- Integration: User B không thể sửa/xoá xe của User A (AC-VEHICLE-01).
- Integration: không bắt đầu được trip nếu chưa có xe active (AC-VEHICLE-02).

### 2.3. Trip Lifecycle & Consent (FR-TRIP)

- Integration: `start` bị từ chối nếu thiếu `consent` hoặc thiếu xe active.
- Integration: `end` dừng nhận GPS event mới cho `trip_id` đó.
- E2E: toàn bộ luồng bắt đầu → di chuyển (mock) → kết thúc → thấy trong danh sách trip.

### 2.4. Realtime Location (FR-REALTIME)

- Integration: gửi GPS hợp lệ → dashboard client (test socket) nhận được broadcast trong ngưỡng thời gian kỳ vọng.
- Integration: payload sai (toạ độ ngoài phạm vi) bị từ chối, không broadcast.
- Simulator: ngắt kết nối nhiều client cùng lúc → xác nhận mỗi client có delay reconnect khác nhau (kiểm tra jitter bằng cách log timestamp reconnect).

### 2.5. Offline Sync (FR-SYNC)

- Unit: logic chunk queue > 500 events thành nhiều batch.
- Integration: gửi lại cùng `client_event_id` → không tạo bản ghi trùng, `duplicate_count` tăng đúng.
- Integration: batch có event lỗi trộn lẫn event hợp lệ → response liệt kê đúng `failed_events` kèm `error_code`.
- Simulator: mobile giả lập mất mạng giữa chuyến đi → có mạng lại → xác nhận toàn bộ queue được đồng bộ, không mất event (AC-SYNC-01, AC-SYNC-02).

### 2.6. Vehicle Mismatch Detection (FR-MISMATCH)

- Unit: rule tính toán ngưỡng tốc độ/thời gian sinh warning.
- Integration: mock tốc độ vượt ngưỡng liên tục 3 phút (theo mock ở micro-step 6.1) → warning được tạo đúng 1 lần, không lặp lại lạm phát.
- Integration: nội dung warning không chứa từ bị cấm (test bằng danh sách từ khoá cấm chạy qua toàn bộ string cảnh báo).

### 2.7. Driver-friendly Warning UI (FR-WARNUI)

- E2E/manual: overlay xuất hiện, xác nhận bằng 1 tap đóng đúng; không phản hồi thì tự ẩn sau 10 giây (đo bằng timer trong test, không phải chờ tay).
- Manual: overlay không che bản đồ quá diện tích quy định (kiểm tra bằng thiết kế/QA visual).

### 2.8. AR Lite / Terrain Warning (FR-AR)

- Simulator: bật thermal state cao → xác nhận chuyển fallback (không mở camera), overlay cảnh báo trên map vẫn hoạt động.
- Simulator: bật low-light state → hành vi tương tự.
- Integration: app không crash khi camera permission bị từ chối hoặc camera không khả dụng.

### 2.9. Mobile Background Location (FR-BGLOC)

- Manual (Android thật/emulator): khoá màn hình khi trip active → notification foreground service xuất hiện, trip vẫn tiếp tục ghi.
- Manual (iOS thật/simulator giới hạn theo khả năng simulator): xác nhận luồng xin quyền background/always hoạt động đúng, có fallback khi từ chối.

### 2.10. Data Retention (FR-RETENTION)

- Integration: chạy cleanup job trên dữ liệu test có `received_at` > 30 ngày → các dòng đó bị xoá, `trip_logs` liên quan không bị ảnh hưởng.
- Unit: logic xác định partition/cleanup range đúng biên giới ngày.

### 2.11. Developer Mode / Simulator (FR-DEVMODE)

- Integration: nạp mock GPS route file → marker web di chuyển đúng theo route (đây chính là cơ chế dùng để test 2.4–2.9 ở trên, nên bản thân nó cần test trước).
- Integration: Developer Mode không truy cập được trên build gắn flag production.

## 3. CI/CD Gate (liên kết `9.2 chore/ci-cd-pipeline`)

- Mọi PR vào `develop` phải pass: lint, unit test, integration test.
- Merge vào `main` yêu cầu thêm: E2E suite pass trên môi trường staging.
- PR không được merge nếu bất kỳ test gate nào của micro-step liên quan chưa pass (theo cột "Test gate" trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`).

## 4. Out of Scope for MVP Testing

- Load test quy mô lớn (nghìn client đồng thời) — chỉ test số lượng nhỏ đủ để xác nhận cơ chế backoff/jitter hoạt động đúng logic, không phải benchmark hiệu năng thật.
- Test tự động cho AR Terrain Mesh (R&D) — thuộc test plan riêng của prototype Unity, tách khỏi app chính.
- Penetration testing/security audit toàn diện — chỉ có test baseline (payload validation, auth guard, rate limit) ở MVP.
