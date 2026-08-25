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

## 12. ✅ Đã sửa — Tự rà trước khi code step 1.2: FK sequencing sai giữa `trip_logs` và `trips`

`NovaWay_COMPLETE_MICRO_STEP_PLAN.md` dòng `1.2` (trước khi sửa) ghi Target là "Migration users, vehicles, trip_logs draft". Nhưng `trip_logs.trip_id` là `NOT NULL UNIQUE REFERENCES trips(id)` (`DATA_MODEL.md` §2.6), và bảng `trips` lại `NOT NULL REFERENCES biometric_verifications(id)` (`DATA_MODEL.md` §2.5) — bảng `biometric_verifications` chỉ được migrate ở step `1.6`. Nghĩa là nếu làm đúng Target gốc của `1.2`, việc migrate `trip_logs` sẽ tạo FK trỏ tới bảng `trips` chưa hề tồn tại tại thời điểm đó → migration lỗi ngay khi chạy.

Cột **Commit** của chính dòng `1.2` đã ghi sẵn `"feat: add database schema for users and vehicles"` — không nhắc `trip_logs` — cho thấy đây là lỗi soạn thảo ở cột Target, không phải chủ đích ban đầu.

**Sửa:** `1.2` chỉ còn migrate `users` + `vehicles` (khớp đúng commit message có sẵn). `trips` + `trip_logs` dời sang migrate chung ở step `7.1 feat/trip-logs-api` — đúng lúc `trips` lần đầu được tạo (sau khi `vehicle_authorizations` ở `1.5` và `biometric_verifications` ở `1.6` đã tồn tại). Đã cập nhật `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` (dòng `1.2`, `7.1`, và callout đầu file) và `DATA_MODEL.md` §3 (bảng ánh xạ step cho từng bảng, thay vì gộp cả 9 bảng vào step `1.2`). Ba bảng còn lại chưa có FK bị treo (`raw_gps_events`, `vehicle_mismatch_warnings`, `terrain_warnings`) vẫn để "step chưa chốt" — sẽ xác nhận khi tới gần các step tương ứng, không chặn baseline.

Người dùng đã xác nhận hướng sửa này trước khi code step `1.2`.

## 13. ✅ Đã sửa — Tự rà trước khi code step 3.1: cùng loại lỗi FK sequencing, lần này giữa `raw_gps_events` và `trips`

Khi §12 để lại `raw_gps_events` ở trạng thái "step chưa chốt, ứng viên: `3.1` hoặc `4.3`", chưa kiểm tra kỹ FK của chính nó. `raw_gps_events.trip_id` là `NOT NULL REFERENCES trips(id)` (`DATA_MODEL.md` §2.7), nhưng theo quyết định ở §12, `trips` chỉ được migrate ở step `7.1` — sau cả `3.1`. Nếu triển khai `raw_gps_events` ở `3.1` như dự kiến ban đầu, sẽ tạo FK trỏ tới bảng `trips` chưa tồn tại — hệt lỗi đã sửa ở §12, chỉ khác cặp bảng.

**Sửa:** vì `trips` chỉ phụ thuộc `biometric_verifications` (đã có từ `1.6`), không phụ thuộc `trip_logs`, nên tách `trips` ra khỏi `trip_logs` thay vì di chuyển cả cặp: migrate `trips` ngay ở step `3.1 feat/realtime-location-gateway` (chỉ tạo schema, phục vụ `raw_gps_events` — chưa có `TripsModule`/API thật, trip test cho việc verify step `3.1` sẽ tạo trực tiếp qua SQL cho tới khi `7.1` xây API); giữ `trip_logs` ở `7.1` như cũ vì không có bảng nào trước `7.1` cần nó. Đã cập nhật `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` (dòng `3.1`, `7.1`, và callout đầu file) và `DATA_MODEL.md` §3.

Người dùng đã xác nhận hướng sửa này trước khi code step `3.1`.

## 14. ✅ Đã sửa — Tự rà trước khi code step 5.1: routing chưa từng có contract HTTP, dù đã được nhắc tới từ D0.4

`ARCHITECTURE.md` §3.2/§7 mô tả `RoutingProvider` (`getRoute(vehicleType, origin, destination)`, mock theo loại xe ở step `5.1`, thay bằng OSRM/GraphHopper thật ở `5.2`) từ D0.4, và `OQ-009` (`01_OPEN_QUESTIONS.md`) đã chốt "MVP dùng routing mock theo vehicle trước". Nhưng khác với mọi tính năng khác trong plan, routing chưa từng có: FR tương ứng trong `SRS.md`, endpoint trong `API_CONTRACT.md`, hay bất kỳ dòng nào trong `ACCEPTANCE_CRITERIA.md`/`EDGE_CASES.md`. Nếu code thẳng theo dòng plan `5.1` ("POST /routes/preview mock route motorcycle/car") mà không có contract chốt trước, request/response shape và quy ước lỗi sẽ do code tự quyết định — vi phạm nguyên tắc "docs là nguồn sự thật, code theo docs" đã áp dụng xuyên suốt dự án.

**Sửa:** thêm `SRS.md` §1.14 (FR-ROUTING-01/02/03 — endpoint preview, khác nhau theo vehicle type, chỉ owner/borrower hợp lệ mới xem được) và `API_CONTRACT.md` §10 `POST /api/routes/preview` (đẩy "Open Items for D0.7" cũ từ §10 xuống §11, cập nhật 1 tham chiếu nội bộ `xem §10` → `xem §11`). Không sửa `ACCEPTANCE_CRITERIA.md`/`EDGE_CASES.md` — phạm vi tối thiểu để unblock code, các tiêu chí "vehicle_id missing/forbidden, mock route pass" đã đủ chi tiết trong chính dòng `5.1` của `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`.

Người dùng đã xác nhận hướng sửa này trước khi code step `5.1`.

## 15. ⏸️ Hoãn step 8.1 (`feat/ar-terrain-prototype`) — thiếu Unity + thiết bị AR thật

Step `8.1` yêu cầu dựng Unity AR Foundation prototype với test gate bắt buộc đo FPS, nhiệt độ, pin, và điều kiện ánh sáng yếu (`03_REQUIREMENT_DELTA_V0_2.md` §5.1, `04_TECH_DECISION_RECORD.md` TDR-003). Môi trường dev hiện tại không cài Unity/Unity Hub, và bản chất test gate này đòi hỏi đo trên thiết bị AR thật — không thể giả lập hay verify bằng CLI/browser automation như mọi step khác trong plan đã làm được.

**Quyết định:** hoãn step `8.1` cho tới khi có Unity + thiết bị AR thật để triển khai và verify đúng test gate; không scaffold code Unity chưa từng biên dịch/kiểm chứng để tránh nợ kỹ thuật giả. Đúng tinh thần tài liệu đã ghi: đây là nhánh R&D tách biệt hoàn toàn khỏi `apps/mobile`, không chặn phần còn lại của MVP. Tiếp tục với step `9.1` (Observability baseline).

Người dùng đã xác nhận hướng hoãn này.

## 17. 🔴 Xác nhận: `raw_gps_events` thiếu partition cho tháng hiện tại/kế tiếp — mọi insert GPS từ 08/2026 fail (step `9.3`, `fix/raw-gps-partition-availability`, 08/2026)

> Số thứ tự **§17** (không phải §16) — cố ý dành riêng: PR #73 (baseline AR Terrain, chưa merge) đã chiếm §16 trên branch của nó. §18 dành riêng cho việc renumber `docs/REVIEW_NOTES.md` §17 cũ (tạm) của nhánh `fix/e2e-golden-path-stability` sau khi rebase. Khi rebase các nhánh, giữ nguyên cả ba: §16 (AR Terrain), §17 (partition — mục này), §18 (E2E stabilization) — không đánh số lại, không gộp.

**Bối cảnh phát hiện:** khi triển khai `fix/e2e-golden-path-stability` (micro-step tạm gọi `9.3`, nay renumber thành `9.4` sau khi step này chiếm `9.3`), test đã sửa (chờ `location:broadcast` thay vì fixed-sleep — xem nhánh đó) timeout thay vì pass. Backend log tại chỗ (chạy thật, Postgres/PostGIS local qua Docker, mirror đúng cấu hình CI) cho thấy:

```
[WsExceptionsHandler] QueryFailedError: no partition of relation "raw_gps_events" found for row
```

Đối chiếu với log CI thật của PR #73 (job `E2E (Playwright, golden path)`, run `32703245501`, job `97358919768`, 2026-08-24) — **lỗi giống hệt, cùng khung thời gian với các lần gửi GPS trong test**:

```
2026-08-24 07:59:07 UTC ERROR:  no partition of relation "raw_gps_events" found for row
2026-08-24 07:59:07 UTC DETAIL:  Partition key of the failing row contains (received_at) = (2026-08-24 07:59:07.228578+00).
2026-08-24 07:59:07 UTC ERROR:  no partition of relation "raw_gps_events" found for row
2026-08-24 07:59:07 UTC DETAIL:  Partition key of the failing row contains (received_at) = (2026-08-24 07:59:07.529207+00).
```

**Root cause xác nhận (đọc code, không suy đoán):** migration `apps/backend/src/database/migrations/1721260000006-CreateRawGpsEventsTable.ts` (step `3.1`) tạo **đúng một** partition tĩnh:

```sql
CREATE TABLE raw_gps_events_2026_07 PARTITION OF raw_gps_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

`docs/DATA_MODEL.md` §4 mô tả một job `"raw_gps_cleanup"` (chạy daily, tạo partition tháng tiếp theo + DROP partition cũ) — nhưng grep toàn bộ `apps/backend/src` (loại trừ migrations/spec) cho `PARTITION OF|raw_gps_cleanup|createPartition|CronExpression|@Cron(` **không ra kết quả nào**: job này **chưa từng được implement**, chỉ tồn tại như mô tả thiết kế trong tài liệu. Hệ quả: bất kỳ insert nào vào `raw_gps_events` với `received_at` từ `2026-08-01` trở đi đều lỗi ở tầng database — đã âm thầm đúng như vậy từ đầu tháng 8, ảnh hưởng **mọi** trip có GPS (không riêng gì E2E), cả CI lẫn production/staging nếu đã deploy migration này mà chưa từng chạy job tạo partition thủ công.

**Diễn giải lại chẩn đoán trước đó (đính chính theo yêu cầu Review Manager):** đây là **nguyên nhân chính đã xác nhận** cho các lần fail `distance_km = 0` quan sát được ở PR #73. Race condition fixed-sleep trong `golden-path.spec.ts` (ghi ở nhánh `fix/e2e-golden-path-stability`, tạm §17 cũ trên branch đó, nay renumber `§18`) **vẫn là một điểm yếu đồng bộ hoá/observability có thật** — test cũ dùng `setTimeout` cố định thay vì chờ ack, nên dù partition có tồn tại, test cũ vẫn có thể flake nếu insert chậm hơn 300ms — nhưng **bằng chứng hiện tại chưa chứng minh nó tự nó gây ra các lần fail CI đã quan sát**, vì partition-missing đã đủ để giải thích 100% các lần fail đó (insert luôn thất bại ngay lập tức, không phải "chậm"). Việc fixed-sleep có còn là nguyên nhân độc lập hay không **sẽ chỉ được biết sau khi `9.3` (partition fix) merge và `9.4` (E2E fix, renumber từ `fix/e2e-golden-path-stability`) chạy lại để validate riêng phần đồng bộ hoá còn lại** — không tiếp tục khẳng định fixed-sleep là nguyên nhân chính cho tới khi có bằng chứng đó.

**Quyết định (Review Manager):** mở micro-step `9.3` (`fix/raw-gps-partition-availability`, ưu tiên trước `9.4`/E2E fix vì là prerequisite) — thêm migration mới (không sửa migration gốc `1721260000006`, vì có thể đã áp dụng ở môi trường thật) chứa một routine idempotent, concurrency-safe (advisory lock), dùng giờ database (không phải giờ máy chạy code), tạo partition tháng UTC hiện tại + kế tiếp nếu chưa có, nhận tham số reference date tuỳ chọn để test được biên giới tháng một cách xác định; gọi routine đó ngay trong migration (để môi trường đã deploy cũng được vá ngay) và từ một `PartitionMaintenanceService` (Nest lifecycle: gọi lúc bootstrap + định kỳ ~daily, clear timer lúc shutdown, `unref()` phù hợp, log rõ ràng không lộ secret). **Không** làm ở `9.3`: không thêm DEFAULT partition (có thể kẹt dữ liệu, chặn attach partition đúng sau này), không implement DROP partition cũ/dọn `gps_event_dedup` (giữ nguyên theo dõi riêng, không được coi là đã xong), không đổi `TripsService`/`RealtimeGateway`/GPS payload/API contract.

PR #73 (baseline AR Terrain, §16) và nhánh `fix/e2e-golden-path-stability` (§18, giữ nguyên chưa commit) đều giữ nguyên trạng thái hiện tại, không bị đụng vào bởi thay đổi này. Merge order bắt buộc: `9.3` (partition, branch này) → rebase + renumber + re-validate `9.4` (E2E, branch kia) → rồi mới quay lại PR #73.

**Rework (Review Manager, PR #74, 08/2026) — CHANGES REQUESTED, 3 lỗi chặn đã sửa (amend cùng commit `17c7a011`, không tạo commit mới):**

1. **Bootstrap phải fail-fast:** `PartitionMaintenanceService.ensurePartitions()` (bản đầu) bắt và nuốt mọi lỗi, nên `onApplicationBootstrap()` luôn "thành công" kể cả khi migration chưa chạy, hàm `ensure_raw_gps_partitions()` không tồn tại, hoặc DB role thiếu quyền — vi phạm đúng mục tiêu của `9.3` ("partition phải tồn tại trước khi backend nhận GPS traffic"). Sửa: đổi tên hàm nội bộ thành `ensurePartitionsOrThrow()` — log lỗi rồi **rethrow**; lệnh gọi lúc bootstrap để nguyên rethrow lan ra ngoài (bootstrap fail thật sự, Nest sẽ không khởi động thành công); **chỉ lên lịch `setInterval` định kỳ nếu bootstrap không throw**; lệnh gọi định kỳ (trong `setInterval` callback) tự `.catch()` để không tạo unhandled rejection và không crash app đang chạy — lỗi vẫn được log (đã log sẵn bên trong `ensurePartitionsOrThrow`), lần chạy định kỳ tiếp theo tự retry. Thêm 5 test: (a) bootstrap thành công → lên lịch interval; (b) bootstrap thất bại → reject, **không** lên lịch interval (advance timer nhiều ngày, không có lệnh gọi thêm); (c) lỗi ở lần gọi định kỳ chỉ log, không throw, interval vẫn sống cho lần retry kế; (d) shutdown clear timer; (e) `unref()` được gọi trên timer (spy trực tiếp `global.setInterval`, mock timer trả về có `unref: jest.fn()`).
2. **Partition bound phải tường minh UTC:** bản đầu cast `date` (`month_start`/`month_end`) thẳng sang literal trong `EXECUTE format(..., %L, %L)` — với cột partition key là `TIMESTAMPTZ`, Postgres diễn giải midnight của literal đó theo **`TimeZone` GUC của session gọi hàm**, không mặc định UTC; nếu session không phải UTC (không có gì trong app này ghim `TimeZone` của connection), bound bị lệch đúng bằng offset của session đó. Sửa: tính `lower_bound`/`upper_bound` tường minh dạng `(month_start::text || ' 00:00:00+00')::timestamptz` trước khi đưa vào `EXECUTE format`, neo cứng UTC bất kể session `TimeZone` là gì. Thêm assertion thật (không phải suy luận): dưới `SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh'`, insert `raw_gps_events` đúng `2026-08-01T00:00:00.000Z` và `2026-09-01T00:00:00.000Z` — cả hai đúng `tableoid` mong đợi (`raw_gps_events_2026_08`/`_09`) — xem script §3 ngay dưới.
3. **Test tích hợp thật phải được commit + chạy trong CI, không chỉ SQL thủ công:** thêm `apps/backend/scripts/verify-raw-gps-partitions.js` (script Node độc lập dùng `pg` trực tiếp — không phải `*.spec.ts`, vì Jest mặc định của `apps/backend` chạy trong job `node` của CI vốn không có Postgres thật, xem comment đầu file) + lệnh `pnpm test:partition-integration` (`apps/backend/package.json`) + một step mới trong `.github/workflows/ci.yml`'s job `e2e`, ngay sau "Run backend migrations" và trước "Start backend". Script xác nhận đủ (a) idempotency hai lần gọi liên tiếp; (b) partition tháng UTC hiện tại + kế tiếp tồn tại; (c) `reference_date` tương lai cố định (`2027-01-15`) tạo đúng partition; (d) 8 kết nối gọi đồng thời không lỗi/không trùng; (e)+(f) dưới session `TIME ZONE` khác UTC, insert đúng biên dưới + biên tháng kế tiếp route đúng `tableoid`, seed FK tối thiểu trong transaction rồi `ROLLBACK` — không để lại dữ liệu. Đã verify thật: script pass 2 lần liên tiếp trên DB mới migrate, và transaction rollback xác nhận không còn row nào sau khi chạy (`SELECT count(*) FROM raw_gps_events` = 0 sau script).

**Đính chính báo cáo (theo yêu cầu Review Manager):**
- PR trước rework này thực có **9 file thay đổi** (không phải "8" như một câu narration giữa chừng lỡ đếm nhầm trong báo cáo trước) — khớp đúng con số `git commit` đã báo (`9 files changed`).
- "5/5 local run pass" trước đây gộp nhầm một lần fail vào cùng câu với các lần pass. Số liệu chính xác, tách riêng: **5 lần chạy `golden-path.spec.ts` (không sửa) thành công** (2 lần trước khi tự đụng rate limit + 3 lần sau khi restart backend để reset rate limiter) và **1 lần chạy bị loại khỏi thống kê pass/fail** vì fail do `RATE_LIMITED` tự gây ra (test tự đăng ký user nhiều lần liên tiếp từ cùng IP trong lúc tôi lặp lại test thủ công nhiều lần nhanh) — không phải lỗi partition/`distance_km`, không được tính là một lần pass hay một lần fail có ý nghĩa với thay đổi code.
- Giữ nguyên đặt chỗ §16 (AR Terrain)/§17 (mục này)/§18 (E2E) — không đánh số lại.
- Không đụng vào worktree `fix/e2e-golden-path-stability` (step `9.4`) trong lần rework này.
