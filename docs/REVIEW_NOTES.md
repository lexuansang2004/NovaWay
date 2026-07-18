# NovaWay — Review Notes v0.1

> Review vòng 1 của bộ tài liệu D0.2 (PRD, SRS, User Stories, Acceptance Criteria, Edge Cases, Risk Register, Data Requirements, API Requirements, Test Strategy). Đối chiếu thêm với `docs/future/TRUSTED_MOBILITY_VERIFICATION_LAYER.md` và `docs/future/OFFLINE_SYNC_ARCHITECTURE.md` (nằm ở nhánh `feature/quick-demo`, chưa có ở `docs/project-requirements`) và với chính kịch bản demo đã thuyết trình. Mục tiêu: bắt lỗi logic, edge case thiếu, rủi ro, và scope creep — theo đúng vai trò D0.5 trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`.
>
> Không sửa code. Một số phát hiện nhỏ đã được vá trực tiếp vào `RISK_REGISTER.md`/`EDGE_CASES.md`/`SRS.md` (đánh dấu ✅ Đã sửa). Phát hiện lớn ảnh hưởng tới scope MVP được để nguyên, chờ quyết định ở D0.6 (đánh dấu 🔴 Cần quyết định).

## 1. 🔴 Phát hiện quan trọng nhất: tính năng "đầu tàu" của demo không có trong MVP requirements

Kịch bản demo đã thuyết trình và được duyệt đề tài xoay quanh **một câu chuyện cụ thể**: gắn định danh sinh trắc học (khuôn mặt) với đúng phương tiện, bao gồm cả trường hợp xe mượn (chủ xe phê duyệt người mượn, có thời hạn — "Chủ xe Trần Văn B phê duyệt Nguyễn Văn A, còn 24h"). Đây chính là điểm khác biệt được nhấn mạnh nhiều nhất khi trình bày.

Nhưng rà lại toàn bộ `docs/00_SOURCE_SUMMARY.md` → `docs/06_NEXT_STEP_D0_2_INPUT.md` (D0.1) và `PRD.md`/`SRS.md` (D0.2) vừa viết: **không có bất kỳ `FR-*` nào cho xác thực sinh trắc học (Face ID) hoặc mô hình uỷ quyền phương tiện (owner duyệt borrower, có thời hạn)**. `FR-AUTH` hiện chỉ là email/password + JWT thuần tuý; `FR-VEHICLE` chỉ có CRUD + chọn xe active, không có khái niệm "người mượn".

Đây không phải lỗi của bước D0.1/D0.2 — nguồn D0.1 (NotebookLM feedback, tech decisions) đơn giản là chưa từng đề cập tới nhánh tính năng này, nên nó bị rơi ra ngoài khi tổng hợp MVP scope.

**Rủi ro nếu không xử lý:** sản phẩm chính có thể "quên" mất đúng thứ đã thuyết phục giáo viên duyệt đề tài — MVP chỉ còn là một hệ thống theo dõi GPS + cảnh báo tốc độ chung chung, không còn điểm khác biệt "trusted mobility verification" đã pitch.

**Cần quyết định ở D0.6 (người dùng duyệt):**
- (a) Đưa "Biometric Vehicle Binding" + "Vehicle Authorization/Borrowing" vào MVP chính thức (thêm `FR-BIOMETRIC-*`, `FR-AUTHZ-*`, bảng `vehicle_authorizations` vào Data Requirements) — đúng tinh thần demo nhưng tăng scope so với bản D0.2 hiện tại.
- (b) Giữ nguyên MVP hiện tại (không biometric, không borrowing) cho giai đoạn kỹ thuật đầu, đưa 2 tính năng này vào Post-MVP ngay-sau-MVP (không phải Post-MVP xa như gamification) — cần ghi rõ lý do trong PRD để không bị hiểu nhầm là bỏ quên.

Không tự chọn thay ở review này vì đây là quyết định phạm vi sản phẩm, không phải lỗi kỹ thuật.

## 2. 🔴 Vehicle Owner / borrowing model chưa có entity nào trong Data Requirements

Hệ quả trực tiếp của mục 1: nếu (a) được chọn, `DATA_REQUIREMENTS.md` cần thêm tối thiểu:
- `vehicle_authorizations` (owner_id, vehicle_id, borrower_id, granted_at, expires_at, status).
- `biometric_verifications` (trip_id hoặc vehicle_id, verified_at, result) — lưu ý: **không lưu ảnh khuôn mặt thô** nếu không thực sự cần, chỉ lưu kết quả xác thực, để giảm rủi ro privacy/compliance.

Đây là điều D0.4 (Architecture) cần biết trước khi thiết kế schema thật ở step `1.2`.

## 3. ✅ Đã sửa — Idempotency chỉ được mô tả cho REST batch sync, chưa rõ cho realtime WebSocket

`FR-SYNC-02`/`NFR-SEC-02` mô tả idempotency theo `client_event_id` cho `/api/trips/sync`, nhưng `FR-REALTIME-01` (gửi qua WebSocket) không nói rõ cùng ràng buộc có áp dụng không. Nếu client mất ack rồi gửi lại cùng một event qua WebSocket, có thể tạo bản ghi trùng nếu constraint chỉ được enforce ở tầng application của endpoint REST, không phải ở tầng database.

**Sửa:** unique constraint `(user_id, client_event_id)` trên `raw_gps_events` phải là ràng buộc **database-level**, áp dụng cho mọi đường ghi dữ liệu (cả realtime lẫn batch sync), không phải logic riêng lẻ ở từng endpoint. Đã cập nhật `DATA_REQUIREMENTS.md` §2.5 và thêm `NFR-SEC-03` vào `SRS.md`.

## 4. ✅ Đã sửa — Rủi ro bị App Store/Play Store từ chối vì xin quyền "Always" location quá sớm

`FR-BGLOC-03` yêu cầu luồng xin quyền background/always trên iOS, nhưng chưa cảnh báo rằng Apple App Review thường từ chối app xin thẳng "Always Allow" ngay từ đầu mà không xin "While Using" trước và giải thích rõ lý do cần nâng cấp quyền. Đây là rủi ro launch thật, không chỉ là chi tiết UX.

**Sửa:** thêm risk `R-16` vào `RISK_REGISTER.md`; ghi chú thêm vào Edge Cases rằng luồng xin quyền phải theo 2 bước (When-In-Use trước, nâng cấp Always sau khi có lý do rõ ràng khi bắt đầu chuyến đi).

## 5. ✅ Đã sửa — SRS lẫn lộn giữa "trip" và "trip log"

`SRS.md` mục FR-TRIP-05 (bản gốc) viết "Mỗi chuyến đi được lưu thành một bản ghi trip log", nhưng `DATA_REQUIREMENTS.md` tách rõ `trips` (vòng đời, tạo lúc bắt đầu) và `trip_logs` (tổng hợp, tạo lúc kết thúc) — hai entity khác nhau. Cách viết cũ trong SRS gây hiểu nhầm là chỉ có một bảng.

**Sửa:** đã chỉnh lại câu chữ FR-TRIP-05 trong `SRS.md` cho khớp với `DATA_REQUIREMENTS.md`.

## 6. ✅ Đã sửa — Thiếu yêu cầu observability dù có hẳn 1 step riêng trong plan (9.1)

`NovaWay_COMPLETE_MICRO_STEP_PLAN.md` có step `9.1 chore/observability-baseline` (logging, metrics, health, debug checklist), nhưng `SRS.md` không có NFR nào về việc này — nếu không ghi từ D0.2, dễ bị quên tới tận khi code step 9.1 mới nhớ ra cần gì.

**Sửa:** thêm `NFR-OBS-01` vào `SRS.md` §2.

## 7. 🟡 Ghi nhận, chưa cần sửa ngay — Data Aggregation là một hướng tối ưu Post-MVP đáng cân nhắc

`docs/future/OFFLINE_SYNC_ARCHITECTURE.md` (nhánh demo) đề xuất gộp nhiều GPS event liên tiếp thành "khối" (block/session) thay vì lưu từng điểm rời rạc, để giảm dung lượng lưu trữ và băng thông sync. Quyết định D0.1 hiện tại (`raw_gps_events` từng dòng + TTL 30 ngày) là đủ cho MVP và không mâu thuẫn với ý tưởng này — data aggregation chỉ là một bước tối ưu **sau** khi có dữ liệu tải thật để biết có cần không.

**Không sửa ở D0.2** — ghi chú lại ở đây để D0.4 (Architecture) hoặc giai đoạn Post-MVP không phải phát hiện lại từ đầu.

## 8. 🟡 Ghi nhận — PRD nên nói rõ hơn nguồn dữ liệu cảnh báo địa hình ở MVP là mock/seed

`PRD.md` mục MVP Scope #7 ("Cảnh báo địa hình / AR Lite") không nói rõ rằng ở MVP, cảnh báo địa hình đến từ dữ liệu cấu hình/seed, không phải phát hiện thời gian thực bằng Computer Vision (điều này ĐÃ được nói rõ ở `DATA_REQUIREMENTS.md` §2.7, nhưng người chỉ đọc PRD có thể hiểu nhầm). Không phải lỗi sai, chỉ là thiếu nhất quán mức độ chi tiết giữa 2 tài liệu.

**Đề xuất:** khi có bản PRD v0.2, thêm một dòng làm rõ ngay trong MVP Scope #7. Chưa sửa ở review này để tránh chỉnh PRD nhiều lần trong cùng một vòng — gộp vào lần cập nhật PRD tiếp theo (sau khi mục 1 được quyết định, vì quyết định đó cũng ảnh hưởng cách viết lại mục này).

## 9. Kiểm tra không phát hiện vấn đề (để ghi nhận đã rà, không phải bỏ sót)

- Scope creep: rà lại toàn bộ `FR-*`/`AC-*` — không có mục nào lẽ ra thuộc Post-MVP/R&D bị lọt vào MVP (Kafka, Redis, App Attestation, gamification, crowdsourced trust, AR Mesh đều đã đúng ở Post-MVP/R&D).
- Terminology: không còn "gian lận"/"phạt nguội"/"NovaPay" ngoài các câu ví dụ "không được dùng từ này" (đã grep toàn bộ `docs/*.md` mới).
- Traceability: mỗi `FR-*` trong `SRS.md` đều có ít nhất một `AC-*` tương ứng trong `ACCEPTANCE_CRITERIA.md` và ít nhất một mục test trong `TEST_STRATEGY.md`.

## 10. Việc cần làm trước khi sang D0.4 (Architecture)

1. **Quyết định mục 1/2** (biometric + vehicle authorization) — việc quan trọng nhất, ảnh hưởng trực tiếp Data Model và API Contract ở D0.4.
2. Xác nhận các Open Questions còn treo ở `SRS.md` §6 (đặc biệt OQ-001 Flutter, OQ-005 tile provider) — D0.4 cần chốt trước khi thiết kế kiến trúc chi tiết.
3. Nếu chọn phương án (a) ở mục 1, cần một vòng D0.2 bổ sung (hoặc D0.3 riêng) để viết `FR-BIOMETRIC-*`/`FR-AUTHZ-*` đầy đủ trước khi coi Requirement Baseline sẵn sàng chốt ở D0.7.

## 11. ✅ Đã sửa — Tự rà D0.4: unique index cho idempotency trên bảng partitioned không thực sự chặn được trùng lặp

Bản đầu của `DATA_MODEL.md` §2.7 (`raw_gps_events`) dùng `CREATE UNIQUE INDEX ... ON raw_gps_events(user_id, client_event_id, received_at)` để enforce idempotency (NFR-SEC-03). Đây là lỗi thiết kế thật: PostgreSQL bắt buộc partition key (`received_at`) phải nằm trong mọi unique index của bảng partitioned theo range — nên nếu cùng một `client_event_id` được gửi lại với `received_at` khác (rất bình thường khi mobile retry sau vài giây/phút), index này coi đó là 2 dòng hợp lệ khác nhau, **không hề chặn trùng lặp** như tài liệu tuyên bố.

**Sửa:** tách idempotency ra một bảng riêng, không partition — `gps_event_dedup (user_id, client_event_id) PRIMARY KEY` — insert dùng `ON CONFLICT DO NOTHING` để phát hiện trùng trước khi ghi vào `raw_gps_events`. Cách này giữ đúng ràng buộc "không thêm Redis ở MVP" (TDR-004) vì chỉ dùng thêm 1 bảng Postgres nhỏ, không phải cache layer mới. Đã cập nhật `DATA_MODEL.md` §2.7 và §4 (cleanup job phải dọn cả bảng dedup).

Đây là ví dụ cụ thể cho lý do D0.5 (review) cần làm cả ở mức Architecture/Data Model, không chỉ ở mức PRD/SRS — lỗi kiểu này chỉ lộ ra khi viết DDL thật, không thấy được ở mức "yêu cầu" (`DATA_REQUIREMENTS.md` D0.2 chỉ nói "unique theo (user_id, client_event_id)" — đúng về mặt yêu cầu, nhưng cách hiện thực hoá ban đầu ở D0.4 lại sai).
