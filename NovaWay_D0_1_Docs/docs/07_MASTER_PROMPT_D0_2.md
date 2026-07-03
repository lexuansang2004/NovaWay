# NovaWay - Master Prompt for Step D0.2 v0.5

Dùng prompt này cho ChatGPT 5.5 / Claude Opus / Gemini / ChatPRD để tiếp tục tạo tài liệu PRD/SRS.

```text
Bạn đang đóng vai Lead Product Architect + Senior System Architect cho dự án NovaWay.

Nhiệm vụ hiện tại là Step D0.2: viết PRD/SRS nháp. Chưa được viết code.

Hãy đọc các nguồn sau:
- 00_SOURCE_SUMMARY.md
- 01_OPEN_QUESTIONS.md
- 02_NOTEBOOKLM_FEEDBACK_REVIEW.md
- 03_REQUIREMENT_DELTA_V0_2.md
- 04_TECH_DECISION_RECORD.md
- 05_MVP_SCOPE_DRAFT.md
- 06_NEXT_STEP_D0_2_INPUT.md

Bối cảnh sản phẩm:
NovaWay là hệ thống định tuyến vị trí, quản lý phương tiện cá nhân hóa và cảnh báo địa hình thời gian thực cho người lái xe.

Quyết định đã chốt:
- Backend MVP: NestJS + TypeScript.
- Database: PostgreSQL + PostGIS.
- Realtime live stream: WebSocket/Socket.io.
- Offline replay/sync: REST Batch Upload POST /api/trips/sync.
- Batch sync partial success: MVP ưu tiên `200 OK` kèm payload `{ accepted, duplicate_count, failed_events[] }`; `207 Multi-Status` chỉ là option nếu cần semantic HTTP rõ hơn.
- Web: React.
- Mobile: Flutter dự kiến, cần xác nhận nếu có lý do khác.
- Map: OpenStreetMap ecosystem.
- Web map library: MapLibre GL JS recommended.
- Tile provider MVP/dev: Protomaps hoặc Mapbox Free Tier candidate; verify quota/cost trước implementation.
- Không dùng public OSM tiles cho heavy production/offline prefetch.
- AR trong MVP: AR Lite / Map-based Warning Overlay trong màn hình sử dụng phương tiện.
- Không làm kính ảo, không làm VR.
- Full Unity AR Mesh Grid là R&D, không phải MVP core.
- MVP phải có privacy consent.
- MVP phải có offline queue.
- WebSocket chỉ dùng cho live stream khi online.
- Offline queue phải sync bằng REST batch upload, không replay bằng WebSocket.
- Mỗi queued event phải có client_event_id để idempotency.
- Raw GPS events TTL 30 ngày.
- Trip logs summary lưu dài hạn.
- Raw GPS events cần partitioning/time-based cleanup plan.
- MVP cần hidden Developer Mode/Simulator để test mock GPS, mất mạng, thermal state, low-light state.
- App Attestation / Play Integrity / DeviceCheck là Post-MVP security hardening.

Yêu cầu output:
1. Viết PRD.md gồm vision, problem, target users, MVP scope, out-of-scope, success metrics.
2. Viết SRS.md gồm functional requirements, non-functional requirements, constraints.
3. Viết USER_STORIES.md theo vai trò user/driver/dashboard user.
4. Viết ACCEPTANCE_CRITERIA.md cho từng tính năng MVP.
5. Viết EDGE_CASES.md.
6. Viết RISK_REGISTER.md.
7. Viết DATA_REQUIREMENTS.md gồm raw GPS TTL 30 ngày, trip_logs long-term, partitioning plan.
8. Viết API_REQUIREMENTS.md gồm Auth, Vehicle, Trip, Live WebSocket, REST Batch Sync /api/trips/sync.
9. Viết TEST_STRATEGY.md gồm unit/integration/e2e/simulator tests.
10. Tách rõ MVP / Post-MVP / R&D.
11. Ghi lại open questions còn lại.
12. Không viết code.
13. Không thêm tính năng ngoài scope nếu chưa đánh dấu Post-MVP/R&D.

Quy tắc thuật ngữ:
- Luôn dùng NovaWay.
- Không dùng NovaPay.
- Không dùng từ “gian lận” trong UI/product wording.
- Dùng “Vehicle Mismatch Detection” hoặc “phát hiện sai lệch phương tiện”.
- Không dùng “phạt nguội”.

Hãy trả về nội dung có thể copy vào từng file markdown.
```


## Bổ sung bắt buộc từ D0.1 v0.5

Khi tạo PRD/SRS, bắt buộc đưa vào các điểm sau:

1. Mobile Background Location Service cho active trip tracking:
   - Android Foreground Service notification khi tracking chạy nền.
   - iOS background/always permission flow nếu tracking cần tiếp tục khi khóa màn hình.
   - Fallback nếu user không cấp quyền background.

2. Realtime reconnect resilience:
   - WebSocket reconnect dùng Exponential Backoff with Jitter.
   - Không reconnect đồng loạt khi nhiều client có mạng lại cùng lúc.

3. Offline sync chunking:
   - `POST /api/trips/sync` tối đa 500 events/payload ở MVP.
   - Mobile phải chia local queue thành chunks nếu vượt giới hạn.
   - Server cần idempotency và partial success/error response plan.
   - Response MVP nên dùng `200 OK` kèm payload rõ ràng, ví dụ `{ "accepted": 490, "duplicate_count": 5, "failed_events": [{ "client_event_id": "...", "error_code": "INVALID_COORDINATE" }] }`.
   - `207 Multi-Status` có thể ghi là option, nhưng không bắt buộc cho MVP nếu muốn client xử lý đơn giản.

4. Driver-friendly Warning UI:
   - Vehicle mismatch/safety warning hiển thị overlay lớn, rõ.
   - One-tap action.
   - Auto-dismiss sau 10 giây.
   - Không phụ thuộc push notification nhỏ khi user đang lái.


5. Reminder for implementation micro-steps sau này:
   - Step 3.1 `feat/realtime-location-gateway` phải ghi rõ WebSocket reconnect policy contract: Exponential Backoff with Jitter, không tight reconnect loop, không replay offline queue bằng WebSocket.
   - Step 4.3 `feat/mobile-realtime-location` phải implement Foreground/Background Location Service behavior, Android Foreground Service notification, iOS background/always permission flow nếu cần, Exponential Backoff with Jitter và REST batch sync chunking.
