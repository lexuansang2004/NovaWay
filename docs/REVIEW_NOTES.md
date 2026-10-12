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

## 16. ✅ Baseline AR Terrain Thesis Prototype tài liệu hoá — step `8.0` APPROVED (2026-08-24)

Sau khi trao đổi kế hoạch và chia sẻ thiết bị hiện có, người dùng xác nhận đã hội đủ điều kiện phần cứng từng ghi ở §15 để mở lại track `8.x`: MacBook Air M4 (Apple Silicon), iPhone 15 Pro Max (có LiDAR), và iPhone 11 Pro (dùng cho compatibility/failure-path fallback — thiết bị này **không có** LiDAR Scene Reconstruction). Unity Student **dự kiến đăng ký**, chưa xác nhận SheerID duyệt tại thời điểm ghi note này.

Đây được xác nhận rõ là một **prototype nghiên cứu độc lập phục vụ báo cáo hội đồng**, không phải mở rộng phạm vi sản phẩm NovaWay MVP. Phạm vi, thiết bị, hệ toạ độ/kiểm chứng độ chính xác, timeline (code freeze `2026-11-15`), evidence, rủi ro/fallback, chi phí, và Definition of Done đang được tài liệu hoá trong `docs/research/AR_TERRAIN_THESIS_BASELINE.md` (tài liệu mới, tạo ở step `8.0`) — **quyết định phạm vi của người dùng là dữ kiện thật, nhưng bản thân tài liệu này chỉ coi là đạt test gate sau khi Review Manager duyệt riêng.**

**Thay đổi cụ thể:**
- Step `8.1` gộp cũ (`feat/ar-terrain-prototype`) chia lại thành `8.0` (baseline tài liệu, APPROVED) → `8.1` (Unity/iOS toolchain smoke test) → `8.2` (LiDAR mesh capture) → `8.3` (`mesh_ar_local.ply`, AR-local, chưa georeference) → `8.4` (georeference logic — **hai giai đoạn:** (a) 05–18/10 triển khai + test bằng fixture/synthetic data, chưa tuyên bố hoàn thành georeference thực địa; (b) 19–25/10 dùng RTK field test lần 1 để tạo `mesh_enu.ply` thật đầu tiên + sidecar `transform_ar_to_enu.json` — đây mới là test gate thực địa thật của `8.4`, đồng thời là pilot của `8.5`) → `8.5` (independent accuracy validation chính thức, 09–15/11, RTK đợt 2 — Measurement Gate tách biệt Accuracy KPI) → `8.6` (performance & compatibility validation, **mandatory**, 26/10–08/11) → `8.7` (GLB export/demo hardening, stretch goal) — xem `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`.
- Vị trí code đã chốt: `research/ar-terrain-unity/` (ngoài `apps/`), không dependency vào `apps/backend`/`apps/web`/`apps/mobile`/`packages/shared-types`, không backend/API riêng.
- Georeference: RTK đo 5 control point (dùng tính transform AR-local → ENU, rigid 6-DoF: rotation+translation, scale=1 cố định là primary — similarity/scale tự do chỉ là diagnostic phụ) + 3 checkpoint độc lập (chỉ dùng đánh giá sai số, không dùng khi tính transform) — tổng 8 mốc vật lý, cùng một phương pháp xác định tâm marker cho cả hai nhóm (decision gate riêng trước `8.4`). Accuracy KPI có 3 trạng thái loại trừ nhau (STRETCH PASS ≤5cm, PASS 5–10cm, FAIL >10cm), tách biệt khỏi Measurement Gate — không cam kết survey-grade.
- Export mesh hai giai đoạn: `mesh_ar_local.ply` (8.3, AR-local) → `mesh_enu.ply` georeferenced (8.4, bắt buộc cho Definition of Done). `mesh_enu.glb` là stretch goal (8.7), không được ảnh hưởng deadline PLY.
- Unity Student dự kiến đăng ký. Nếu SheerID duyệt → dùng Unity Student. Nếu không duyệt → kiểm tra Unity Personal eligibility/license terms **tại đúng thời điểm đăng ký** (không giả định trước là đủ điều kiện), chỉ dùng Unity Personal nếu đáp ứng; nếu không đáp ứng → dừng lại và báo Review Manager, **không** tự ý đổi stack (native ARKit/RealityKit) hoặc tự ý mua license (TDR-012).
- Không mua Apple Developer Program, không dùng cloud/VPS, không truyền RTK realtime vào ARKit, không phát hành App Store.
- Sprint R8 (`Abuse Protection Gaps & Mobile Error-Path Coverage`) giữ nguyên, không bị đổi tên hay dùng để chứa track này.

Cập nhật cross-reference ở `docs/03_REQUIREMENT_DELTA_V0_2.md` §5.1, `docs/04_TECH_DECISION_RECORD.md` (TDR-012 mới), `docs/ARCHITECTURE.md` §7, `docs/ACCEPTANCE_CRITERIA.md`, `docs/EDGE_CASES.md`, `docs/TEST_STRATEGY.md` §4, `docs/RISK_REGISTER.md` (R-20 mới), `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §1 — không có mục nào trong số này thêm `FR-*`/bảng/endpoint mới vào scope MVP.

**Rework (Review Manager, 08/2026):** commit đầu tiên tài liệu hoá baseline này bị Review Manager yêu cầu REWORK — các lỗi đã sửa (amend cùng commit, không tạo commit mới): (1) baseline gốc viết như thể Unity Student đã có, trong khi người dùng mới chỉ dự kiến đăng ký — sửa toàn bộ thành "dự kiến", bỏ quyết định tự động chuyển native ARKit/RealityKit; (2) pipeline PLY/georeference mâu thuẫn (§9 cũ nói PLY đã áp transform ENU dù ghi georeference mới làm ở `8.4`) — tách rõ `mesh_ar_local.ply` (8.3) và `mesh_enu.ply` + `transform_ar_to_enu.json` (8.4); (3) khoá primary transform là rigid 6-DoF (scale=1), similarity/scale-tự-do chỉ là diagnostic; thêm decision gate bắt buộc trước `8.4` về phương pháp chọn tâm marker; (4) tách Measurement Gate (PASS/FAIL không phụ thuộc RMSE) khỏi Accuracy KPI (PASS/STRETCH PASS/FAIL theo RMSE); (5) tách step `8.6` cũ (gộp FPS/pin/nhiệt + iPhone 11 Pro + GLB) thành `8.6` mandatory (performance/compatibility) và `8.7` stretch (GLB riêng); (6) sửa `Packages/manifest.lock` → `Packages/manifest.json`+`Packages/packages-lock.json`, `MeshLast` → `MeshLab`, bỏ `scan_raw.usdz` chưa xác nhận triển khai, đổi tên file evidence sang `mesh_ar_local.ply`/`mesh_enu.ply`/`transform_ar_to_enu.json`/`scan_manifest.json`; (7) làm rõ TEST_STRATEGY.md: iPhone 15 Pro Max cho mesh/performance, iPhone 11 Pro chỉ compatibility; (8) xác nhận rõ trạng thái step `8.0` là **IN REVIEW**, không phải đã hoàn tất/đã pass, ở mọi nơi có nhắc tới.

**Rework vòng hai (Review Manager, 08/2026):** vẫn REWORK REQUIRED sau vòng một do 3 contradiction còn lại — đã sửa (amend cùng commit): (1) **timeline RTK/georeference không khả thi** — bản trước ghi `8.4` tạo `mesh_enu.ply` (05–18/10) rồi mới thuê RTK lần 1 (19–25/10), nhưng `mesh_enu.ply` cần control point RTK thật; sửa thành `8.4` có hai giai đoạn con: (a) 05–18/10 chỉ triển khai + test bằng fixture/synthetic data, chưa tuyên bố hoàn thành georeference; (b) 19–25/10 = RTK field test lần 1, tạo `mesh_enu.ply` thật đầu tiên, đồng thời là pilot của `8.5`; `8.6` mandatory dời vào đúng khung 26/10–08/11; `8.5` chính thức ở 09–15/11 cùng RTK đợt 2. (2) **Coordinate contract mơ hồ** — đổi "WGS84 → ENU → AR-local transform" thành hai luồng tách biệt (RTK WGS84→ENU; Unity AR-local→ENU), thêm công thức `p_ENU = R_AR_TO_ENU × p_AR + t_AR_TO_ENU`, quy định target axes x=E/y=N/z=U, bắt buộc ghi source axis convention + handedness của cả hai hệ (đổi handedness phải là bước riêng, không giấu trong rotation), và mở rộng `transform_ar_to_enu.json` thành schema đầy đủ (schema_version, source/target_frame, axis convention, handedness, matrix layout, transform direction, rotation, translation_m, scale_policy, wgs84_origin, height_type, units, created_at, source_commit; quaternion phải ghi rõ thứ tự component). (3) **Unity source-control quá hẹp** — "chỉ lưu C# script" sửa thành danh sách đầy đủ để tái tạo Unity project (scenes, prefabs, ScriptableObject, materials/shaders, reference images nhỏ, toàn bộ `.meta` tương ứng — nhấn mạnh không được xoá `.meta` của asset đang track — cộng `ProjectSettings/`, `Packages/manifest.json`+`packages-lock.json`, test code, `.gitignore`). Ngoài 3 mục chính, còn sửa thêm: (4) phát biểu toán học sai về similarity transform ("tự động kéo RMSE checkpoint xuống thấp" → sửa thành "fit trên control points để giảm residual control points, có thể làm checkpoint error tăng hoặc giảm, không đảm bảo RMSE thấp hơn"); (5) Unity license wording ở mọi nơi đổi thành "SheerID duyệt → Student; không duyệt → kiểm tra Unity Personal eligibility tại thời điểm đăng ký → chỉ dùng nếu đủ điều kiện → nếu không đủ điều kiện, dừng và báo Review Manager" (không còn khẳng định chắc "Personal nếu không duyệt" thiếu điều kiện); TDR-012 đổi "mất công sức đã đầu tư vào Unity project hiện tại" (sai vì chưa có Unity project) → "phát sinh chi phí chuyển stack nếu thay đổi sau khi triển khai Unity đã bắt đầu"; (6) Accuracy KPI đổi thành 3 trạng thái loại trừ nhau đúng ngưỡng (STRETCH PASS ≤5cm, PASS 5–10cm, FAIL >10cm) thay vì PASS ≤10cm chồng lấn STRETCH PASS ≤5cm; (7) đổi tiêu đề tài liệu baseline thành "Baseline Candidate v1.0", bỏ mọi chỗ gọi là "baseline chính thức" trong lúc chờ duyệt.

**Rework vòng ba (Review Manager, 08/2026) — PASS WITH REQUIRED FINALIZATION:** Review Manager xác nhận nội dung đã đạt yêu cầu về phạm vi/timeline/RTK/PLY-ENU/Accuracy KPI/license/source-control, chỉ còn 2 chỉnh sửa kỹ thuật bắt buộc trước khi APPROVED — đã sửa (amend cùng commit): (1) **bổ sung axis/handedness conversion tường minh vào coordinate contract** — công thức `p_ENU = R_AR_TO_ENU × p_AR + t_AR_TO_ENU` chưa đủ tái lập nếu khác handedness; sửa thành pipeline hai bước `p_AR_CANONICAL = C_AXIS × p_UNITY_AR` rồi `p_ENU = R_AR_TO_ENU × p_AR_CANONICAL + t_AR_TO_ENU` (§6), `R_AR_TO_ENU` bắt buộc determinant +1 (proper rotation, không chứa reflection), `C_AXIS` luôn phải lưu trong sidecar kể cả khi identity (kèm lý do); sửa thuật ngữ "trục Unity theo `ARWorldTrackingConfiguration`" (sai — đó là cấu hình ARKit native, không phải convention Unity thực tế sau lớp AR Foundation) thành ghi rõ convention thực tế sau AR Foundation; mở rộng `transform_ar_to_enu.json` (§9.2) thêm object `axis_conversion` (from/to_convention, matrix_3x3, matrix_layout, determinant, applied_before_rotation); cập nhật đồng bộ micro-step `8.4` và TDR-012. (2) **tách bug-fix ra khỏi branch `test/ar-terrain-performance-validation` (`8.6`)** — `8.6` giờ chỉ chứa FPS/pin/nhiệt/low-light/mất tracking/iPhone 11 Pro compatibility-only/regression/evidence; bug phát hiện từ RTK lần 1 phải sửa trên branch `fix/ar-terrain-<slug>` riêng, có micro-step/docs bổ sung nếu cần, tự pass test riêng rồi mới merge và chạy `8.6` — thêm quy tắc branch-scope này vào baseline §11 và micro-step plan.

Sau khi áp dụng đúng 2 finalization trên, đổi tiêu đề tài liệu từ "Baseline Candidate v1.0" → **"Baseline v1.0"**, và trạng thái step `8.0` từ IN REVIEW → **APPROVED / COMPLETED**, cập nhật đồng bộ ở `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`, baseline header/status, `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`, và các cross-reference candidate/IN REVIEW khác. Lịch sử hai vòng rework trước (đoạn "Rework" và "Rework vòng hai" ở trên) được giữ nguyên, không xoá.

**Quyết định:** Review Manager approved step 8.0 on 2026-08-24 after two rework rounds and finalization of the axis-conversion contract and branch-scope rule.

**Trạng thái cuối: step `8.0` — APPROVED / COMPLETED.** Baseline `docs/research/AR_TERRAIN_THESIS_BASELINE.md` nay là baseline chính thức, là căn cứ để bắt đầu triển khai từ step `8.1`. Track này vẫn chưa có Unity project/C# nào được tạo, chưa merge vào `develop`/`main`.

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

## 18. 🔧 `golden-path.spec.ts` — khắc phục điểm yếu đồng bộ hoá fixed-sleep (step `9.4`, `fix/e2e-golden-path-stability`, 08/2026)

> Số thứ tự **§18** (không phải §17) — đúng như đã dành chỗ ở ghi chú §17 phía trên: §16 = AR Terrain (PR #73), §17 = partition fix (mục phía trên, đã merge `develop` qua PR #74), §18 = mục này. Step trước đây tạm gọi `9.3` trên nhánh này nay chính thức là **`9.4`** vì `9.3` đã bị chiếm bởi prerequisite hotfix partition ở trên.

**Bối cảnh phát hiện:** PR #73 (baseline tài liệu AR Terrain, `docs/ar-terrain-thesis-baseline` → `develop`, documentation-only, không đụng `apps/*`) bị chặn merge vì check CI `E2E (Playwright, golden path)` fail. Đã chạy lại 3 lần (1 lần gốc + 2 lần rerun). `distance_km = 0` xuất hiện lặp lại trên cả 3 lần chạy CI; locator trùng lặp (`getByText('Đang hoạt động')`, strict-mode violation) chỉ xuất hiện ở một lần thử (attempt) Playwright. Đối chiếu với 5 lần chạy liên tiếp của workflow `E2E on staging` (scheduled, nhắm `develop`'s tip `a963562` — cùng commit PR #73 dựa vào) trong cùng ngày: cả 5 lần đều fail vì **staging backend-health timeout** — đây là một sự cố khác, không tái hiện đúng lỗi `distance_km`/locator ở trên, nên **không được viện dẫn là cùng nguyên nhân hay bằng chứng bổ sung** (đã tự sửa nhận định này sau khi Review Manager chỉ ra ở vòng review trước).

**Đính chính chẩn đoán (theo quyết định Review Manager, sau khi §17 xác nhận nguyên nhân chính là thiếu partition):** nguyên nhân chính **đã xác nhận** cho các lần fail `distance_km = 0` quan sát được ở PR #73 là partition `raw_gps_events` bị thiếu (§17) — insert luôn thất bại ngay lập tức ở tầng database, không phải "chậm". Race condition fixed-sleep mô tả dưới đây **là một điểm yếu đồng bộ hoá/observability có thật** trong test (dùng `setTimeout` cố định thay vì chờ ack là sai về nguyên tắc, bất kể partition có tồn tại hay không), nhưng **không phải là nguyên nhân độc lập đã được xác nhận** của các lần fail CI lịch sử đã quan sát — vì thiếu partition một mình đã đủ giải thích 100% các lần fail đó. Mục §18 này khắc phục điểm yếu đồng bộ hoá đó như một cải thiện độc lập, đúng đắn về nguyên tắc test, không phải như một "fix" cho nguyên nhân đã xác nhận ở §17.

1. **`distance_km = 0` — điểm yếu đồng bộ hoá trong test:** `apps/web/e2e/golden-path.spec.ts` (dòng ~120–143) gửi 2 sự kiện `location:update` qua WebSocket, sau mỗi lần emit chỉ `await new Promise(r => setTimeout(r, 300))` rồi coi như đã ghi xong — không đăng ký listener cho `location:broadcast`/`location:rejected` trước khi emit, không có bất kỳ cơ chế chờ ack nào. Trong khi đó `RealtimeGateway.handleLocationUpdate` (`apps/backend/src/realtime/realtime.gateway.ts` dòng ~100–166) chỉ gọi `this.server.to(tripRoom(...)).emit('location:broadcast', ...)` **sau khi** `await this.gpsEventsService.recordEvent(...)` (ghi `raw_gps_events`) đã resolve — tức `location:broadcast` là tín hiệu đáng tin cậy duy nhất xác nhận đã persist, còn `setTimeout` cố định 300ms thì không (tải CI runner biến thiên). `TripsService.buildTripLog` (`apps/backend/src/trips/trips.service.ts` dòng ~204–227) tính `distance_km` bằng `COALESCE(ST_Length(ST_MakeLine(location::geometry ORDER BY event_timestamp)::geography) / 1000.0, 0) ... FROM raw_gps_events WHERE trip_id = $1` — tính từ các dòng **đã commit tại đúng thời điểm** `POST /trips/:id/end` được gọi, không chờ event nào đang inflight — nếu event thứ hai chưa kịp ghi, `ST_MakeLine` chỉ có 0–1 điểm, ra `distance_km = 0`. Đây là một race condition thật trong test, độc lập với sự cố partition — chỉ là chưa từng là nguyên nhân **duy nhất/đã chứng minh** của các lần fail lịch sử cụ thể đã quan sát.
2. **Locator `"Đang hoạt động"` strict-mode violation:** `apps/web/src/pages/VehiclesPage.tsx` có 2 nơi chứa cụm từ này — dòng 79 (đoạn mô tả tĩnh của trang: *"Thêm, sửa, xoá và chọn phương tiện đang hoạt động."*, luôn hiển thị) và dòng 137 (badge xe đang active, chỉ hiển thị sau khi bấm "Đặt đang dùng"). `getByText('Đang hoạt động')` mặc định substring + case-insensitive nên khớp cả hai. Vì đoạn mô tả tĩnh khớp ngay từ đầu (trước khi badge kịp render), hành vi thực tế phụ thuộc thời điểm poll của `expect().toBeVisible()`: có thể pass "may mắn" trên phần tử sai (đoạn mô tả) nếu poll trước khi badge mount, hoặc bắt strict-mode violation nếu cả hai cùng tồn tại ở một thời điểm poll — giải thích tại sao chỉ 1 trong nhiều lần thử lộ ra lỗi này rõ ràng.

**Điều kiện hoàn tất §18:** test đã sửa (chờ `location:broadcast`/`location:rejected` cho cả 2 GPS event, không dùng fixed-sleep, có timeout giới hạn + cleanup listener) phải nhận được cả hai broadcast, `distance_km > 0` trong response `end` (giữ nguyên assertion), và pass ổn định qua tối thiểu 3 lần chạy liên tiếp cùng môi trường local (rate-limit-safe, mỗi lần isolate test user) — chạy sau khi rebase lên `develop` đã có fix partition (§17/PR #74) để loại trừ nhiễu từ sự cố đã fix riêng.

**Quyết định (APPROVED bởi Review Manager):** micro-step `9.4` (`fix/e2e-golden-path-stability`, trước đây tạm gọi `9.3` trên nhánh này, nay renumber vì `9.3` đã bị chiếm bởi prerequisite hotfix partition §17) — chỉ sửa đồng bộ hoá trong chính test (`golden-path.spec.ts`): chờ `location:broadcast` xác nhận (hoặc fail sớm kèm `error_code` nếu nhận `location:rejected`) cho từng GPS event trước khi đóng socket, dùng timeout có giới hạn kèm thông báo chẩn đoán hữu ích thay vì `setTimeout` cố định; và đổi locator sang `page.getByText('Đang hoạt động', { exact: true })` (đã khoá — không còn để ngỏ 2 phương án). **Không đổi hành vi `TripsService`/`RealtimeGateway`** trừ khi chính test đã đồng bộ hoá vẫn phát hiện bằng chứng cụ thể về lỗi backend thật — nếu phát sinh, dừng lại và báo cáo trước khi sửa backend, không tự ý mở rộng phạm vi. Sự cố `E2E on staging` (staging backend-health timeout) được theo dõi tách biệt, ngoài phạm vi nhánh này — không chẩn đoán hay sửa hạ tầng staging ở đây.

**Xác thực Railway staging (cập nhật, 2026-08-25):** verify trên Railway staging thật cho step `9.4` được ghi nhận **DEFERRED — COST CONTROL / BILLING AVAILABILITY** (không phải PASS, không phải FAIL) — workspace Railway hết trial (từ ~2026-08-22), cả hai service `production` (`@novaway/backend`, `pretty-insight` Postgres) offline; xác nhận qua kiểm tra read-only: tồn tại lựa chọn "Downgrade to Free" ($0, không cần thẻ thanh toán), volume Postgres hiện tại 500 MB (đúng bằng giới hạn Free 0.5 GB, không vượt), nhưng compute hiện cấu hình 8 vCPU/8GB (vượt giới hạn Free 1 vCPU/0.5GB, cần scale xuống nếu downgrade).

Hai deadline tách biệt, không được gộp hay ngụ ý cái này xảy ra "trước" cái kia theo cách sai trình tự thời gian:
- **Data-retention decision gate: trước 20/09/2026** — deadline xoá dữ liệu volume theo chính sách retention hiển thị rõ trên dashboard Railway. Phải quyết định (nâng cấp plan trả phí, hoặc "Downgrade to Free" để giữ volume, hoặc chấp nhận mất dữ liệu) trước hạn này. **Checkpoint nội bộ đề xuất: không muộn hơn 10/09/2026**, để còn thời gian dự phòng nếu quyết định phải leo thang.
- **Demo deployment/validation gate: 25/10/2026 đến 15/11/2026** — đây là mốc thời gian dự thi/demo, xảy ra **sau** hạn xoá dữ liệu 20/09/2026, không phải điều kiện tiên quyết cho hạn đó. Hai mốc độc lập: quyết định retention phải xong trước 20/09; mốc demo là một ràng buộc lịch trình riêng, không liên quan tới việc dữ liệu volume còn hay mất.

Về dữ liệu hiện có trên staging: tài liệu dự án (`OPEN_ITEMS_AFTER_MVP.md` §R3) ghi nhận staging chưa từng nhận traffic thật, chỉ có seed data (~4 dòng `terrain_warnings`) và các trip test thủ công (vd. R3-1) — nhưng **số dòng thực tế trong database không thể xác minh** vì cả hai service đang offline lúc kiểm tra (không khởi động lại để xem, đúng theo giới hạn read-only). Do đó: **chấp nhận rủi ro mất dữ liệu chỉ hợp lệ nếu chủ sở hữu (owner) xác nhận dữ liệu hiện có là có thể tái tạo được/có thể bỏ** — không tự ý coi là "rủi ro thấp" chỉ dựa trên tài liệu thiết kế, vì tài liệu không thay thế được việc xác minh trực tiếp. Không click bất kỳ nút plan/billing/deploy/restart nào trong quá trình kiểm tra.

PR #73 (baseline AR Terrain) giữ nguyên trạng thái **content-approved nhưng chưa merge** — chỉ merge sau khi `9.4` merge vào `develop`, toàn bộ required check trên PR #73 (sau khi rebase) pass xanh, và Railway staging verification không còn ở trạng thái DEFERRED (hoặc Review Manager chấp nhận merge dù đang DEFERRED).

## 19. 🔧 Đính chính kiểm kê thiết bị AR: iPhone 16 Pro thay iPhone 15 Pro Max là thiết bị chính LiDAR (trước khi triển khai step `8.1`, `chore/ar-terrain-toolchain`, 08/2026)

**Bối cảnh:** baseline `8.0` (APPROVED 2026-08-24, §16 phía trên) và các cross-reference liên quan ghi nhận **iPhone 15 Pro Max** là thiết bị chính có LiDAR — cụ thể: `docs/research/AR_TERRAIN_THESIS_BASELINE.md`, `docs/03_REQUIREMENT_DELTA_V0_2.md`, `docs/04_TECH_DECISION_RECORD.md` TDR-012, `docs/TEST_STRATEGY.md` §4, `docs/RISK_REGISTER.md` R-20, `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`, `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` (`docs/ARCHITECTURE.md` §7 chỉ mô tả track này ở mức tổng quát, không nêu tên thiết bị cụ thể, nên không cần đính chính). Trước khi bắt đầu triển khai step `8.1` (`chore/ar-terrain-toolchain`), chủ dự án đính chính kiểm kê thiết bị thật:

- **iPhone 16 Pro** là thiết bị chính LiDAR thật (không phải iPhone 15 Pro Max như baseline gốc ghi) — **hiện tạm thời không có sẵn**, đang do bạn của người dùng giữ, **chưa được kiểm chứng vật lý**. Không có test LiDAR/ARKit Scene Reconstruction nào từng chạy trên thiết bị này tính đến thời điểm ghi chú này.
- **iPhone 11 Pro** có sẵn vật lý ngay bây giờ. Được duyệt làm thiết bị vật lý riêng cho step `8.1` (Unity/iOS/Xcode/provisioning toolchain smoke test) — pass `8.1` trên thiết bị này **chỉ chứng minh toolchain hoạt động, không chứng minh và không thay thế yêu cầu LiDAR/ARKit Scene Reconstruction** của `8.2` trở đi. Thiết bị này **không bao giờ** được dùng để giả vờ tạo mesh LiDAR thật; vai trò compatibility/failure-path bắt buộc ở `8.6` giữ nguyên không đổi.
- **Galaxy Z Fold5** không thuộc baseline đã duyệt, không được dùng để kích hoạt bất kỳ triển khai Android/ARCore nào.

**Quyết định (Review Manager):**
1. Step `8.1` gate đổi thành: build qua Xcode, cài đặt và chạy trên **iPhone 11 Pro vật lý** trong ít nhất 60 giây — chỉ chứng minh toolchain Unity/iOS/Xcode/provisioning.
2. Thêm tiền đề bắt buộc trước step `8.2`: (a) lấy lại iPhone 16 Pro vật lý; (b) chạy lại một smoke test cài đặt/khởi chạy ngắn trên chính thiết bị đó; (c) thực hiện runtime Scene Reconstruction capability check. Không bắt đầu triển khai/kiểm chứng LiDAR nếu chưa có thiết bị.
3. Giữ nguyên không đổi: iPhone 11 Pro không bao giờ giả vờ tạo mesh LiDAR; test gate compatibility/failure-path bắt buộc vẫn ở `8.6`; toàn bộ coordinate contract, RTK (5 control + 3 checkpoint), công thức RMSE, PLY bắt buộc/GLB stretch, diện tích quét 10×10 m, và timeline tới code freeze 2026-11-15 không đổi.
4. Cảnh báo timeline mới: nếu iPhone 16 Pro chưa có mặt vật lý trước **2026-09-06/07**, đánh dấu track AR **AT RISK** và báo cáo Review Manager ngay — không dùng iPhone 11 Pro thay thế cho phần LiDAR dưới bất kỳ hình thức nào.
5. Quy ước đặt tên evidence prospective: các phiên đo LiDAR chính thức dùng `device_iphone-16-pro`/`iphone-16-pro`; evidence smoke test `8.1` dùng `device_iphone-11-pro`; **không bao giờ** gắn nhãn evidence của iPhone 11 Pro như thể là LiDAR evidence.

Đã cập nhật đồng bộ tại: `docs/research/AR_TERRAIN_THESIS_BASELINE.md` (§2, §4, §10, §11, §12, §13, §14, §15), `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` (dòng tổng quan + step `8.1`/`8.2`/`8.6`), `docs/04_TECH_DECISION_RECORD.md` (TDR-012), `docs/TEST_STRATEGY.md` §4, `docs/RISK_REGISTER.md` R-20, `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`, `docs/03_REQUIREMENT_DELTA_V0_2.md`. Các mục lịch sử trước đó (§15, §16 và các "Rework" con của nó, §17, §18) **giữ nguyên, không sửa, không xoá** — chúng phản ánh đúng thông tin tại thời điểm được ghi; mục §19 này là bản đính chính bổ sung, không viết đè lịch sử.

Không có code nào được viết cho mục này — đây thuần tuý là sửa tài liệu trước khi triển khai `8.1` (đúng nguyên tắc `AGENTS.md`: không code trước khi tài liệu cập nhật). Không có thay đổi nào trong `apps/backend`, `apps/web`, `apps/mobile`. Chưa tạo Unity project. Chưa bắt đầu step `8.2`.

## 20. Windows-first được chủ dự án đồng ý; giữ gate Mac/iOS/LiDAR riêng (2026-09-04)

**Nguồn quyết định:** chủ dự án xác nhận hiện chưa có Mac và đồng ý làm trên Lenovo + chuẩn bị iPhone 11 Pro trước; khi có Mac sẽ báo để chuyển sang Mac/iPhone 16 Pro. Đây là thay đổi cách triển khai, không thay đổi mục tiêu nghiên cứu. Email do người dùng cung cấp ngày 2026-09-03 xác nhận Unity Student subscription ACTIVE; activation trên máy chưa được chứng minh từ email này.

**Đính chính kỹ thuật:** Unity Editor có thể tạo/compile/chạy project trên Windows. Mac/Xcode cần cho build/ký/cài iOS locally, không phải điều kiện bắt buộc để tạo mọi project Unity. Giới hạn Windows docs-only trước đây trong baseline §4 được thay thế bằng quyết định này. Các ghi nhận lịch sử §15–19 được giữ nguyên; §20 là căn cứ hiện tại cho availability, license và dependency của toolchain.

**Quyết định triển khai:**

1. `8.1a` trên branch hiện có `chore/ar-terrain-toolchain`: Unity 6.3 LTS Windows bootstrap, một scene không-AR tối thiểu, exact Editor patch/package lock và source-control đầy đủ. Commit dự kiến đổi thành `chore: add ar terrain unity windows toolchain smoke test`; chưa commit trong lần cập nhật tài liệu này.
2. `8.1b` là micro-step riêng, branch dự kiến `chore/ar-terrain-ios-toolchain`, commit `chore: add ar terrain unity ios toolchain smoke test`. Chỉ mở sau khi `8.1a` được review/merge và người dùng xác nhận có Mac; cùng project được mở lại trên Mac, không tạo project thay thế.
3. `8.1a` gate: license tại máy hợp lệ, Editor import/compile không lỗi, scene camera/light/cube/nhãn smoke chạy Play Mode ≥60 giây, đóng/mở lại thành công, evidence Windows đúng nguồn. `8.1b` gate: build/ký/cài/chạy iPhone 11 Pro thật ≥60 giây qua Xcode; lặp install/launch trên iPhone 16 Pro trước `8.2`. Hai kết quả độc lập; cả hai phải đạt mới đóng nhóm `8.1`.
4. Chưa có Mac: iPhone 11 Pro chỉ chuẩn bị model/iOS/dung lượng/cáp phù hợp. Không tuyên bố build/cài iOS từ Windows, không dùng iPhone 11 Pro thay LiDAR. `8.2` vẫn cần `8.1b` PASS, iPhone 16 Pro vật lý và runtime Scene Reconstruction capability check.
5. Không có PLY/georeference/AR Foundation/ARKit/LiDAR implementation trong `8.1a`. Phần PLY/transform/RMSE thuần dữ liệu có thể tách thành micro-step Windows độc lập và duyệt trước khi code; không bỏ decision gate marker-center picking, không khoá convention AR runtime từ fixture.
6. Giữ nguyên 10×10 m, 5 control + 3 checkpoint độc lập, WGS84→ENU và `C_AXIS`→rigid 6-DoF/scale=1, Measurement Gate/Accuracy KPI, PLY bắt buộc/GLB stretch, không App Store/RTK realtime/cloud dependency. Không lấy dữ liệu tổng hợp hoặc FPS PC làm kết quả LiDAR/RTK/iPhone.
7. Lịch gần nhất **AT RISK**, không còn giả định Mac đã sẵn có. Checkpoint thiết bị gốc được làm rõ: chậm nhất 06/09, mục tiêu mesh nhỏ thật đầu tiên 07/09. Đây không phải cam kết giao máy của người dùng. Khi có thiết bị phải đánh giá lại lịch; không lùi ngầm code freeze 15/11, RTK cuối tháng 10 hoặc thay buổi đo bằng mô phỏng.
8. Chi phí phần mềm hiện tại: dùng Student đã ACTIVE, không mua Pro/trial/Apple Developer/Mac cloud. Mọi đề xuất thuê/mua thiết bị phát sinh cần chủ dự án quyết định riêng. Railway DEFERRED và các mốc retention đã ghi ở §18 không thay đổi.

**Trạng thái lúc cập nhật:** chỉ tài liệu và cài Hub trên máy, chưa tạo Unity project/C#, chưa chạy Editor/iPhone/LiDAR. Unity Hub 3.21.1 (Windows package 3.21.1.65535) đã cài thành công qua WinGet `Unity.UnityHub`, nguồn installer Unity được kiểm tra SHA-256; chưa xác nhận Student activation trong Hub. `8.1a` đang chuẩn bị, `8.1b` chờ thiết bị, không bước nào được đánh dấu PASS từ việc cài Hub.

**Bảo toàn:** mở rộng 8 file đính chính thiết bị đang uncommitted trong cùng worktree, không discard/stash/rebase nội dung của agent trước; thêm checklist `docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md`. Không sửa `apps/*`, không kéo/đổi dirty local `develop`, không commit/push/merge hoặc thay PR #71.

**Cập nhật chuẩn bị tạo project (2026-09-04):** người dùng đã đăng nhập Hub, ảnh Licenses hiển thị Unity Student (ngày hết hạn chưa xác minh). Ảnh Installs báo Unity 6.3 LTS `6000.3.23f1` Install complete; kiểm tra read-only xác nhận Editor executable tồn tại. Người dùng đã chọn template **Core → Universal 3D (URP)** cho scene không-AR, chưa bấm Create project tại thời điểm ghi nhận. Chuẩn bị Location `D:/CaNhan/myProject/NovaWay/.claude/worktrees/chore-ar-terrain-toolchain/research`, Project name `ar-terrain-unity`; không tạo repository/cloud service mới qua Hub, không bật AI Assistant/Unity CLI. Package versions sẽ được kiểm tra/ghim sau import; không coi cài Editor hoặc chọn template là `8.1a` PASS. Hướng dẫn thao tác và trạng thái mới nhất ở `docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md`.

## 21. Windows Editor smoke đã chạy; `8.1a` chờ source review/PR gate, `8.1b` vẫn chờ Mac (2026-09-05)

**Kết quả thực tế sau §20:** người dùng đã tạo project `research/ar-terrain-unity/` bằng Unity `6000.3.23f1` (revision `09d2ecc7fb28`), template Universal 3D/URP `17.3.0`. Hub hiển thị Unity Student và Editor đã mở project thành công. Scene `ToolchainSmoke` có camera, directional light, cube và nhãn `NovaWay - Toolchain Smoke / Non-AR test`. Người dùng xác nhận đã chạy Play Mode ít nhất 60 giây, stop/save, đóng/mở lại và chạy lại; ảnh lần chạy sau cho thấy cube/nhãn hiển thị và Console 0 error/0 warning. Thời lượng này là xác nhận của người dùng, không phải video/timer tự động. Kiểm tra bổ sung bằng Editor batch mode ngày 05/09 import/compile và thoát thành công với return code 0.

**Source-control audit:** đã thêm `.gitignore` riêng cho Unity để bỏ `Library/`, `Temp/`, `Obj/`, `Logs/`, `Build/`, `Builds/`, `UserSettings/` và file IDE sinh tự động; `.gitattributes` giữ Unity text ở LF khi chuyển Windows/macOS và bảo toàn asset nhị phân. `Assets/` không thiếu `.meta`, không có `.meta` mồ côi; `Visible Meta Files`, `Force Text`, `Packages/manifest.json`, `Packages/packages-lock.json` và exact Editor patch đều có. Manifest/source không chứa AR Foundation, ARKit hoặc LiDAR implementation; `UnityConnectSettings` đang disabled. Audit phát hiện build scene còn trỏ tới `SampleScene`; sau khi Unity đã đóng, đã sửa `EditorBuildSettings.asset` sang đúng path/GUID của `ToolchainSmoke`.

**Sự cố phải giữ trong evidence:** lần import đầu có out-of-memory/VirtualArtifacts khi RAM trống rất thấp; sau khi người dùng đóng ứng dụng khác và mở lại thì import/chạy được. Một lần mở lại có cảnh báo VS/Unity messaging không bind được UDP `56202`; read-only diagnostics cho thấy port thuộc excluded UDP range của Windows. Ảnh cuối có Console sạch nhưng không đủ chứng minh điều kiện port đã tự hết vĩnh viễn. Không sửa firewall/port reservation, không xoá Library và không nâng Editor để che sự cố.

**Giới hạn kết luận:** evidence Windows được giữ ngoài Git và gắn đúng nhãn không-AR. Kết quả trên chưa chứng minh build/cài iOS, iPhone, ARKit Scene Reconstruction, LiDAR, RTK, FPS/pin/nhiệt mobile. Chưa commit/push/merge; `8.1a` chỉ được đóng sau source review và required PR checks, còn `8.1b` vẫn chờ Mac. Không sửa `apps/*`, không chạm PR #71 và không phát sinh phí.

## 22. PR #76 (`8.1a`) — CHANGES REQUESTED bởi Review Manager, rework đã áp dụng (2026-09-05)

**Bối cảnh:** PR #76 (commit `3d8cfb4`) được mở cho `8.1a` sau §20/§21, tất cả required GitHub check đã xanh. Review Manager tự kiểm tra độc lập commit, PR, evidence bên ngoài, và chính Unity project cục bộ, xác nhận PR tồn tại/target đúng `develop`, check xanh, evidence screenshot khớp SHA-256 với `RUN_RECORD.md`, một lần batch-mode import/compile độc lập thoát mã 0, `apps/*` nằm ngoài PR, và không có tuyên bố sai về iOS/LiDAR/RTK — nhưng ra verdict **CHANGES REQUESTED**, chưa merge, với 5 nhóm phát hiện phải sửa trước khi review lại.

**Phát hiện 1 — bất ổn khi mở lại project:** mở project đã commit bằng Unity `6000.3.23f1` (batch mode, `-quit`, chờ đúng process thoát, log riêng biệt) ghi đè `ProjectSettings/ShaderGraphSettings.asset`, thêm một khoảng trắng cuối dòng vào `m_Name:` và `m_EditorClassIdentifier:` (giá trị chuỗi rỗng) — làm worktree dirty ngay sau một lần reopen thành công, dù không có lỗi import/compile nào. Đã tái hiện độc lập từ trạng thái sạch thật (xoá `Library/Temp/Logs/UserSettings` trước khi mở) và từ trạng thái đã có `Library` (mở lần hai) — cả hai cho cùng một diff, ổn định, xác định (không phải race condition ngẫu nhiên). Đây là hành vi serializer YAML canonical của chính Unity cho field chuỗi rỗng trên asset dạng MonoBehaviour/ScriptableObject, không phải lỗi ngẫu nhiên hay do máy.

**Quyết định kỹ thuật:** thay vì liên tục xoá khoảng trắng mà Unity sẽ tự thêm lại ở lần mở kế tiếp (vòng lặp vô ích), chấp nhận chính bản serialize canonical của Unity (có khoảng trắng cuối dòng) làm nội dung commit chuẩn cho `ShaderGraphSettings.asset` — đã verify hai lần mở liên tiếp sau đó (một từ `Library` sạch, một từ `Library` đã có) đều không tạo thêm sai khác nào so với bản đã commit. Vì `git diff --check` mặc định coi khoảng trắng cuối dòng là lỗi, thêm attribute `-whitespace` (unset hoàn toàn kiểm tra whitespace của git, không chỉ tắt riêng `trailing-space`) trong `research/ar-terrain-unity/.gitattributes`, giới hạn đúng phạm vi các phần mở rộng YAML MonoBehaviour/ScriptableObject của Unity (`*.unity`, `*.prefab`, `*.asset`, `*.mat`, `*.controller`, `*.anim`, `*.overrideController`, `*.physicMaterial`, `*.physicsMaterial2D`, `*.renderTexture`, `*.spriteatlas`, `*.terrainlayer`, `*.guiskin`, `*.preset`, `*.playable`, `*.mask`, `*.brush`, `*.flare`, `*.fontsettings`) — không đổi whitespace behavior toàn repo, không đụng tới các đuôi mã nguồn/shader/JSON khác đã có rule `text eol=lf` riêng. Đã verify `git diff --check` (cả staged lẫn unstaged) pass sau thay đổi này, đồng thời hai lần mở lại liên tiếp vẫn giữ `git status` sạch — hai điều kiện được thoả đồng thời, không đánh đổi cái này lấy cái kia.

**Phát hiện 2 — dọn template onboarding không liên quan tới smoke scene:** xác nhận qua kiểm tra tham chiếu GUID rằng `Assets/Readme.asset`, `Assets/TutorialInfo/` và `Assets/Scenes/SampleScene.unity` không được bất kỳ asset nào khác (kể cả `ToolchainSmoke.unity`, `ProjectSettings/*`) tham chiếu tới — xoá theo đúng cặp asset + `.meta`. TextMesh Pro và Input System **giữ nguyên**, vì kiểm tra dependency xác nhận `ToolchainSmoke.unity` dùng TextMeshPro cho label và `ProjectSettings/EditorBuildSettings.asset` (`com.unity.input.settings.actions`) tham chiếu đúng GUID của `InputSystem_Actions.inputactions` — cả hai thật sự cần thiết, không xoá thêm.

**Phát hiện 3 — evidence phải tái tạo được:** manifest nguồn (danh sách file đã review + SHA-256 + thuật toán/định dạng dòng + checksum của chính manifest + commit head cuối cùng) sẽ được thêm vào evidence bên ngoài Git sau khi rework này có commit/PR head cuối cùng — không commit screenshot/log/license/machine ID vào Git; xem cập nhật ở `docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md` cho đường dẫn/checksum cụ thể.

**Phát hiện 4 — tách rõ các lớp trạng thái, không gộp:** Windows Play Mode thủ công = **user-reported/manual-observed** (không tự động, không phải agent chạy); batch-mode import/compile = **agent-executed automated local check** (agent tự chạy Unity `6000.3.23f1` batch mode, có log/exit code làm bằng chứng); required GitHub checks = **PASS**; Review Manager = **CHANGES REQUESTED** cho tới khi rework này được review lại; merged = **NO**; `8.1b`/iOS/LiDAR/RTK = **NOT RUN**. Không gọi `8.1a` là DONE/PASS cho tới khi Review Manager duyệt lại rework này.

**Bảo toàn:** không force-push, không rewrite history, không sửa `apps/*`, không đụng dirty local `develop` (bao gồm `apps/mobile/macos/Flutter/GeneratedPluginRegistrant.swift`), không chạm PR #71. Rework thêm bằng commit mới trên cùng branch `chore/ar-terrain-toolchain`, giữ nguyên commit `3d8cfb4` đã publish.

## 23. Sửa phạm vi manifest (tránh vòng lặp tự tham chiếu) và đánh số lại §3 trùng lặp trong handoff doc (2026-09-05)

**Bối cảnh:** sau khi §22 áp dụng rework (commit `3e77992`) và một commit tài liệu tiếp theo `802c992` ghi lại đường dẫn/checksum của `SOURCE_MANIFEST.md`, Review Manager phát hiện `SOURCE_MANIFEST.md` tự gọi mình là đại diện cho "Final PR head commit" trong khi nó chỉ thực sự hash nội dung tại `3e77992` — validate thủ công đúng đắn cho thấy có sai lệch đúng một file so với `802c992` (`docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md`, vì file này bị sửa thêm ở `802c992` sau khi manifest đã được tạo). Đây là hệ quả trực tiếp của một vòng lặp tự tham chiếu: manifest phải hash một tài liệu Git đang chứa chính checksum của manifest đó.

**Sửa phạm vi:** đổi `SOURCE_MANIFEST.md` để tuyên bố rõ nó chỉ đại diện cho **đúng một commit `3e77992`** ("code-bearing rework commit covered by this manifest"), không phải PR head cuối cùng; nêu rõ `802c992` và mọi commit tài liệu sau đó nằm ngoài phạm vi, có chủ đích, để tránh vòng lặp tự tham chiếu nói trên.

**Phát hiện thêm trong lúc sửa (không phải yêu cầu ban đầu, nhưng phải sửa vì ảnh hưởng tính đúng đắn của manifest):** khi validate lại 141 dòng của manifest so với nội dung blob Git thật (`git show 3e77992:<path>`), phát hiện **9/141 dòng sai** — không liên quan gì tới việc đổi phạm vi ở trên, mà vì bản thảo đầu tiên của manifest hash trực tiếp file trên đĩa (working tree) thay vì nội dung blob Git; trên máy Windows này, `core.autocrlf` và rule `eol=lf` riêng của `research/ar-terrain-unity/.gitattributes` khiến bytes trên đĩa của một file vừa `git add` có thể khác bytes đã chuẩn hoá mà Git thực sự lưu trong object database — sai lệch này **không** hiện ra qua `git status` (so sánh index/blob, không so sánh bytes trên đĩa). Đã sửa bằng cách hash lại toàn bộ 141 file từ `git show 3e77992:<path>` (không phụ thuộc cấu hình máy đang checkout), rồi verify độc lập hai lần (một lần khi tạo, một lần so khớp lại riêng biệt) — cả 141 dòng khớp, 0 sai lệch. Đã ghi rõ phương pháp này (và lý do) ngay trong manifest để không lặp lại nhầm lẫn ở các evidence sau này.

**Checksum manifest cuối cùng (sau cả hai sửa đổi trên):** `3a7d31fa56b4a4c110133cf8d8d7307f207c2312b8620d2defd5f53e125bd18e` (thay cho `c27303d682bd91f1ad1810d218cf5eb6553c09cb4c97971649aa93302f43cddc` cũ). Đã cập nhật `docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md`, `RUN_RECORD.md` bên ngoài Git, và mô tả PR #76 cho khớp — tất cả đều nói rõ manifest chỉ đại diện cho `3e77992`, không phải PR head cuối cùng.

**Đánh số lại §3 trùng lặp:** `docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md` khi thêm mục "Rework" ở §22 đã vô tình đặt trùng số `## 3` với mục "iPhone 11 Pro trong lúc chưa có Mac" đã có sẵn. Đã chuyển mục Rework xuống cuối tài liệu thành `## 8`, giữ nguyên `## 1`–`## 7` không đổi, và cập nhật hai tham chiếu nội bộ `(xem §3 dưới)` → `(xem §8 dưới)`/`(§8)`. Xác nhận numbering hiện tại 1–8 liên tục, không trùng.

**Không lặp lại phần điều tra kỹ thuật Unity đã pass ở §22** (hai lần mở lại liên tiếp, asset/`.meta`, build scene, `apps/*`, GitHub CI) — các phát hiện này chỉ là sai sót tài liệu/evidence, không phải phát hiện kỹ thuật mới về Unity.

## 24. Review Manager APPROVED, PR #76 squash-merge vào `develop` — step `8.1a` COMPLETED (2026-09-05)

**Xác nhận độc lập cuối cùng của Review Manager** trước khi cho phép merge, dựa trên chính commit `ad260c4` (rework thứ hai, §23):

- PR #76: state OPEN → **MERGED**, target `develop`, mergeable/CLEAN trước khi merge.
- Required GitHub checks (`Backend + Web + shared-types`, `E2E (Playwright, golden path)`, `Mobile (analyze, test)`, `Vercel`): tất cả **PASS**.
- `SOURCE_MANIFEST.md` (evidence ngoài Git, phạm vi giới hạn đúng commit `3e77992` theo §23): 141/141 hash blob Git khớp, 0 file thiếu/thừa so với path list, self-checksum khớp, checksum file ngoài `3a7d31fa56b4a4c110133cf8d8d7307f207c2312b8620d2defd5f53e125bd18e` xác nhận đúng.
- Xác minh Unity độc lập, **sau merge**, từ một worktree cô lập tạo mới từ `origin/develop` (không phải branch cũ của PR): hai lần chạy liên tiếp `Unity.exe -batchmode -nographics -quit` (một từ `Library` sạch, một từ `Library` đã có từ lần trước) — cả hai thoát mã 0, log kết thúc bằng `Exiting batchmode successfully now!`, không còn tiến trình `Unity.exe` treo lại (xác nhận qua `tasklist`), `git status` sạch sau mỗi lần (0 sai lệch), 0 lỗi compile.
- Asset/`.meta` dưới `Assets/`: 0 thiếu, 0 mồ côi. `EditorBuildSettings.asset`: build scene duy nhất vẫn là `Assets/Scenes/ToolchainSmoke.unity`.
- `apps/backend`, `apps/web`, `apps/mobile`: không có thay đổi nào trong toàn bộ PR #76 (so với `6c17812`).
- File sửa đổi có sẵn ở local `develop` (`apps/mobile/macos/Flutter/GeneratedPluginRegistrant.swift`): không bị đụng tới trong suốt PR #76 và các bước xác minh.

**Quyết định (Review Manager): APPROVED.** PR #76 được **squash-merge** vào `develop` bằng đúng commit message đã ghi trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` cho step `8.1a`:

```
chore: add ar terrain unity windows toolchain smoke test
```

**Merge commit: `9b8a692fb7284c9e84382319f527c344ca57dfd9`** (2026-09-05T04:21:35Z). Các commit riêng lẻ trên branch (`3d8cfb4`, `3e77992`, `802c992`, `ad260c4`) không xuất hiện trong lịch sử `develop` do squash — nội dung đầy đủ của chúng nằm trong commit squash này.

**Trạng thái cuối:** step `8.1a` (Windows Unity Editor toolchain smoke test) — **COMPLETED**. `8.1b` (Mac/Xcode/iPhone), và mọi phần iOS/LiDAR/RTK — **NOT RUN**, không được coi là đã đạt chỉ vì `8.1a` đã merge. `8.2` vẫn chờ đúng tiền đề đã ghi ở baseline §4/§11 và micro-step plan (`8.1b` PASS + iPhone 16 Pro vật lý + runtime Scene Reconstruction capability check).

**Bảo toàn:** không sửa lại lịch sử đã ghi ở §22/§23 (giữ nguyên, không viết đè); không force-push, không rewrite history trên `chore/ar-terrain-toolchain` trước khi merge; không sửa `apps/*`; không đụng dirty local `develop` (bao gồm `apps/mobile/macos/Flutter/GeneratedPluginRegistrant.swift`); không chạm PR #71. Bản ghi này (§24) là micro-step tài liệu riêng, độc lập, trên branch mới `docs/ar-terrain-8-1a-post-merge-status` (không tái sử dụng branch `chore/ar-terrain-toolchain` đã merge), commit message kế hoạch: `docs: record ar terrain toolchain merge verification`.

## 25. Survey Mode / Drive Mode và cập nhật thiết bị Mac thực tế (2026-09-22)

**Evidence từ chủ dự án:** MacBook Air mượn được thực tế là chip **Apple M3** (không phải M4 như baseline cũ), macOS Sequoia 15.3.1, hơn 50 GB trống. iPhone 11 Pro chạy iOS 18.3.1. Xcode 16.4 đang tải từ Apple Developer Downloads. Đây mới là evidence kiểm kê/user-reported; chưa có `xcodebuild -version`, Unity Mac import, Xcode build, signing, install hoặc launch, nên `8.1b` vẫn **NOT RUN**. iPhone 16 Pro vẫn chưa có; `8.2` và bằng chứng LiDAR thật còn BLOCKED.

**Yêu cầu sản phẩm được làm rõ:** người dùng không muốn xe chỉ phát hiện địa hình khi đã tới rất gần; nếu địa hình đã được quét trước thì app phải dùng bản đồ đó để cảnh báo đủ sớm. Review kết luận phải tách:

- **Survey Mode:** LiDAR thu thập mesh cục bộ, PLY/georeference/RTK; 10×10 m vẫn là gate đo khoa học.
- **Drive Mode:** thiết bị phổ thông dùng GPS/heading/speed/route/corridor để tra terrain catalog đã quét trước; warning horizon không phải LiDAR sensing range.

**Hiển thị được chủ dự án bổ sung:** FPP (First-Person Perspective) dùng cho camera/AR trực quan, đặc biệt ở Survey Mode; TPP (Third-Person Perspective) dạng map overview/góc xiên là mặc định của Drive Mode để thấy xe, tuyến và cảnh báo phía trước; Second-Person Perspective không đưa vào runtime lái xe vì cần camera/chủ thể ngoài và không phù hợp điều khiển an toàn, chỉ có thể là replay/nghiên cứu tương lai. Khi AR/camera/tracking không khả dụng, FPP phải fallback về TPP; cảnh báo không phụ thuộc duy nhất vào đồ hoạ mà còn có chữ ngắn/âm thanh/rung.

**Quyết định phạm vi:** không biến yêu cầu này thành cam kết dense-mesh toàn thành phố hoặc một phiên LiDAR quét liên tục toàn tuyến. Trước bảo vệ, track `8.x` vẫn local/offline và không đổi `apps/*`/backend/API. Implementation cảnh báo sớm cần micro-step riêng sau docs review; fixture phải gắn nhãn fixture, không thay bằng chứng LiDAR thật. Chi tiết: `docs/research/AR_TERRAIN_SURVEY_DRIVE_MODE_ADDENDUM.md`, TDR-013 và plan step `8.0b`.

**Duyệt và bước song song:** sau khi được trình bày kết quả `8.0b`, người dùng xác nhận “OK, tiếp tục công việc” ngày 2026-09-22 và yêu cầu tận dụng thời gian Mac đang tải Xcode. `8.0b` được ghi APPROVED. Plan bổ sung `8.1c` để dựng Drive Mode trực quan bằng fixture trên Lenovo ở branch riêng sau khi docs merge: TPP mặc định, FPP map-simulation bổ sung, không Second-Person runtime, không ARKit/LiDAR và không sửa `apps/*`. Việc này không đổi ưu tiên hoàn thành `8.1b` ngay khi Xcode sẵn sàng.

## 26. Drive Visual Mock merge và Xcode 16.4 đã mở — chuyển sang `8.1b` (2026-09-22)

**Kết quả `8.1c`:** branch `feat/ar-terrain-drive-visual-mock` bổ sung scene fixture có xe/tuyến/ba vùng cảnh báo, parser catalog có version, warning horizon theo tốc độ/thời gian báo trước, cooldown, TPP mặc định và FPP map-simulation. Toàn bộ runtime/evidence ghi `SYNTHETIC/FIXTURE`; không có AR Foundation/ARKit/LiDAR package, không sửa `apps/*`. EditMode 9/9, PlayMode 1/1 và Unity batch compile đều PASS. Người dùng chạy Play Mode Windows ít nhất 60 giây, xác nhận các nút hoạt động và Console không lỗi đỏ; ảnh review phát hiện UI cố định chồng chữ khi Game View hẹp, agent đã sửa layout responsive, chạy lại test và người dùng replay trước khi đóng Unity. Required PR checks xanh; PR #79 được squash-merge vào `develop` bằng commit `29db6b8f3b27a7194f8c65e10846db70e780abce`, subject đúng `feat: add ar terrain drive visual mock`.

**Chuyển sang `8.1b`:** người dùng cung cấp ảnh Xcode Welcome xác nhận Xcode 16.4 stable đã cài và mở trên MacBook Air M3. Đây chỉ là install evidence; chưa có `xcodebuild -version`, `xcode-select -p`, Unity `6000.3.23f1` + iOS Build Support trên Mac, Xcode build/signing, app install/launch hoặc 60-second run trên iPhone 11 Pro. Vì vậy `8.1b` vẫn NOT RUN/PENDING và `8.2` vẫn BLOCKED do chưa có iPhone 16 Pro. Branch mới `chore/ar-terrain-ios-toolchain` chỉ chuẩn bị cấu hình/build automation/runbook; tuyệt đối không commit Apple ID, Team ID, UDID, signing certificate hoặc provisioning profile.

## 27. Xcode command-line gate PASS; dung lượng Mac cần xác minh lại (2026-09-23)

Người dùng đã chuyển Xcode từ Downloads vào `/Applications/Xcode.app`. Terminal trả về active developer directory `/Applications/Xcode.app/Contents/Developer`, Xcode `16.4`, build `16F6`, và macOS `15.3.1`; phần Xcode command-line gate của `8.1b` vì vậy được xác nhận PASS. Không lưu username hoặc ảnh chứa thông tin cá nhân vào Git.

`df -h /` đồng thời chỉ báo `16Gi` khả dụng, không khớp kiểm kê ban đầu hơn 50 GB. Trước khi cài Unity `6000.3.23f1` + iOS Build Support phải kiểm tra `df -h /System/Volumes/Data`; chưa đánh dấu dung lượng PASS. Unity Mac import, Xcode project generation, signing, install/launch và chạy iPhone 11 Pro ≥60 giây vẫn PENDING. PR #80 tiếp tục ở trạng thái DRAFT và không được merge tại checkpoint này.

## 28. Mac Data volume thiếu dung lượng cho Unity toolchain (2026-09-23)

Kết quả `df -h /System/Volumes/Data`: tổng `228Gi`, đã dùng `171Gi`, khả dụng `15Gi`, capacity 92%. Đây là evidence trực tiếp thay thế kiểm kê ban đầu hơn 50 GB trống. Không bắt đầu tải Unity Editor/iOS Build Support hoặc import project với mức dung lượng này để tránh tải/build dở dang.

Vì MacBook là thiết bị mượn, agent không yêu cầu hoặc thực hiện xoá dữ liệu của chủ máy. Human action cần thiết: chủ máy/người dùng xác định dữ liệu có thể xoá hoặc chuyển sang ổ ngoài, dọn Thùng rác, rồi chạy lại `df -h /System/Volumes/Data`. Xcode command-line gate vẫn PASS; PR #80 vẫn DRAFT; các gate Unity/iPhone/LiDAR giữ nguyên PENDING/NOT RUN.

## 29. Lenovo/Windows chuẩn bị `8.1b`: builder sửa lỗi guard macOS-only, Xcode project sinh được trên Windows (2026-09-24)

**Dung lượng Mac — timeline (giữ nguyên lịch sử, không thay số cũ):**

- 2026-09-23 — **USER-REPORTED** (kết quả `df` do người dùng cung cấp, xem §28): Data volume còn `15Gi`.
- 2026-09-24 — **USER-REPORTED / NOT AGENT-EXECUTED**: sau khi dọn thêm dữ liệu, người dùng báo Data volume còn `23 GiB`.
- **Storage readiness: PENDING.** Số tăng từ 15 lên 23 GiB không được coi là gate PASS; người dùng tiếp tục giải phóng dung lượng trước phiên Mac. Agent không đo lại trên Mac vì hôm nay không có Mac.

**Mục tiêu hôm nay:** làm hết phần `8.1b` có thể làm trên Lenovo để phiên Mac chỉ còn các thao tác bắt buộc dùng macOS/Xcode/iPhone (ký, build cuối, cài, chạy, evidence runtime). Không thay đổi phạm vi: không AR Foundation/ARKit/LiDAR/GPS/PLY/RTK, không sửa `apps/*`.

**AGENT-EXECUTED trên Lenovo (Windows 11, Unity `6000.3.23f1`):**

- iOS Build Support xác minh bằng filesystem: `Editor/Data/PlaybackEngines/iOSSupport` có `il2cpp`, `Trampoline`, `Tools`, `iOSPlayerBuildProgram.exe`, `UnityEditor.iOS.Extensions*.dll`, `modules.asset` (3.435 file, khớp số đã báo) và Unity `BuildPipeline.IsBuildTargetSupported(iOS)` không bị builder từ chối.
- **Symptom:** chạy nguyên bản `IosToolchainSmokeBuilder.Build` bằng batch mode trên Windows → `PlatformNotSupportedException: ...must run from Unity Editor on macOS`, exit code 1, không tạo output. **Root cause:** guard cứng `Application.platform != RuntimePlatform.OSXEditor` trong builder (đọc source; tái hiện bằng log). **Fix:** tách `IsSupportedEditorPlatform(RuntimePlatform)` cho phép Windows/macOS Editor, dùng ở cả entry point lẫn menu validator; thêm 7 test case EditMode (predicate, scene smoke tồn tại, bundle identifier khớp). Commit `3c12a31`.
- Trên cây sạch tại `3c12a31`: batch compile exit 0 và 0 `error CS`; EditMode **16/16** (baseline cũ 9/9 + 7 mới); PlayMode **1/1**; sau mỗi lần chạy không còn tiến trình `Unity.exe`.
- Sinh Xcode project mới bằng builder trên Windows: exit 0, marker `[iOS TOOLCHAIN SMOKE] Xcode project created`, chỉ scene `ToolchainSmoke` (`level0`; DriveVisualMock không có trong player). Kết quả xác định: hai lần build cho cùng kích thước output `1.242.828.555` byte.
- Kiểm tra output thật: 4 native target (Unity-iPhone, UnityFramework, GameAssembly, Unity-iPhone Tests); bundle id `com.novaway.arterrainprototype`; `DEVELOPMENT_TEAM` rỗng, automatic signing, không provisioning profile; deployment target 15.0; không có khoá ARKit/LiDAR/camera/location; 0 byte CR trong pbxproj/plist/.sh (không có rủi ro CRLF); toolchain IL2CPP macOS `deploy_arm64` (khớp `HOST_ARCH=arm64` của Mac M3) có Mach-O arm64 kèm load command chữ ký (chỉ là **sự hiện diện**, hiệu lực chữ ký chỉ kiểm được trên Mac).
- Quét portability: không có đường dẫn Windows trong file text; duy nhất `Libraries/lib_burst_generated.a` chứa chuỗi thư mục tạm của Burst (không ảnh hưởng link/chạy, chỉ là thông tin tên thư mục cục bộ). Thư mục `*_BurstDebugInformation_DoNotShip` (không được pbxproj tham chiếu, có đường dẫn cục bộ) bị loại khỏi ZIP.
- Artifact chuyển Mac (ngoài Git): ZIP 296.940.050 byte, 3.046 file, SHA-256 `be66e489b96d8aa95982ec626740c98ba92e4063ed7762cbc9ee2c58ec53c3e8`, `source_commit` `3c12a31049b3986b6bd319b846aaa72fbfd41ff2`; đã kiểm tra entry không có dấu `\`, giải nén thử 0 sai lệch path/size, SHA-256 khớp trên mẫu ngẫu nhiên 80 file cùng các file then chốt. Record đầy đủ nằm trong evidence ngoài Git (`novaway-ar-terrain-evidence/2026-09-24_ios_toolchain_smoke_8.1b/device_lenovo-windows/`). Artifact không đại diện cho các commit tài liệu sau `3c12a31` (Unity source không đổi; kiểm bằng `git diff 3c12a31 HEAD -- research/`).

**Quan sát cần biết (không sửa):** build iOS làm Unity tự sửa 4 file tracked (`Assets/Settings/*` nâng `k_AssetVersion` URP, thêm entry iPhone ở `m_BuildTargetBatching`, cộng khoảng trắng) — xác định, không phải thay đổi có chủ đích nên không commit; sau build dùng `git checkout -- <file>` từng file. Trang system requirements Unity 6.3 chỉ nêu Xcode 16+ và iOS 15+; **không nêu** việc xuất Xcode project từ Windows Editor — nên đây là kết quả thực nghiệm, không phải tính năng được tài liệu Unity xác nhận.

**Trạng thái (không được suy diễn thêm):**

```text
WINDOWS XCODE PROJECT GENERATION: PASS
MAC XCODE BUILD: NOT RUN
PERSONAL TEAM SIGNING: NOT RUN
IPHONE INSTALL: NOT RUN
IPHONE RUNTIME: NOT RUN
ARKIT / LIDAR / GPS / RTK: NOT RUN
```

`8.1b` **chưa** hoàn tất: chỉ hoàn tất sau khi ngày 2026-09-25 (hoặc phiên Mac kế tiếp) Xcode build PASS trên Mac, ký bằng Personal Team PASS, app cài lên iPhone 11 Pro thật, chạy ≥60 giây không crash, đóng/mở lại PASS, evidence đã che thông tin nhạy cảm, Review Manager duyệt và CI xanh. Workflow Unity-trên-Mac trong runbook được giữ làm fallback cho tới khi pipeline chuyển giao chạy end-to-end. PR #80 giữ DRAFT, chưa merge.

## 30. Review Manager CHANGES REQUESTED trên PR #80 (head `4931492`): sửa hướng dẫn Mac, không đổi code (2026-09-24)

Review Manager kiểm tra độc lập PR head `4931492` và ZIP chuyển Mac: Windows export, checksum và CI khớp báo cáo §29. Ba điểm hướng dẫn được sửa trước phiên Mac ngày 2026-09-25; §29 giữ nguyên làm lịch sử, mục này thay thế các hướng dẫn tương ứng.

1. **Bỏ bước mặc định `xattr -dr com.apple.quarantine` và `chmod -R u+x` cho cả cây.** Evidence: ZIP lưu file ở mode đọc/ghi, nhưng build phase shell của `Unity-iPhone.xcodeproj/project.pbxproj` đã chứa `chmod +x` cho `il2cpp`, `il2cpp-compile` và `bee_backend` (agent kiểm lại trên output thật: 3 lệnh `chmod +x`). Chưa có lỗi thật trên Mac chứng minh cần can thiệp thêm. Quy trình đúng: kiểm SHA-256 → giải nén → mở Xcode → Build/Run. Chỉ khi gặp lỗi quyền chạy hoặc quarantine cụ thể mới xác định chính xác file bị chặn và xử lý giới hạn cho đúng file đó; lỗi quyền trên ba tool đã có `chmod +x` là bất thường và phải báo nguyên văn trước khi can thiệp. Chỉ dẫn `xattr`/`chmod` toàn cây từng xuất hiện trong runbook §7.2, record chuyển giao ngoài Git và báo cáo bàn giao ngày 2026-09-24 nay bị rút lại.
2. **Dung lượng:** kiểm bằng `df -h /System/Volumes/Data` (phân vùng thực sự chứa project, Xcode và DerivedData) thay cho `df -h /`, và kiểm lại sau giải nén cùng sau lần build đầu. Mốc `23 GiB` (2026-09-24) vẫn chỉ là số người dùng báo (USER-REPORTED), không phải kết quả đo của agent hay build PASS. Có thể thử đường Xcode-only mà không bắt buộc cài Unity trên Mac trước.
3. **Unity drift sau build:** bỏ chỉ dẫn chung "`git checkout -- <file>` từng file" ở §29. Thay bằng: với từng file tracked bị đổi, xem `git diff` của riêng file đó trong đúng worktree, chứng minh thay đổi chỉ do lần build vừa chạy tạo ra, rồi mới xử lý đúng file đó và ghi lý do; không đụng thay đổi của người dùng. (Việc đã làm hôm nay — bốn file drift trong worktree `ar-terrain-ios-toolchain` mới sạch trước build, diff chỉ gồm migration URP/batching/whitespace do chính lần build tạo ra — không thay đổi kết luận; chỉ hướng dẫn tổng quát được sửa.)

**Phạm vi:** chỉ sửa tài liệu (`AR_TERRAIN_IOS_TOOLCHAIN_RUNBOOK.md`, mục này) và record ngoài Git; không phát hiện lỗi code mới, không sinh lại artifact (ZIP và SHA-256 `be66e489…c3e8` không đổi, agent tính lại và khớp). Trong lúc rà soát agent tự phát hiện file sidecar `.sha256` ngoài Git đã bị ghi với CRLF (sẽ làm `shasum -c` trên Mac báo sai tên file) và đã ghi lại thành LF-only; `sha256sum -c` trên sidecar mới cho `OK`. Trạng thái các gate không đổi: `WINDOWS XCODE PROJECT GENERATION: PASS`; Mac Xcode build, ký Personal Team, cài/chạy iPhone, ARKit/LiDAR/GPS/RTK: **NOT RUN**. `8.1b` chưa hoàn tất; PR #80 giữ DRAFT, chưa merge.

## 31. Kết quả Mac + iPhone 11 Pro cho `8.1b` — smoke không-AR đạt theo USER-REPORTED (ghi nhận 2026-09-26)

**Provenance — không diễn đạt như agent chạy trên Mac:** các bước Windows (sinh Xcode project, ZIP, checksum, test) là **AGENT-EXECUTED** (§29, §30). Mọi bước trên MacBook Air M3 và iPhone 11 Pro dưới đây là **USER-EXECUTED / USER-REPORTED**; agent chỉ nhận báo cáo của người dùng và hai ảnh, không chạy lệnh nào trên Mac hay iPhone. Ngày chạy thực tế không được người dùng nêu (kế hoạch là 2026-09-25); ghi nhận vào 2026-09-26.

**Người dùng báo:**

- ZIP Xcode project được xác minh SHA-256 `be66e489b96d8aa95982ec626740c98ba92e4063ed7762cbc9ee2c58ec53c3e8` (trùng artifact Lenovo build từ source `3c12a31`).
- Xcode 16.4 mở project sinh từ Windows và báo **Build Succeeded** cho iPhone thật.
- Ký bằng Apple Account miễn phí / Personal Team; đã bật Developer Mode và tin cậy chứng chỉ ứng dụng trên iPhone.
- Ứng dụng chạy trên iPhone 11 Pro (iOS 18.3.1), hiện cảnh "NovaWay - Toolchain Smoke / Non-AR test" và khối lập phương.
- Ứng dụng mở liên tục hơn 60 giây, không tự thoát.
- Sau khi bấm Stop trong Xcode và thoát app trên iPhone, người dùng mở lại **trực tiếp từ biểu tượng trên iPhone** (không bấm Run lần nữa); cảnh hiện lại, app không tự thoát.
- `df -h /System/Volumes/Data` sau build/chạy: Avail `14Gi`, Capacity `93%`.

**Ảnh chỉ chứng minh những gì nhìn thấy:** ảnh iPhone cho thấy cảnh có nhãn, khối lập phương và watermark "Development Build"; ảnh Xcode cho thấy Automatically manage signing, bundle id `com.novaway.arterrainprototype`, profile do Xcode quản lý, trạng thái "Running", 105 cảnh báo và log runtime. Thời lượng >60 giây, việc mở lại độc lập, model/iOS version và chữ "Build Succeeded" là xác nhận trực tiếp của người dùng, **không** suy ra từ ảnh.

**Vấn đề bằng chứng:** ảnh Xcode người dùng gửi **chưa được che**: còn hiện tên Team cá nhân, Apple ID email (một phần) ở ô Signing Certificate và tên thiết bị iPhone. Agent tạo bản đã che (hộp đen pixel, PNG mới) và chỉ lưu bản đó cùng ảnh iPhone (không chứa thông tin cá nhân) ở evidence **ngoài Git** (`novaway-ar-terrain-evidence/2026-09-26_ios_toolchain_smoke_8.1b_mac_iphone/device_iphone-11-pro/`, kèm `MAC_IPHONE_RESULT_RECORD.md`). Ảnh gốc chưa che không được lưu vào evidence hay Git. Không có ảnh, Apple ID, Team ID, UDID, chứng chỉ, provisioning profile hay đường dẫn cá nhân nào trong Git.

**Đối chiếu test gate `8.1b` (runbook §6):**

| Gate | Kết quả |
|---|---|
| Xcode build thành công | PASS (USER-REPORTED) |
| App cài và mở trên iPhone 11 Pro thật, ký bằng Personal Team | PASS (USER-REPORTED; ảnh cảnh) |
| Cảnh hiện camera/light/cube và nhãn không-AR | PASS (ảnh: nhãn + cube) |
| Chạy ≥60 giây không crash | PASS (USER-REPORTED) |
| Đóng và mở lại ≥1 lần | PASS (USER-REPORTED, mở lại độc lập từ icon) |
| Evidence ghi exact Unity/Xcode/macOS/iOS version + source commit | PARTIAL: Xcode 16.4 và macOS 15.3.1 (lệnh đã báo trước đó), iOS 18.3.1 (user-reported), Unity `6000.3.23f1` + `3c12a31` qua khớp SHA artifact; chưa thấy hết trong ảnh |
| Ảnh/log đã che thông tin cá nhân | CHƯA ĐẠT với ảnh Xcode gốc; bản đã che đã lưu ngoài Git |
| Install/launch trên thiết bị LiDAR thật (iPhone 16 Pro) "trước `8.2`" (dòng plan) | NOT RUN — thiết bị chưa có/chưa kiểm chứng vật lý |
| Review Manager review, CI xanh, PR được phép merge | CI xanh tại `2b093b3`; review/merge CHƯA |

**Cảnh báo cần theo dõi (không sửa, không khẳng định vô hại):** Xcode báo khoảng 105 cảnh báo vàng, gồm cảnh báo linker về `lib_burst_generated.a` ("no platform load command found"). Agent phân tích tĩnh artifact Windows: `lib_burst_generated.a` có 90 object Mach-O arm64, **0** có platform load command; `baselib.a` 3/3 và `libiPhone-lib.a` 1.809/1.809 object có (`LC_BUILD_VERSION`/`LC_VERSION_MIN_IPHONEOS`). Điều này khớp với cảnh báo và chỉ vào thư viện Burst sinh trên Windows, nhưng **chưa** xác lập nguyên nhân trong Burst, chưa biết project sinh trên Mac có tránh được không, và chưa chứng minh ~104 cảnh báo còn lại vô hại. Build vẫn thành công và app vẫn chạy.

**Timeline dung lượng Mac (giữ nguyên lịch sử, đều USER-REPORTED):** `15Gi` (2026-09-23) → `23 GiB` (2026-09-24) → `14Gi`, capacity 93% (sau build/chạy). Đường Xcode-only đã được dùng (project sinh trên Windows); người dùng không báo cài Unity trên Mac. Số đo này **không** biến storage gate cho việc cài Unity trên Mac thành PASS. Agent không xoá dữ liệu nào trên Mac của người cho mượn.

**Phạm vi/không được suy diễn:** đây là **Non-AR toolchain smoke**. ARKit Scene Reconstruction, LiDAR, quét địa hình thật, GPS và RTK **chưa** kiểm thử; iPhone 11 Pro không có LiDAR Scene Reconstruction và không phải thiết bị kiểm thử LiDAR.

**Trạng thái `8.1b` (chính xác):**

```text
XCODE BUILD (Mac):                      PASS  (USER-REPORTED)
PERSONAL TEAM SIGNING + INSTALL:        PASS  (USER-REPORTED)
RUN >60 s WITHOUT EXIT:                 PASS  (USER-REPORTED)
INDEPENDENT RELAUNCH FROM ICON:         PASS  (USER-REPORTED)
REDACTED EVIDENCE:                      stored outside Git (agent-redacted copy)
LIDAR-DEVICE (iPhone 16 Pro) LAUNCH:    NOT RUN
ARKIT / LIDAR / TERRAIN SCAN / GPS / RTK: NOT RUN
STEP 8.1b COMPLETED:                    NO — chờ Review Manager review, merge, và quyết định về dòng "install/launch trên thiết bị LiDAR thật trước 8.2"
```

Plan ghi điều kiện LiDAR-device là "trước `8.2`"; agent không tự đóng `8.1b` mà để Review Manager quyết định điều kiện này thuộc gate `8.1b` hay là tiền đề riêng của `8.2`. PR #80 giữ DRAFT, chưa merge.

## 32. Hai điểm chờ Review Manager quyết định để đóng `8.1b`: phạm vi iPhone 16 Pro và độ đủ của evidence (2026-09-26)

Chủ dự án đề nghị rà lại cách đóng `8.1b`. Mục này ghi lại hai điểm và cách hiểu được đề xuất; **chưa có quyết định nào của Review Manager**, agent không tự đóng bước và không tự merge PR #80 (giữ DRAFT).

**Điểm 1 — iPhone 16 Pro có chặn merge PR #80 không.** Tài liệu hiện không nhất quán:

- Runbook §6 định nghĩa gate `8.1b` chỉ trên iPhone 11 Pro (bảy gạch đầu dòng); iPhone 16 Pro chỉ xuất hiện ở câu kết như thiết bị bắt buộc riêng cho `8.2`.
- Dòng kế hoạch `8.1b` (cột Output) và §20 điểm 3 ghi "lặp install/launch trên iPhone 16 Pro **trước `8.2`**" ngay trong câu mô tả gate `8.1b`.

Cách hiểu chủ dự án đề xuất: gate chặn merge PR #80 là smoke trên iPhone 11 Pro (runbook §6); install/launch trên iPhone 16 Pro là tiền đề của `8.2` (cùng runtime Scene Reconstruction capability check), **không** chặn merge PR #80. Agent ghi nhận đây là đề xuất; nếu Review Manager xác nhận, plan §20 và dòng `8.1b` cần được sửa cho khớp trong một commit tài liệu riêng (sửa cột gate của step đã duyệt cần quyết định của Review Manager). Cho tới lúc đó, tài liệu giữ nguyên trạng thái "chờ quyết định" và **không** coi iPhone 16 Pro là điều kiện chặn hay là điều kiện đã được miễn.

**Điểm 2 — evidence đã đủ chưa.** Gate §6 yêu cầu "evidence ghi exact Unity/Xcode/macOS/iOS version và source commit", không yêu cầu mọi thông tin nằm trong cùng một ảnh. Record ngoài Git (`MAC_IPHONE_RESULT_RECORD.md`) ghi từng thông tin kèm provenance: Unity `6000.3.23f1` và source `3c12a31` qua khớp SHA-256 artifact Lenovo (AGENT-EXECUTED build, SHA khớp do người dùng báo), Xcode `16.4`/macOS `15.3.1` từ lệnh người dùng đã chạy ở §27, iOS `18.3.1` và model iPhone 11 Pro do người dùng báo. Nhãn "PARTIAL" ở §31 chỉ có nghĩa "không phải mọi thông tin tự kiểm chứng được từ ảnh", không phải kết luận evidence thiếu. Việc evidence đã đủ hay chưa do Review Manager quyết định sau khi xem record và bản ảnh đã che.

**Ảnh có chữ "Build Succeeded":** chủ dự án nhắc từng gửi một ảnh Xcode có chữ này. Trong phiên hiện tại agent chỉ nhận hai ảnh (ảnh cảnh iPhone và ảnh Xcode màn Signing đang Running) — không có ảnh "Build Succeeded" nên không thể dùng hay lưu. Nếu gửi lại để tăng độ chắc: chỉ lưu bản cắt/che kỹ (che tên thiết bị, Team, Apple ID và mọi đường dẫn cá nhân), kiểm tra bằng mắt trước khi lưu, ghi SHA-256; ảnh gốc không lưu vào evidence hay Git.

**Không đổi:** trạng thái các gate ở §31; `8.1b` chưa COMPLETED; ~105 cảnh báo Xcode (gồm `lib_burst_generated.a`) vẫn là mục theo dõi, chưa sửa; đây là smoke không-AR, không chứng minh ARKit/LiDAR/GPS/RTK. PR #80 giữ DRAFT cho tới khi Review Manager review xong.

## 33. Đính chính: iPhone 16 Pro là tiền đề của `8.2`, không chặn PR #80; cách xét evidence `8.1b` (2026-09-26)

**Bản chất quyết định:** chủ dự án chốt cách hiểu dưới đây **để Review Manager kiểm tra**. Đây là quyết định về cách hiểu gate và độ đủ của evidence, **chưa phải phê duyệt merge**. PR #80 giữ DRAFT cho tới khi Review Manager review xong toàn bộ diff. Đây là đính chính tài liệu riêng; không viết lại §20, §31, §32.

**Mâu thuẫn được đính chính (đã nêu ở §32):**

- Runbook §6: gate `8.1b` chỉ trên iPhone 11 Pro; iPhone 16 Pro là thiết bị riêng cho `8.2`.
- Dòng kế hoạch `8.1b` (cột Output: "thêm install/launch trên thiết bị LiDAR thật trước `8.2`") và §20 điểm 3 ("lặp install/launch trên iPhone 16 Pro trước `8.2`") đặt việc đó trong câu gate `8.1b`.
- Dòng `8.2` (cột Target) đã liệt kê "install/launch trên iPhone 16 Pro" và runtime Scene Reconstruction capability check như **tiền đề của `8.2`**, và yêu cầu `8.1b` PASS trước — tức `8.1b` phải đóng được mà không cần iPhone 16 Pro, nếu không tiền đề này thành vòng tròn.

**Cách hiểu chốt:** gate liên quan tới merge PR #80 = smoke trên iPhone 11 Pro theo runbook §6. Install/launch trên iPhone 16 Pro (cùng capability check) là tiền đề trước `8.2`. Trạng thái iPhone 16 Pro vẫn **NOT RUN** (thiết bị chưa có/chưa kiểm chứng vật lý); không được coi là đã đạt và không được coi là đã bị miễn — nó phải xảy ra trước khi bắt đầu `8.2`. Đã đồng bộ: dòng kế hoạch `8.1b` (đính chính có ngày trong cột Output, cột Test gate), runbook §6 và §8.2. §20 giữ nguyên làm lịch sử; §33 này thay thế cách đọc điểm 3 của §20.

**Cách xét evidence (không yêu cầu mọi thông tin trong một ảnh):** exact Unity/Xcode/macOS/iOS version và source commit được xét từ (a) `MAC_IPHONE_RESULT_RECORD.md` ngoài Git, ghi từng mục kèm provenance; (b) checksum ZIP khớp artifact Lenovo build từ `3c12a31` (`be66e489…c3e8`); (c) lệnh người dùng đã chạy (§27: Xcode `16.4`, build `16F6`, macOS `15.3.1`); (d) các ảnh đã che. Nhãn "PARTIAL" ở §31 chỉ nghĩa "không phải mọi thứ tự kiểm chứng được từ ảnh"; độ đủ do Review Manager quyết định.

**Ảnh "Build Succeeded":** chủ dự án chỉ ra ảnh gốc trên Lenovo. Agent xem, thấy ảnh chứa tên thiết bị nhiều chỗ, tên tài khoản người dùng Mac lặp trên nhiều dòng log và đường dẫn Windows của Lenovo trong chuỗi Burst, nên **chỉ giữ hai dải cắt** (thanh công cụ với tên thiết bị bị che, và dòng "Link UnityFramework"), che thêm phần thanh bên, kiểm tra bằng mắt rồi lưu ngoài Git (`xcode-build-succeeded-CROPPED-REDACTED.png`, SHA-256 `7b81f8c1611dfe54d945aa1cc0f48b25cbfa17433a0854d6ccdef2e2589f784d`). Bản cắt cho thấy "Build Succeeded | Today at 15:21", 105 cảnh báo và Link UnityFramework 90 cảnh báo; ngày của "Today" không hiện. Ảnh gốc không được lưu vào evidence, Git hay PR.

**Điều agent đọc được trên ảnh gốc (không lưu):** configuration `ReleaseForRunning`, Xcode SDK `iOS 18.5` (SDK của Xcode, khác iOS 18.3.1 của máy, vốn vẫn là user-reported); thư mục build tên `iOS-ToolchainSmoke-20260924-044748` (trùng tên output Lenovo — hỗ trợ, không tự nó chứng minh ZIP đã SHA-verify là bản được build); linker ghi "no platform load command found … assuming: iOS" cho các object của `lib_burst_generated.a`, bước Link báo 90 cảnh báo — trùng số 90 object của phân tích tĩnh §31 (khớp, chưa chứng minh là cùng các mục). Cảnh báo vẫn là mục theo dõi, chưa chẩn đoán/chưa sửa.

**Không đổi:** `8.1b` chưa COMPLETED; ~105 cảnh báo Xcode chưa được đánh giá là vô hại; đây là smoke không-AR, không chứng minh ARKit/LiDAR/GPS/RTK; PR #80 DRAFT, chưa merge.


## 34. Review Manager xác nhận cách hiểu gate `8.1b` và độ đủ evidence; đồng bộ câu hiện trạng (2026-09-26)

**Xác nhận (chủ dự án chuyển lại kết quả kiểm tra của Review Manager, agent không tự kiểm chứng):** (1) iPhone 16 Pro không chặn PR #80; đúng như §33, đó là tiền đề trước `8.2`. (2) Evidence nhiều nguồn có provenance (record ngoài Git, checksum, lệnh đã báo, ảnh đã che) là đủ cho smoke test `8.1b`.

**Đồng bộ tài liệu:** runbook §8.2 còn một câu hiện trạng nói vẫn chờ "quyết định về điều kiện thiết bị LiDAR thật"; câu đó mâu thuẫn với §6 và §33 nên đã sửa, cùng các cụm "chờ Review Manager kiểm tra" ở runbook §6/§8.2 và dòng kế hoạch `8.1b`. §20, §31, §32, §33 giữ nguyên làm lịch sử; §34 này bổ sung, không thay đổi nội dung các mục trước.

**Không đổi:** iPhone 16 Pro install/launch vẫn **NOT RUN** và phải xảy ra trước `8.2`; `8.1b` **chưa COMPLETED** (chờ Review Manager review cuối + merge PR #80); PR #80 giữ DRAFT, không tự merge; ~105 cảnh báo Xcode (gồm `lib_burst_generated.a`) vẫn là mục theo dõi, chưa sửa, chưa coi là vô hại; đây là smoke không-AR; storage gate cài Unity trên Mac vẫn chưa PASS.

## 35. `WEB-00` — đặc tả tài khoản web và responsive: bản nháp chờ review độc lập (2026-10-09)

**Bản chất mục này:** ghi nhận một thay đổi đặc tả **sau** Baseline v1.0, theo đúng quy tắc "cập nhật tài liệu trước khi code" (`AGENTS.md`, `docs/REQUIREMENT_BASELINE_V1.md` §7). Đây **không** phải phê duyệt: bản đặc tả do agent soạn (vai trò R17 Technical Documentation Writer, phối hợp góc nhìn R22 BA / R02 PM / R20 UX), **chưa** có reviewer độc lập hay Review Manager duyệt, chưa commit/PR/merge. Không mục nào trước §35 bị sửa.

**Lý do thay đổi:** bốn route tài khoản web (`/account/profile`, `/account/privacy`, `/settings`, `/help`) đã có trong menu nhưng chỉ render placeholder (`apps/web/src/App.tsx:26–29` @`430e325`); PRD/SRS chưa có requirement cho chúng; app shell chưa có chế độ thu gọn theo viewport (`apps/web/src/components/layout/Sidebar.tsx:50`); kiểm tra phiên web không xử lý lỗi khác `401` ở tầng UI (`apps/web/src/layouts/AppLayout.tsx:17–27` — suy luận tĩnh, chưa tái hiện runtime). Cần requirement có truy vết trước khi bất kỳ step code nào bắt đầu.

**Nguồn đồng ý đi theo đề xuất:** handoff `WEB-00` của chủ dự án (nằm ngoài Git) nêu hướng triển khai đã được chủ dự án đồng ý: hồ sơ chỉ đọc email từ `/me`; privacy là trang thông tin có gate nội dung riêng; cài đặt chỉ "Theo hệ thống"/"Giảm chuyển động" lưu cục bộ theo `user.id`; trợ giúp theo flow thật; timeout 15 giây chỉ cho kiểm tra phiên; drawer dưới 1024 CSS px. Agent không có biên bản đồng ý nào khác ngoài handoff đó. **Đồng ý hướng ≠ đặc tả cuối đã duyệt ≠ phần mềm đã triển khai/test pass ≠ cam kết quyền riêng tư đã xác minh.**

**Đầu vào và mốc:** gói khảo sát tài khoản web/responsive (09/10/2026, ngoài Git, không là dependency của tài liệu). `origin/develop` = `430e325417f7b73d2e6946b813bb0168bbbf8026`, khớp `git ls-remote` trong phiên. Checkout chính `D:` vẫn ở `develop` cũ `a963562` (behind 16) với thay đổi chưa commit có sẵn ở `apps/mobile/macos/Flutter/GeneratedPluginRegistrant.swift` — **không chạm**. Bản thay đổi được soạn trong worktree riêng, branch `docs/web-account-rwd-baseline` tạo mới từ `430e325`. `apps/web/src`, `apps/backend/src/users`, `apps/backend/src/auth` không khác giữa `a963562` và `430e325` theo gói khảo sát; mọi trích dẫn hiện trạng dùng `430e325`.

**Đính chính đầu vào:** gói khảo sát ghi "`AGENTS.md:7` còn ghi ở D0.4". Điều đó chỉ đúng với checkout cũ `a963562`; tại `430e325`, `AGENTS.md:7` đã ghi Baseline v1.0 ĐẠT. Kết luận của gói không đổi (baseline đạt không mặc nhiên duyệt tính năng tài khoản mới), nhưng câu trích dẫn đó không phản ánh mốc nguồn chính. Các trích dẫn source khác được agent kiểm lại tại `430e325` và khớp.

**Đã thay đổi (docs-only):**

- Mới: `docs/web/WEB_ACCOUNT_RWD_SPEC.md` — hiện trạng có nguồn (WEB-G01…G09, WEB-U01…U10), quyết định WEB-D01…D08, hành vi chi tiết, Privacy Content Gate, ma trận viewport (`WEB-V*`) và route × trạng thái (`WEB-T*`), phương pháp đo, mẫu evidence, traceability requirement → AC → test → micro-step → nguồn, bảng ánh xạ `P-*` → ID chính thức, backlog ngoài phạm vi.
- `docs/PRD.md` §5.2; `docs/SRS.md` §1.15 (19 `FR-WEB*`) + §2.1 (7 `NFR-RWD-*`); `docs/USER_STORIES.md` §5 (US-W-01…06); `docs/ACCEPTANCE_CRITERIA.md` §12 (39 AC); `docs/EDGE_CASES.md` §9; `docs/TEST_STRATEGY.md` §2.12; `docs/ARCHITECTURE.md` (đính chính chữ "CRUD user cơ bản" của `UsersModule` — giữ nguyên câu gốc, thêm ghi chú; thêm ranh giới tài khoản web ở §4); `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` (ghi chú + dòng `WEB-00`…`WEB-13`).
- **Không đổi:** `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md` — đã đọc và xác nhận: `/me` trả `{id, email}` (`API_CONTRACT.md:44–48`), `users` có 4 cột (`DATA_MODEL.md:14–22`); không có mâu thuẫn cần sửa câu chữ, và chuỗi `WEB-*` không thêm API/bảng/cột. FR-RETENTION-02 và AC-RETENTION-01 giữ nguyên, không bị hạ thấp.

**Trạng thái:** `WEB-00` DRAFT chờ review độc lập; `WEB-01`…`WEB-13` NOT STARTED. Mọi actual test trong spec/AC là NOT_RUN; chưa chạy ứng dụng, test suite, trình duyệt hay thiết bị thật cho đặc tả này.

**Privacy dependency (không chặn hồ sơ/trợ giúp/RWD, chỉ chặn `WEB-11`):** nội dung retention GPS và chính sách nhà cung cấp sinh trắc phải qua Privacy Content Gate (BA + kỹ thuật + chủ dự án; reviewer không phải người viết). Cleanup TTL raw GPS chưa từng được implement (`docs/DATA_MODEL.md:266`), nên không được công bố "tự xoá sau 30 ngày". Thiếu sót implementation đó là backlog backend riêng của requirement đã có, không phải phạm vi `WEB-*`. Gate này không được đóng bằng suy luận của tài liệu, và không thay đổi nghĩa vụ/luật áp dụng.

**Quyết định còn mở / chưa xác minh:**

| # | Mục | Trạng thái | Ai quyết |
|---|---|---|---|
| 1 | Review độc lập toàn bộ bản đặc tả `WEB-00` (D01–D08, semantics preference, ngưỡng 15 giây) | Chưa có | Reviewer độc lập / Review Manager + chủ dự án |
| 2 | Ngưỡng timeout 15 giây — quyết định UX mới, chưa đo trên mạng thật | Chờ review; đo lại khi làm `WEB-01` | Chủ dự án + reviewer |
| 3 | Nội dung retention GPS công bố trên trang privacy | OPEN — chờ Privacy Content Gate hoặc dependency retention | BA + kỹ thuật + chủ dự án |
| 4 | Chính sách lưu dữ liệu của nhà cung cấp sinh trắc (MVP vẫn `MockBiometricProvider`, AWS Rekognition là candidate) | OPEN | Kỹ thuật + chủ dự án |
| 5 | Đầu mối xử lý yêu cầu dữ liệu / kênh liên hệ hỗ trợ | OPEN — chưa có kênh được xác nhận; trợ giúp không có contact | Chủ dự án |
| 6 | Key preference chứa `user.id` dạng thô hay dạng băm (định danh còn lại trên trình duyệt dùng chung sau logout) | OPEN — spec chỉ yêu cầu namespace theo `user.id`, không lưu email/token | Reviewer + Security khi duyệt `WEB-12` |
| 7 | Có xoá token khi người dùng chủ động chọn "Về đăng nhập" từ trạng thái lỗi phiên | OPEN — `WEB-01` phải ghi rõ trong PR; không được xoá tự động với lỗi khác `401` | Reviewer `WEB-01` |
| 8 | Cột Skills và người thực hiện của các dòng `WEB-*` | Chưa gán (khảo sát không chỉ định) | Chủ dự án |
| 9 | Breakpoint thật (`sm`/`md`/`lg`) trong bản build trước khi chạy ma trận | Chưa xác nhận | Người làm `WEB-02` |
| 10 | Mục tiêu vùng chạm 44×44 CSS px (lựa chọn UX, không phải yêu cầu WCAG 2.5.8) | Chờ review UX | R20 UX + reviewer |
| 11 | Thu hồi quyền vị trí giữa chuyến (`EDGE_CASES.md` §1) | Vẫn [OPEN]; spec web không quyết định thay | Chủ dự án (vòng đặc tả consent riêng) |
| 12 | Gate thiết bị thật Safari iPhone (`WEB-VH2`) và Android Chrome (`WEB-VH1`) | NOT_RUN — cần thiết bị; không chặn PR không phụ thuộc | QA khi có thiết bị |

**Không thay đổi:** track AR Terrain (`8.x`), Sprint R8 và các dòng plan cũ; không sửa `apps/*`, cấu hình runtime, Flutter hay Unity; không bắt đầu `WEB-01`.

## 36. `WEB-00` — review độc lập vòng 1 CHANGES_REQUESTED; sửa R01–R05, làm rõ N01 (2026-10-09)

**Bản chất mục này:** ghi nhận kết quả review độc lập vòng 1 của bản nháp `WEB-00` (§35) và các sửa đổi tài liệu theo đó. Reviewer là agent điều phối, độc lập với agent viết tài liệu. Báo cáo review nằm ngoài Git. Kết luận vòng 1: **CHANGES_REQUESTED** — 5 finding P2 (R01–R05) và 1 ghi chú làm rõ (N01); không có Critical trong phạm vi review. Đây **không** phải phê duyệt: `WEB-00` vẫn DRAFT, **chờ re-review**, chưa commit/PR/merge; `WEB-01`…`WEB-13` vẫn NOT STARTED. §35 giữ nguyên làm lịch sử; các điểm của §35 bị thay đổi được đính chính ngay dưới đây.

**Người viết đồng ý với cả 5 finding và N01; không phản biện finding nào.** Agent đã kiểm lại bằng chứng của reviewer trên source tại `430e325`. Xử lý từng mục:

- **R01 — thao tác chủ động về đăng nhập.** Chốt quyết định WEB-D09: hệ thống không tự xoá token khi lỗi khác `401` hay khi retry. Nút **"Đăng nhập lại"** là thao tác chủ động: xoá token và user cục bộ, vô hiệu hoá kiểm tra đang chờ, về `/login` với form dùng được; không revoke server, không kết thúc chuyến mobile, không xoá preference. Đã ghi ba phương án và trade-off ở spec §4.1. Phương án "chỉ điều hướng, giữ token" bị loại vì `LoginPage.tsx:17–24` sẽ tự đưa người dùng về dashboard khi token hợp lệ. Thêm AC-WEBSESSION-07 (token hợp lệ/không hợp lệ, mạng phục hồi, Browser Back). Mục 7 trong bảng quyết định mở của §35 được **đóng ở mức đặc tả** bằng WEB-D09, chờ re-review; không còn giao semantics này cho PR `WEB-01`.
- **R02 — kết quả của phiên cũ.** Chốt WEB-D10 (khái niệm "thế hệ phiên"): chỉ kết quả của lần kiểm tra còn hiệu lực — đúng thế hệ và đúng token hiện hành — mới được đổi token, AuthContext, route hay UI, ở mọi tầng. Lý do cần ở mọi tầng: xử lý `401` hiện nằm trong service (`authService.ts:28–33`), còn guard `cancelled` (`AppLayout.tsx:18–25`) chỉ chặn callback component. Thêm AC-WEBSESSION-08 (A chờ → đăng nhập B → A trả `401`/`200`) và AC-WEBSESSION-09 (logout/unmount/timeout/retry). Assertion bắt buộc ở service/storage/context, không chỉ DOM. Đây vẫn là kịch bản cần đặc tả và test, chưa phải lỗi runtime đã tái hiện.
- **R03 — fallback storage.** Tách ba ca thống nhất ở spec §4.4, SRS FR-WEBSETTINGS-04, AC, EDGE_CASES và TEST_STRATEGY:
  - (a) đọc lỗi khi khởi tạo → "Theo hệ thống" (AC-WEBSETTINGS-04, thu hẹp);
  - (b) ghi lỗi/quota sau khi người dùng đã chọn → giữ và áp dụng lựa chọn trong phiên trang (AC-WEBSETTINGS-07, mới);
  - (c) giá trị hỏng/`version` lạ → "Theo hệ thống" (AC-WEBSETTINGS-08, mới).

  Cả ba ca đều tôn trọng OS; không thêm đồng bộ đa tab hay server.
- **R04 — provider sinh trắc.** Thêm WEB-G10 vào hiện trạng của spec. Tách ba lớp ở Privacy Content Gate:
  1. adapter AWS **có trong source** từ R2-6 (`apps/backend/src/biometric/providers/aws-rekognition-biometric.provider.ts:33–46`);
  2. mặc định/fallback theo cấu hình là **mock** (`biometric.module.ts:27–40`);
  3. provider thật của bản phát hành **cần xác nhận**.

  Thêm đính chính có ghi ngày vào `docs/SRS.md` FR-BIOMETRIC-05 và `docs/ARCHITECTURE.md` §9 (bullet biometric provider). Cả hai giữ nguyên câu gốc, **không đổi requirement**. Không đọc cấu hình/secret môi trường, không gọi AWS. **Đính chính §35:** dòng 4 của bảng quyết định mở trong §35 ghi "MVP vẫn `MockBiometricProvider`, AWS Rekognition là candidate". Câu đó lặp lại nhận định lỗi thời của SRS. Cách đọc đúng là ba lớp nêu trên; mục 4 vẫn OPEN cho cấu hình và chính sách thực tế.
- **R05 — hai phạm vi nghiệm thu.** Thêm spec §4.7 và quyết định WEB-D11:
  - **Gate merge Windows** gồm test mục tiêu, regression, lint/test/build và required checks. Không cần Mac/iPhone/Android; chưa đạt thì không merge.
  - **Gate công bố hỗ trợ thiết bị** gồm AC-RWD-11, phần bàn phím ảo thật của AC-RWD-06 và nhóm H (`WEB-VH1`/`WEB-VH2`). Chưa chạy thì ghi NOT_RUN theo từng thiết bị: không tính PASS, không chặn merge, chặn công bố hỗ trợ.

  Đã sửa dòng `WEB-02`, `WEB-03`, `WEB-06`, `WEB-07` và `WEB-13` trong plan. `WEB-13` ghi theo từng phạm vi, không dùng một COMPLETED chung.
- **N01 — mức cô lập preference.** Đã sửa spec §4.4, SRS FR-WEBSETTINGS-03/04, EDGE_CASES và TEST_STRATEGY. Cam kết chỉ là **app không chọn/áp dụng** preference của A cho B. Namespace theo `user.id`, dù raw hay băm, không phải ranh giới quyền truy cập trên cùng browser profile. Chỉ lưu giá trị không nhạy cảm; trên máy dùng chung, lựa chọn và định danh dùng làm key còn lại sau logout. **Làm rõ §35, quyết định mở mục 6:** chọn raw hay băm là quyết định về việc **lưu định danh** trên trình duyệt, không phải biện pháp bảo mật hay kiểm soát truy cập. Mục này vẫn OPEN cho `WEB-12`. Không thêm API hay mã hoá mới.

**Thay đổi số lượng:** AC tăng từ 39 lên 44: thêm AC-WEBSESSION-07/08/09, AC-WEBSETTINGS-07/08; AC-WEBSETTINGS-04 thu hẹp phạm vi. Số FR/NFR giữ nguyên 26. Bảng ánh xạ `P-*` và bảng traceability của spec đã cập nhật tương ứng.

**File sửa ở vòng này:** `docs/web/WEB_ACCOUNT_RWD_SPEC.md`, `docs/SRS.md`, `docs/ACCEPTANCE_CRITERIA.md`, `docs/EDGE_CASES.md`, `docs/TEST_STRATEGY.md`, `docs/ARCHITECTURE.md` (chỉ đính chính R04), `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` và mục §36 này. `API_CONTRACT.md` và `DATA_MODEL.md` vẫn không đổi. Không sửa `apps/*`.

**Vẫn OPEN / NOT_RUN:** re-review độc lập toàn bộ `WEB-00`; ngưỡng 15 giây; Privacy Content Gate (retention, provider thực tế, đầu mối dữ liệu/kênh hỗ trợ); key preference raw hay băm; cột Skills của các dòng WEB; breakpoint thật; mục tiêu 44 px; thu hồi quyền vị trí giữa chuyến; gate thiết bị thật `WEB-VH1`/`WEB-VH2`. Mọi actual test vẫn NOT_RUN.

## 37. `WEB-00` — review độc lập vòng 2 PASS; chờ phê duyệt và merge tài liệu (2026-10-09)

**Kết quả vòng 2:** reviewer độc lập (agent điều phối, không phải agent viết tài liệu) kết luận **PASS phần review kỹ thuật tài liệu**. R01–R05 và N01 của vòng 1 (§36) đã được xử lý; không còn finding chặn `WEB-00` trong phạm vi review. Reviewer đọc trực tiếp file và diff trong worktree, base/HEAD `430e325417f7b73d2e6946b813bb0168bbbf8026`, `git ls-remote` cùng SHA. Báo cáo review nằm ngoài Git.

**Reviewer đã kiểm độc lập:**
- `git diff --check` exit 0;
- 26 FR/NFR và 44 AC, không trùng định nghĩa;
- traceability đủ 44/44 AC và 26/26 requirement;
- 14 dòng `WEB-00`…`WEB-13`;
- chỉ sửa tài liệu, không đụng `apps/*`, `API_CONTRACT.md`, `DATA_MODEL.md`;
- REVIEW_NOTES chỉ bổ sung §35–§36.

**Phạm vi của PASS:** đây là kết quả review bản đặc tả, **không** phải phê duyệt merge, không phải kết quả kiểm thử, và không phải phê duyệt release cho `WEB-01`…`WEB-13`. Mọi actual test vẫn NOT_RUN.

**Cập nhật ở vòng này (chỉ metadata trạng thái):** các nhãn trạng thái hiện tại trong plan, spec, PRD, SRS, USER_STORIES, ACCEPTANCE_CRITERIA, EDGE_CASES, TEST_STRATEGY và ARCHITECTURE đổi từ "DRAFT/chờ (re-)review" sang **"review độc lập PASS; chờ phê duyệt và merge tài liệu"**. Không đổi nội dung requirement, AC, ma trận hay traceability. §35 và §36 giữ nguyên.

**Bước tiếp theo theo quy trình:**
- Review Manager/chủ dự án quyết định phê duyệt và merge nhánh `docs/web-account-rwd-baseline`.
- Khi commit theo quy trình, giữ đúng commit message `docs: define web account and responsive requirements`.
- Không bắt đầu `WEB-01` trước khi gate tài liệu này đóng.

**Vẫn mở — không chặn `WEB-00` theo phạm vi đã chốt:**

| Mục | Thời hạn chốt/đo |
|---|---|
| Ngưỡng timeout 15 giây | Đo khi làm `WEB-01` |
| Privacy Content Gate: retention, provider thực tế, đầu mối dữ liệu/kênh hỗ trợ | Trước `WEB-11` |
| Key preference raw hay băm | Chọn trước `WEB-12` |
| Gate thiết bị thật Safari iPhone/Android Chrome | Trước khi công bố hỗ trợ hai môi trường đó |
| Cột Skills của các dòng WEB | Chưa chốt |
| Breakpoint thật | Chưa xác nhận |
| Mục tiêu vùng chạm 44 px | Chưa chốt |
| Thu hồi quyền vị trí giữa chuyến (`EDGE_CASES.md` §1) | Vẫn [OPEN] |

## 38. `WEB-00` — Review Manager phê duyệt tài liệu; chờ PR checks và merge (2026-10-10)

**Quyết định:** **APPROVED** cho bản đặc tả `WEB-00` (tài khoản web và responsive), trên cơ sở review độc lập vòng 2 PASS (§37). Đây là phê duyệt **tài liệu**. Nó không phải kết quả kiểm thử, không phải phê duyệt release, và không cho phép bắt đầu `WEB-01` trước khi PR tài liệu qua checks và được merge.

**Provenance — ghi rõ để không bị hiểu là review độc lập thêm một lần:** chủ dự án giao vai Review Manager cho chính agent đã viết tài liệu `WEB-00` và yêu cầu "nếu đạt thì phê duyệt". Vì vậy bước này **không độc lập** với người viết. Review độc lập duy nhất của `WEB-00` là hai vòng của agent điều phối (§36 vòng 1, §37 vòng 2). Phê duyệt này dựa trên kết quả của các vòng đó cộng với phép kiểm tra lại bên dưới. Nếu quy trình yêu cầu người phê duyệt khác người viết, chủ dự án cần xác nhận lại trên PR trước khi merge.

**Đã kiểm tra lại trực tiếp trong worktree trước khi phê duyệt:**

- Branch `docs/web-account-rwd-baseline` tại `430e325`; `origin/develop` vẫn là `430e325417f7b73d2e6946b813bb0168bbbf8026` (khớp `git ls-remote`).
- Chỉ tài liệu thay đổi. Không có file `apps/*`, cấu hình runtime, `docs/API_CONTRACT.md` hay `docs/DATA_MODEL.md` nào bị sửa.
- `docs/REVIEW_NOTES.md` không xoá dòng nào so với bản đã commit (502 dòng). §35–§36 trùng khớp bản đã review; §37 và mục này chỉ được nối thêm.
- 26 FR/NFR, 44 AC, 6 US, không trùng ID; traceability đủ 44/44 AC và 26/26 requirement; link, đường dẫn và bảng Markdown hợp lệ; `git diff --check` exit 0.
- `WEB-01`…`WEB-13` đều NOT STARTED (`WEB-11` kèm "chờ Privacy Content Gate").
- 30/30 ô Actual của ma trận `WEB-V*`/`WEB-T*` là NOT_RUN; evidence record chưa có dòng nào. Không có kết quả test phần mềm hay thiết bị nào được ghi PASS.
- Các vị trí mà báo cáo review vòng 2 trích dẫn vẫn đúng nội dung.

**Cập nhật kèm theo (chỉ metadata trạng thái):** nhãn hiện tại trong plan, spec, PRD, SRS, USER_STORIES, ACCEPTANCE_CRITERIA, EDGE_CASES, TEST_STRATEGY và ARCHITECTURE đổi thành "review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu". Ô Step của dòng `WEB-00` trong plan đổi thành "✅ APPROVED — chờ PR checks và merge tài liệu".

**Bước tiếp theo:**

- Commit với đúng message `docs: define web account and responsive requirements`.
- Push nhánh, tạo PR tài liệu vào `develop`, chạy required checks.
- **Chưa merge** cho tới khi PR và checks được kiểm tra.
- Không bắt đầu `WEB-01` trước khi merge.

**Vẫn mở (không đổi so với §37):** ngưỡng timeout 15 giây (đo ở `WEB-01`); Privacy Content Gate (trước `WEB-11`); key preference raw hay băm (trước `WEB-12`); gate thiết bị thật Safari iPhone/Android Chrome; cột Skills; breakpoint thật; mục tiêu 44 px; thu hồi quyền vị trí giữa chuyến.

## 39. Đóng trạng thái `8.1b` sau merge PR #80; `8.2` còn chặn bởi thiết bị (2026-09-27)

**Bằng chứng mới sau §34:** GitHub xác nhận PR #80 đã merge vào `develop` ngày 2026-09-26 (merge commit `3f6e5e6860682d44a6bd5d384037f3237df05956`). §34 đã ghi Review Manager xác nhận gate iPhone 11 Pro và evidence nhiều nguồn đủ cho smoke. Vì điều kiện review/merge cuối đã đạt, `8.1b` nay **COMPLETED**; `8.1a` trước đó đã COMPLETED, nên nhóm `8.1` toolchain smoke hoàn tất. Các câu “chưa merge/chưa completed” ở §20/§31–§34 giữ nguyên làm lịch sử tại thời điểm viết, không còn là trạng thái hiện hành.

**Giới hạn không đổi:** Mac/iPhone test là USER-EXECUTED/USER-REPORTED, không phải agent tự chạy; bản ảnh Xcode đã che và ảnh iPhone không chứa thông tin cá nhân được lưu ngoài Git, không chép ảnh Xcode gốc vào evidence/Git. Xcode có khoảng 105 cảnh báo, gồm `lib_burst_generated.a` “no platform load command”; chưa chẩn đoán hết, chưa tuyên bố vô hại. Dung lượng Data volume `14Gi`/93% sau build (USER-REPORTED) không chứng minh sẵn sàng cài Unity Editor/iOS Build Support trên Mac. Smoke không-AR không chứng minh ARKit, LiDAR, GPS hoặc RTK.

**Tiền đề `8.2` vẫn NOT RUN/BLOCKED:** cần iPhone 16 Pro vật lý, cài và khởi chạy smoke trên chính máy đó, sau đó runtime Scene Reconstruction capability check; triển khai/kiểm chứng mesh LiDAR thật chỉ bắt đầu khi các tiền đề này đạt. Không thay thế bằng iPhone 11 Pro, Unity Editor hoặc fixture Drive Visual Mock. Tài liệu hiện trạng được đồng bộ ở micro-step plan, iOS runbook, thesis baseline và open-items; không sửa source Unity hoặc `apps/*`.

## 40. `WEB-01` — xử lý lỗi/timeout kiểm tra phiên web: đã triển khai, chờ review độc lập (2026-10-11)

**Trạng thái: READY FOR INDEPENDENT REVIEW.** Đây là ghi chép của người triển khai (vai trò R06 Frontend Engineer), **không** phải phê duyệt. Code Review/QA và Security độc lập chưa chạy; chưa merge; `WEB-02`…`WEB-13` vẫn NOT STARTED. Không mục nào trước §40 bị sửa.

**Mốc:** base `origin/develop` = `3cf62b2d184a8783d604e58385573cbd354aeedd` (khớp `git ls-remote` lúc bắt đầu; `WEB-00` đã merge qua PR #87). Branch `fix/web-session-check-recovery`, worktree riêng. Checkout chính và thay đổi Flutter có sẵn ở đó không bị chạm.

### 40.1. Nguyên nhân — đã tái hiện, không còn là suy luận tĩnh

Dòng nguồn dưới đây là tại base `3cf62b2`.

- `apps/web/src/layouts/AppLayout.tsx:17–27` và `apps/web/src/pages/LoginPage.tsx:17–24` gọi `fetchCurrentUser().then(...)` không có nhánh lỗi. `apps/web/src/services/authService.ts:24–37` ném tiếp mọi lỗi khác `401`. `apps/web/src/lib/apiClient.ts:21–41` không có timeout.
- `authService.ts:31–33` xoá token vô điều kiện khi `401`, bất kể token trong storage lúc đó còn là token mà request đã gửi đi hay không.

**Tái hiện trước khi sửa** (Chromium 149.0.7827.55, Playwright 1.61.1, 1280×720, fixture UI cho `/auth/me`, code production chưa đổi):

| Kịch bản | Kết quả quan sát trước sửa |
|---|---|
| Có token, `/auth/me` lỗi mạng, mở `/dashboard` | Sau 4 giây vẫn ở "Đang kiểm tra phiên đăng nhập...", 0 nút, token còn; `pageerror`: `TypeError: Failed to fetch` |
| Có token, `/auth/me` trả `500`, mở `/dashboard` | Như trên; `pageerror`: `ApiError` |
| Cùng hai lỗi, mở `/login` | Form vẫn gõ được, nhưng có unhandled rejection (`pageerror`) |
| Token A, `/auth/me` của A đang chờ → đăng nhập B → A trả `401` | Token B bị xoá (`sessionStorage` = `null`) |

Dự đoán WEB-G05 đúng. Thêm một lỗi thật mà gói khảo sát chỉ nêu ở mức rủi ro (R02 của review `WEB-00`): `401` muộn của phiên cũ xoá token của phiên mới.

### 40.2. Thiết kế

- **Một nơi giữ trạng thái phiên:** `apps/web/src/services/authSession.ts`, không phụ thuộc React. Bốn trạng thái `checking`/`authenticated`/`unauthenticated`/`error`, kèm lý do lỗi (`network`/`timeout`/`server`/`forbidden`/`rate_limited`). `AuthProvider` đọc `user` từ đây qua `useSyncExternalStore`; `setUser` bị bỏ, nên một trang không còn tự đặt user thay cho một lần kiểm tra đã mất hiệu lực.
- **Thế hệ phiên (WEB-D10):** biến `generation` (`authSession.ts:53`). `supersede()` (`:61`) tăng thế hệ, huỷ timer và `abort()` request. Nó được gọi khi: bắt đầu kiểm tra mới, đăng nhập thành công, logout/"Đăng nhập lại", timeout, và khi trang đã khởi động kiểm tra bị unmount. Kết quả chỉ được áp dụng khi thế hệ lúc bắt đầu vẫn là thế hệ hiện tại.
- **Bảo vệ ở tầng service:** `fetchCurrentUser` (`authService.ts:51–72`) so token trong storage với token đã gửi, cộng điều kiện của người gọi (`:55`). Kết quả mất hiệu lực không trả user, không xoá token; nó ném `StaleSessionCheckError` (`:20`) và store bỏ qua. Lớp này độc lập với lớp thế hệ ở store.
- **Timeout 15 giây chỉ cho kiểm tra phiên:** `SESSION_CHECK_TIMEOUT_MS = 15_000` (`authSession.ts:24`), timer ở `:107`. `apiClient.get` chỉ nhận thêm `signal` tuỳ chọn (`apiClient.ts:57`); không có timeout chung, các API khác không đổi.
- **Retry:** `retrySessionCheck()` (`:150`) bị bỏ qua khi đang có kiểm tra chạy. Trạng thái bận là màn "Đang kiểm tra phiên đăng nhập..."; nút biến mất nên không bấm lặp được. Sau `429` không có retry tự động.
- **"Đăng nhập lại" và logout:** `endLocalSession()` (`:168`) — supersede, xoá token, đặt `unauthenticated`. Không gọi server, không đụng `localStorage`.
- **Guard:** `useSessionCheck` (`apps/web/src/services/useSessionCheck.ts`) kiểm tra mỗi lần trang mount và coi trạng thái do trang trước để lại là `checking` cho tới khi lần kiểm tra của chính nó bắt đầu. `AppLayout` giữ nguyên URL khi lỗi, nên retry thành công vào đúng route đã yêu cầu.

### 40.3. AC → test → kết quả

Lệnh: **U** = `pnpm --filter @novaway/web test` (Vitest 4.1.10, Node 24.17.0). **F** = `npx playwright test e2e/session-check.fixture.spec.ts` (fixture UI). **R** = `npx playwright test e2e/session-auth-regression.spec.ts` (backend thật). Tất cả chạy local ngày 2026-10-11.

| AC | Tầng service/storage/state (`src/services/authSession.spec.ts`, `authService.spec.ts`) | Trình duyệt | Kết quả local |
|---|---|---|---|
| AC-WEBSESSION-01 | "AC-WEBSESSION-01 — no token, 200, 401" (3 ca) | F: 3 ca cùng tên; R: token bị backend thật từ chối | PASS |
| AC-WEBSESSION-02 | "failures other than 401 keep the token" (500/403/429/mạng, không tự retry sau 429); `authService.spec` giữ token với 500 và lỗi mạng (có từ trước, không đổi) | F: regression mạng/500; 403 và 429 có thông báo riêng, không nhắc mật khẩu | PASS |
| AC-WEBSESSION-03 | "15 second timeout": ngưỡng 15 000; còn `checking` ở 14 999 ms, timeout ở 15 000 ms; request bị abort; 4 loại response muộn bị bỏ qua; không còn timer; API khác không có timeout/signal | F: request treo, 14 giây vẫn chờ, 15 giây ra lỗi, `401` muộn không đổi gì | PASS |
| AC-WEBSESSION-04 | "retry": thành công, thất bại lại, bấm lặp chỉ một request, bị bỏ qua khi đang chạy | F: retry vào đúng route; retry thất bại; double-click chỉ một request | PASS |
| AC-WEBSESSION-05 | — (hành vi của trang) | F: `/login` không có `pageerror`, form dùng được; đăng nhập qua form thay token cũ; retry; "Đăng nhập lại" tại chỗ; sai mật khẩu báo ở form, không phải lỗi phiên | PASS |
| AC-WEBSESSION-06 | "sign in, sign out, sign in as someone else" | R: đăng nhập A → điều hướng → reload → logout → Back → đăng nhập B → Back | PASS |
| AC-WEBSESSION-07 | "the explicit Đăng nhập lại action": xoá token và user, không request nào khác, `localStorage` nguyên; không kiểm tra lại phiên cũ; retry đang chờ bị vô hiệu với 200/401/500 muộn | F: token cũ còn hợp lệ + Back; token cũ không hợp lệ + đăng nhập người khác; mạng phục hồi ngay sau khi bấm | PASS |
| AC-WEBSESSION-08 | "session A is still being checked when B signs in": 401/200/500/lỗi mạng muộn của A; hai thứ tự đến cùng tick; đăng nhập sai không làm hỏng kiểm tra đang chờ. `authService.spec`: 401 muộn của A không xoá token B, 200 muộn không trả user A | F: A trả 401/200/500 sau khi B đăng nhập — token, email hiển thị, URL của B giữ nguyên | PASS |
| AC-WEBSESSION-09 | "an old answer after logout, unmount, timeout or a newer check": 4 loại response × 4 tình huống; handle cũ không huỷ kiểm tra mới | F: kiểm tra đã timeout trả 401/200/500 sau khi retry bắt đầu | PASS |

Tổng: Vitest 92/92 (trước là 31; thêm 61). Playwright 31/31: 26 fixture UI, 5 backend thật (2 mới, golden path, 2 ca 404).

**Độ nhạy của test** — đã kiểm bằng cách tạm phá từng lớp rồi khôi phục:

| Lớp bị phá | Test Vitest fail |
|---|---|
| So sánh token ở service | 12+ |
| Kiểm thế hệ ở store | 12+ |
| `supersede` khi timeout | 8 |
| Chặn retry trùng | 2 |
| `supersede` khi đăng nhập | 1 (lớp service vẫn che) |

### 40.4. Lệnh và kết quả

| Lệnh | Kết quả |
|---|---|
| `pnpm install --frozen-lockfile` | Xong; lockfile không đổi |
| `pnpm --filter @novaway/shared-types build` | Prerequisite trước test, exit 0 |
| `npm run lint` | exit 0; 2 warning `only-export-components` có từ trước |
| `npm run build` | exit 0 |
| `npm run test` | exit 0; web 92/92, backend 174/174 |
| `npx playwright test` (toàn bộ, backend thật đang chạy) | 31/31 pass |

Backend thật dựng local từ chính nhánh này: Postgres/PostGIS trong container của dự án, một database tạm riêng (đã xoá sau khi chạy), biến môi trường kiểu CI, `BIOMETRIC_PROVIDER=mock`. Không đọc `.env` của checkout chính, không đụng database dev, không gọi dịch vụ trả phí.

### 40.5. NOT_RUN và giới hạn

- **CI của PR:** chưa có kết quả tại thời điểm viết; không ghi local PASS thay cho CI.
- **Ma trận viewport `WEB-V*`/`WEB-T*`:** vẫn NOT_RUN. Các test trên chỉ chạy Desktop Chrome 1280×720. Firefox, WebKit, zoom và thiết bị thật không thuộc `WEB-01`.
- **Ngưỡng 15 giây:** đã kiểm đúng biên bằng fake timer và đồng hồ giả trên trình duyệt. Chưa đo trên mạng chậm thật, nên chưa có số liệu để nói ngưỡng này hợp lý với người dùng.
- **Test trình duyệt AC-08 không tự chứng minh lớp bảo vệ ở service:** trong trình duyệt thật, request của A bị `abort` ngay khi B đăng nhập, nên response muộn không tới được service. Test đó fail trên code trước sửa nhưng vẫn pass khi chỉ phá lớp service. Lớp service được chứng minh bằng Vitest với `fetch` cố ý bỏ qua abort.
- **Logout hoặc unmount khi còn kiểm tra đang chờ:** không tới được qua UI (guard chỉ kiểm tra lúc mount; mục logout chỉ có sau khi kiểm tra xong). Hai ca này chỉ được test ở tầng store.
- **Component test bằng DOM giả:** không có. `apps/web` không có jsdom/testing-library và `WEB-01` không thêm dependency; phần UI được test bằng Playwright.

### 40.6. Rủi ro và điểm cần reviewer quyết

1. **Rate limit khi chạy E2E:** backend giới hạn đăng ký/đăng nhập 5 lần/phút/IP. Một lượt E2E đầy đủ giờ dùng 4 lần đăng ký (trước là 2). Chạy hai lượt trong cùng một phút thì 3 test backend thật fail vì `429` (đã quan sát local); chạy lại sau một phút thì pass. Trong CI còn biên 1 lần cho retry. Nếu reviewer muốn rộng hơn, cần bàn riêng — không nới rate limit trong `WEB-01`.
2. **Kết quả đăng nhập luôn được áp dụng:** `signIn` không có kiểm tra thế hệ riêng. Spec không yêu cầu, và UI khoá nút khi đang gửi nên không có hai lần đăng nhập song song.
3. **"Đăng nhập lại" trên `/login`:** spec §4.1 ghi cả hai nút cho trạng thái lỗi nên thông báo ở `/login` cũng có nút này; ở đó nó bỏ phiên cũ tại chỗ và giữ nguyên form.
4. **Trạng thái bận của retry** là màn chờ toàn trang, không phải nút "đang thử" trên thẻ lỗi. Đáp ứng AC-WEBSESSION-04 nhưng là lựa chọn UI.
5. **Một assertion có sẵn đã đổi:** `authService.spec.ts` kiểm chữ ký lời gọi `apiClient.get`, nay có thêm tham số `{ signal }`. Các test giữ token với `500`/lỗi mạng không đổi.
6. **Security cần xem:** thứ tự xử lý khi response của A và đăng nhập của B tới cùng tick (`authSession.spec` "arrive in the same tick"), và việc `endLocalSession` không thu hồi token trên server (đúng spec — không có endpoint revoke).

**Không đổi:** backend, API, schema, Flutter, Unity, nơi lưu token, dependency, lockfile, CI. Actual của `WEB-02`…`WEB-13` vẫn NOT_RUN.

## 41. `WEB-01` — review độc lập vòng 1 CHANGES_REQUESTED; sửa R01, R02; đính chính §40 (2026-10-11)

**Trạng thái: READY FOR INDEPENDENT RE-REVIEW.** Ghi chép của người triển khai (R06 Frontend Engineer), **không** phải phê duyệt. `WEB-01` chưa PASS, chưa merge; PR #88 vẫn Draft. §40 giữ nguyên làm lịch sử; các điểm sai của §40 được đính chính ở §41.3 thay vì sửa hồi tố.

**Review vòng 1:** do agent điều phối thực hiện (không phải agent viết `WEB-01`), tại head `34daf0ddd93b11fbfddd1eebcce640f7d8542643`, base `3cf62b2d184a8783d604e58385573cbd354aeedd`. Kết luận **CHANGES_REQUESTED**: hai finding P2 (R01, R02) và hai ghi chú (N01, N02). Báo cáo review nằm ngoài Git. Người triển khai đồng ý cả hai finding.

### 41.1. Finding → nguyên nhân → cách sửa

Dòng nguồn là tại commit sửa của vòng này.

**R01 — cleanup của hook không huỷ retry.**

- *Nguyên nhân:* hook giữ handle của lần kiểm tra đầu (`useSessionCheck.ts` tại `34daf0d`, dòng 21–24). Retry tạo thế hệ mới, nên `cancelSessionCheck(handle)` không còn khớp và không huỷ gì.
- *Cách sửa:* tách **quyền sở hữu của mount** khỏi **thế hệ của request**.
  - `apps/web/src/services/authSession.ts:67` thêm `owner`.
  - `startSessionCheck(owner)` (`:156`) gán owner.
  - `retrySessionCheck()` (`:174`) chạy cho owner hiện tại.
  - `releaseSessionCheck(owner)` (`:165–169`) huỷ lần kiểm tra đang chạy, kể cả retry, cùng timer — nhưng chỉ khi người gọi vẫn là owner (`:166`).
  - Hook tạo owner bằng `Symbol` ngay trong effect (`apps/web/src/services/useSessionCheck.ts:28–31`), nên mỗi lần effect chạy (StrictMode chạy hai lần) là một owner riêng.
  - API cũ `cancelSessionCheck`/`SessionCheckHandle` đã bỏ.
- *Không đổi:* kiểm tra thế hệ ở store và so sánh token ở service vẫn nguyên. Bản sửa không dựa vào `abort()` để bỏ qua kết quả cũ.

**R02 — `/login` không có trạng thái đang retry.**

- *Nguyên nhân:* thông báo chỉ render khi `error`; khi retry chuyển sang `checking` thì không còn gì thay thế.
- *Cách sửa:*
  - Snapshot thêm `retrying` (`authSession.ts:38`), chỉ đúng trong lúc lần kiểm tra do "Thử lại" khởi động đang chạy.
  - `SessionCheckProgress` (`apps/web/src/components/auth/SessionCheckError.tsx:84–96`) có `role="status"`, `aria-busy="true"`, chữ "Đang kiểm tra lại phiên đăng nhập trước đó...".
  - `apps/web/src/pages/LoginPage.tsx:59` hiển thị nó cạnh form.
  - Form vẫn dùng được; không dùng loader toàn trang trên `/login`. Trong lúc bận không có nút "Thử lại", nên không bấm lặp được.

### 41.2. Regression: fail trước sửa, pass sau sửa

Regression được viết trước khi sửa và chạy trên production code của `34daf0d`.

| Test | Loại | Trước sửa (`34daf0d`) | Sau sửa |
|---|---|---|---|
| `apps/web/e2e/session-check.hook.spec.ts` — 12 ca | Hook thật + store + service + apiClient thật, mount/unmount thật qua `e2e/harness/sessionCheckHarness.tsx`. Chỉ transport là fixture deferred, cố ý bỏ qua abort | 8 fail, 4 pass | 12/12 pass |
| `apps/web/e2e/session-check.fixture.spec.ts` — "retry on /login shows a busy state" (2 ca) | Trang `/login` thật, fixture UI cho API | 2 fail (không có `role="status"`) | 2/2 pass |
| `apps/web/src/services/authSession.spec.ts` — 8 ca ownership mới | Store + service thật, `fetch` stub | Không áp dụng (API owner chưa tồn tại) | 8/8 pass |

Chi tiết các ca hook:

- **8 ca fail trước sửa:** thất bại → retry → unmount với 4 loại response muộn; timeout → retry → unmount; nhiều lần retry → unmount; 2 ca StrictMode. Triệu chứng: request retry không bị abort; `401` muộn xoá token; `200` muộn đặt user; store phát thêm notification (3 → 4). Khớp với kết quả probe của reviewer.
- **4 ca pass cả trước và sau:** unmount khi chưa retry, và 3 ca mount mới tiếp quản. Các ca này vốn đúng; chúng tồn tại để chặn cách sửa sai kiểu "huỷ mọi request đang chạy".

Kiểm độ nhạy: tạm bỏ điều kiện owner ở `releaseSessionCheck` → 2 ca Vitest và 2 ca hook trên trình duyệt fail (mount cũ huỷ nhầm request của mount mới). Đã khôi phục.

### 41.3. Đính chính §40

| §40 đã ghi | Đính chính |
|---|---|
| §40.5: unmount khi còn kiểm tra đang chờ "chỉ được test ở tầng store" | Test store của §40 huỷ bằng handle store vừa trả, nên không mô hình hoá handle mà hook giữ sau retry — vì vậy không bắt được R01. Nay có test mount hook thật (`session-check.hook.spec.ts`). Logout khi còn kiểm tra đang chờ vẫn chỉ test ở store. |
| §40.6 mục 4: trạng thái bận của retry là màn chờ toàn trang | Chỉ đúng với `AppLayout`. Trên `/login` lúc đó không có trạng thái bận nào (R02); nay là dòng trạng thái cạnh form. |
| §40.6 mục 1: trong CI "còn biên 1 lần cho retry" | Sai với test đăng ký hai tài khoản — xem N01 ở §41.4. |
| §40.6 mục 2: UI khoá nút khi đang gửi nên không có đăng nhập song song | Chưa đủ: nút "Đăng nhập lại" trên notice không bị khoá cùng nút submit — xem N02 ở §41.4. |
| §40.3: Vitest 92/92, Playwright 31/31 | Là số của head `34daf0d`. Số của vòng này ở §41.5. |

### 41.4. Ghi chú N01, N02 — không đổi hành vi

**N01 — biên rate limit.** Backend giới hạn đăng ký và đăng nhập 5 lần/phút/IP.

- Một lượt E2E đầy đủ dùng 4 lần đăng ký và 4 lần đăng nhập qua UI: `not-found.spec.ts` 1, `golden-path.spec.ts` 1, `session-auth-regression.spec.ts` 2.
- "Còn biên 1" chỉ đủ cho một **request** thêm, tức đủ để retry một test đăng ký một tài khoản.
- Retry cả **test** `session-auth-regression` cần thêm 2 lần đăng ký và 2 lần đăng nhập, thành 6 trong cùng cửa sổ. Lần retry đó sẽ tự gặp `429`, nên retry của CI không cứu được test này nếu nó fail lần đầu.
- Người triển khai chưa thấy CI fail vì lý do này. Không nới rate limit backend, không sửa CI, không thêm retry/sleep để che `429` trong `WEB-01`. Đây là điểm OPEN cho reviewer/chủ dự án.

**N02 — POST login đang chờ rồi "Đăng nhập lại".** Phép thử tạm (không commit) ở tầng store cho kết quả:

- Sau `endLocalSession()`: token `null`, trạng thái `unauthenticated`.
- Request POST login không có abort signal.
- Khi POST trả `200`: token mới được ghi, trạng thái `authenticated` với tài khoản vừa gửi.

Tức "Đăng nhập lại" bỏ phiên cũ nhưng không huỷ lần đăng nhập đang gửi. Spec §4.1 chỉ quy định vô hiệu hoá `GET /api/auth/me`, chưa chốt chính sách cho POST login, nên `WEB-01` **không** đổi hành vi này. Ba lựa chọn để chủ dự án quyết:

| Lựa chọn | Hệ quả |
|---|---|
| (a) Giữ nguyên | Người dùng vừa gửi form thì kết quả là đăng nhập bằng tài khoản đó. Đơn giản, nhưng nút "Đăng nhập lại" không có nghĩa "dừng mọi thứ". |
| (b) Khoá "Thử lại"/"Đăng nhập lại" trong lúc đang gửi form | Chỉ đổi UI. Loại hẳn tình huống này, nhưng người dùng phải chờ POST xong. |
| (c) "Đăng nhập lại" huỷ cả POST login | Cần truyền signal cho POST và thêm quy tắc thế hệ cho đăng nhập. Phải cập nhật và duyệt spec trước. |

### 41.5. Evidence của vòng này — theo nguồn

Chạy local ngày 2026-10-11 trên cây làm việc của commit sửa vòng này.

| Kiểm tra | Người chạy | Loại | Kết quả |
|---|---|---|---|
| `npm run lint` | Người triển khai | — | exit 0; 2 warning có từ trước (không tăng) |
| `npm run build` | Người triển khai | — | exit 0 |
| `npm run test` | Người triển khai | Vitest + Jest | exit 0; web 100/100 (trước 92; +8), backend 174/174 |
| `session-check.hook.spec.ts` | Người triển khai | Hook thật, transport fixture | 12/12 |
| `session-check.fixture.spec.ts` | Người triển khai | Fixture UI | 28/28 (trước 26; +2) |
| `session-auth-regression.spec.ts`, golden path, 404 | Người triển khai | **Backend thật** (local, database test cô lập, đã xoá) | 5/5 |
| Toàn bộ `npx playwright test` | Người triển khai | Gộp ba nhóm trên | 45/45, một lượt |
| Xem `/login` khi retry đang chờ, lỗi mạng thật | Người triển khai | Thủ công trên trình duyệt | Có `role="status"`, `aria-busy="true"`; form dùng được; token còn |
| Probe R01/R02 tại `34daf0d` | **Reviewer** | Hook thật / `/login` thật, fixture | Tái hiện defect (theo báo cáo review) |
| 26 fixture tại `34daf0d`, Chrome 154 | **Reviewer** | Fixture UI | 26/26 (theo báo cáo review) |
| Required checks tại `34daf0d` | **Reviewer đọc từ GitHub** | CI | PASS (theo báo cáo review) |

**NOT_RUN:**

- CI tại head mới — chưa có kết quả khi viết mục này.
- Ma trận viewport `WEB-V*`/`WEB-T*`, Firefox/WebKit, thiết bị thật.
- Mạng chậm thật cho ngưỡng 15 giây.
- Hook harness trên site đã deploy — spec tự bỏ qua khi `E2E_WEB_BASE_URL` được đặt, vì harness cần Vite dev server.
- Re-review độc lập ở head mới.

**Không đổi:** backend, API, schema, Flutter, Unity, dependency, lockfile, CI, nơi lưu token. `WEB-02`…`WEB-13` vẫn NOT STARTED.

## 42. `WEB-01` — re-review vòng 2 CHANGES_REQUESTED; sửa R03 (test không chờ unmount/cleanup); đính chính §41 (2026-10-11)

**Trạng thái: READY FOR INDEPENDENT RE-REVIEW.** Ghi chép của người triển khai (R06 Frontend Engineer), **không** phải phê duyệt. `WEB-01` chưa PASS, chưa merge; PR #88 vẫn Draft. §40–§41 giữ nguyên; điểm sai của §41 được đính chính ở §42.5.

**Re-review vòng 2:** do agent điều phối thực hiện tại head `43f10f0e8bf22cf1e17b9d2145be3058cfd9908b`. Kết luận:

- R01 và R02 ở code sản phẩm **đã sửa đúng**.
- Còn **R03 (P2)** về regression test, nên quyết định là **CHANGES_REQUESTED**.

Người triển khai đồng ý với R03. Vòng này **không đổi code sản phẩm**; owner/generation giữ nguyên.

### 42.1. R03 — nguyên nhân

`mount()` của harness chỉ gọi `root.render(...)` rồi trả về. `root.render` chỉ lên lịch công việc. Khi nó trả về:

- React chưa gỡ trang cũ khỏi DOM;
- React chưa chạy cleanup của effect.

Cleanup của `useEffect` lại chạy ở một lượt sau lượt gỡ DOM, nên "phần tử đã biến mất" cũng chưa có nghĩa "cleanup đã chạy". Test vì thế có thể đọc trạng thái hoặc trả response trong lúc trang vẫn đang mount. Đó không phải tình huống "sau unmount" mà tên test nêu.

Bằng chứng trực tiếp của người triển khai (phép thử tạm, không commit): ngay trong cùng lời gọi, sau khi `mount([])` trả về, probe **vẫn còn trong DOM** và request **chưa abort** — 2/2 lần.

Hệ quả có hai chiều:

- **Fail giả:** các ca "unmount → response muộn" đọc `aborted=false` trước khi cleanup chạy.
- **Pass giả:** các ca "mount cũ dọn dẹp không huỷ request của mount mới" đọc `aborted=false` có thể đúng chỉ vì cleanup *chưa chạy*, không phải vì cleanup làm đúng.

### 42.2. Cách sửa — chỉ test và harness

| Vị trí | Thay đổi |
|---|---|
| `apps/web/e2e/harness/sessionCheckHarness.tsx:66–86` | Hàng rào vòng đời. Mỗi probe đăng ký qua effect riêng (`:92–99`), được React dựng và gỡ cùng lượt với effect của `useSessionCheck`. `whenSettled()` resolve khi tập probe đang sống đúng bằng tập được yêu cầu. Phép so sánh chạy trong microtask, tức sau khi React xong cả lượt đồng bộ (kể cả StrictMode mount → cleanup → mount), nên không phụ thuộc thứ tự hai effect. Không dùng timer vì test chạy với đồng hồ giả. |
| `sessionCheckHarness.tsx:120–125` | `mount()` trả về chính hàng rào đó. |
| `sessionCheckHarness.tsx:137` | `state()` thêm `live`: các probe có effect đang dựng, không chỉ là có mặt trong DOM. |
| `apps/web/e2e/session-check.hook.spec.ts:67–70` | `mountProbes()` chờ hàng rào rồi kiểm số probe trong DOM. Cả 10 lần mount/unmount trong file đều đi qua helper này; không còn lời gọi `mount` trần. |
| `session-check.hook.spec.ts:91–100` | `expectNothingChangesAfterUnmount` tự chờ hàng rào và assert `live` rỗng **trước** khi đọc trạng thái và **trước** khi trả response muộn. Caller không thể bỏ qua. |
| `session-check.hook.spec.ts:215–218, 240–243, 265–268` | Các ca mount mới tiếp quản assert `live` trước khi đọc `aborted`, để "không bị abort" nói về việc cleanup đã làm gì. |

Không tăng sleep, không tăng retry, không skip, không bỏ assertion nào. Assertion abort/token/user/snapshot/notification/timer giữ nguyên; transport vẫn bỏ qua abort; test vẫn mount hook thật.

### 42.3. Kết quả lặp, không retry

Hai trình duyệt, 12 ca × 5 lượt, `retries=0`, một worker. "Trước" = spec và harness đúng như commit tại `43f10f0`. "Sau" = bản sửa vòng này. Code sản phẩm giống nhau ở cả hai.

| Trình duyệt | Trước (test tại `43f10f0`) | Sau (test đã sửa) |
|---|---|---|
| Chrome 154.0.8037.98 (bản cài sẵn, cấu hình ngoài Git) | **49 pass / 11 fail** | **60/60** |
| Chromium 149.0.7827.55 (Playwright mặc định) | 60/60 | 60/60 |

Phân bố 11 lượt fail trên Chrome 154 trước sửa:

- "several retries → unmount → late 200": 5/5 lượt. Đây đúng là ca flaky trên CI.
- "StrictMode … late 401": 4/5.
- "StrictMode … late 200": 2/5.

Trên Chromium 149, lỗi không lộ ra ở máy người triển khai. Vì vậy con số "12/12" và "45/45" của §41 không phát hiện được R03 (xem §42.5).

Các lượt khác với test đã sửa, `retries=0`:

- 28 fixture + 12 hook trên Chromium 149: 40/40.
- 28 fixture + 12 hook trên Chrome 154: 40/40.

### 42.4. Độ nhạy của test đã sửa

Thực hiện cô lập: sao lưu hai file production, đổi, chạy, khôi phục, rồi xác nhận trùng khớp bản sao lưu. Cây làm việc cuối chỉ khác ở hai file e2e.

| Thay đổi tạm ở production | Kết quả 12 ca hook (test đã sửa) |
|---|---|
| Hook + store như tại `34daf0d` (lỗi R01 gốc) | 8 fail / 4 pass — đúng 8 ca "retry → unmount" |
| Bỏ điều kiện owner trong `releaseSessionCheck` | 2 fail / 10 pass — 2 ca mount mới tiếp quản |
| `releaseSessionCheck` không huỷ gì | 9 fail / 3 pass |

Hàng rào không làm test dễ dãi hơn: nếu cleanup không huỷ request, assertion vẫn fail. Cleanup của probe vẫn chạy nên hàng rào vẫn mở; chỉ có request là không bị abort.

### 42.5. Đính chính §41

| §41 đã ghi | Đính chính |
|---|---|
| §41.2: hook spec "12/12 pass" sau sửa | Là một lượt trên Chromium 149 ở máy người triển khai. Test có race (R03) nên kết quả không ổn định: Chrome 154 fail 11/60 lượt; CI flaky 1 ca. |
| §41.5: toàn bộ Playwright "45/45, một lượt" | Đúng cho lượt local đó, nhưng **CI tại `43f10f0` là 44 passed + 1 flaky**, không phải 45 pass sạch. Ca "several retries → unmount → late 200" fail ở `session-check.hook.spec.ts:79` rồi pass khi retry. Required checks SUCCESS nhờ retry. Người triển khai đã tự đọc log job E2E để xác nhận. |
| §41.2: 4 ca "pass cả trước và sau" chặn cách sửa sai | Trước R03, các ca mount mới tiếp quản có thể pass giả (§42.1). Từ vòng này chúng mới đọc trạng thái sau khi cleanup của mount cũ đã chạy. |
| §41.4 N01: lần retry của test regression "sẽ tự gặp 429" | Nói quá. Retry trong cùng cửa sổ **có thể** vượt ngưỡng; còn tuỳ thời điểm và số request đã gửi trước khi fail. |

### 42.6. N01, N02 — không đổi

- **N01** (biên rate limit) là rủi ro riêng của cách dựng test. Nó **không** phải nguyên nhân hook flaky: ca flaky trên CI là fixture hook, không gọi backend. Không nới throttling, không sửa CI.
- **N02** (POST login đang chờ rồi "Đăng nhập lại") vẫn OPEN. Chưa có quyết định (a)/(b)/(c) nên `WEB-01` không đổi hành vi POST login. Reviewer khuyến nghị hướng (c) cho một micro-step riêng, sau khi spec được cập nhật và duyệt; đó chưa phải quyết định của chủ dự án.

### 42.7. Evidence của vòng này — theo nguồn

Chạy local ngày 2026-10-11.

| Kiểm tra | Người chạy | Loại | Kết quả |
|---|---|---|---|
| `npm run lint` | Người triển khai | — | exit 0; 2 warning có từ trước |
| `npm run build` | Người triển khai | — | exit 0 |
| `npm run test` | Người triển khai | Vitest + Jest | exit 0; web 100/100, backend 174/174 (không đổi so với `43f10f0`) |
| 12 hook × 5, Chrome 154, test tại `43f10f0` | Người triển khai | Hook thật, transport fixture | 49/11 — tái hiện R03 |
| 12 hook × 5, Chrome 154, test đã sửa | Người triển khai | Hook thật, transport fixture | 60/60, `retries=0` |
| 12 hook × 5, Chromium 149, test đã sửa | Người triển khai | Hook thật, transport fixture | 60/60, `retries=0` |
| 28 fixture + 12 hook, mỗi trình duyệt một lượt | Người triển khai | Fixture UI + hook | 40/40 trên cả hai, `retries=0` |
| Toàn bộ `npx playwright test --retries=0` | Người triển khai | Gồm 5 ca **backend thật** (database test cô lập, đã xoá) | 45/45 |
| Ba phép kiểm độ nhạy (§42.4) | Người triển khai | Mutation tạm, đã khôi phục | Fail đúng ca mong đợi |
| Nguyên test tại `43f10f0`: 37 pass / 3 fail; diagnostic có đồng bộ: 60/60 | **Reviewer** | Chrome 154, `retries=0` | Theo báo cáo re-review |
| CI E2E tại `43f10f0`: 44 passed + 1 flaky | **GitHub Actions** (reviewer và người triển khai cùng đọc log) | CI | Required checks SUCCESS nhờ retry |

Bản diagnostic của reviewer chờ DOM rồi poll `aborted`; nó chỉ là bằng chứng về thứ tự thực thi, không phải requirement. Bản sửa trong PR dùng hàng rào do harness cung cấp, để assertion `aborted` vẫn là assertion chứ không thành điều kiện chờ.

**NOT_RUN:**

- CI tại head mới — chưa có kết quả khi viết mục này.
- Re-review độc lập ở head mới.
- Ma trận viewport, Firefox/WebKit, thiết bị thật.
- Mạng chậm thật cho ngưỡng 15 giây.
- Hook harness trên site đã deploy.

**Không đổi:** code sản phẩm của `apps/web/src`, backend, API, schema, Flutter, Unity, dependency, lockfile, CI, cấu hình Playwright/Vitest. `WEB-02`…`WEB-13` vẫn NOT STARTED.

## 43. Đóng dependency WEB-00 và WEB-01 bằng review độc lập, merge; bắt đầu WEB-02 (2026-10-11)

Ghi bởi agent điều phối, không phải Claude — tác giả WEB-00/WEB-01. Giữ nguyên §35–§42 như lịch sử. §39 đã dành cho AR 8.1b, vì vậy provenance WEB-00 được bổ sung ở đây.

### 43.1. WEB-00

- Review độc lập cuối tại `1827ea84c4b59523424ca0a9f3f1f979dcd8ff29`: [quyết định trên PR #87](https://github.com/lexuansang2004/NovaWay/pull/87#issuecomment-6096992054). §38 là tự phê duyệt của tác giả và **không được tính là phê duyệt độc lập**.
- Quyết định đăng qua tài khoản GitHub chủ dự án, cũng là tài khoản tác giả PR; độc lập giữa các agent, không giả định đó là GitHub APPROVED của người dùng thứ hai.
- PR #87 đã MERGED vào develop, commit `f563a0d1eda919ffb5339eeb5f30979e23967df3`. Ba required checks đã PASS theo quyết định review. Gate tài liệu đóng; các AC triển khai không tự thành PASS vì tài liệu merge.

### 43.2. WEB-01

- Review độc lập cuối PASS tại `cdd6967ce8ad0a6d3dbe587f9a784795f0a1a6ec`: [quyết định trên PR #88](https://github.com/lexuansang2004/NovaWay/pull/88#issuecomment-6105540126). R01 (cleanup retry), R02 (busy state) và R03 (hàng rào vòng đời của test) đều được đóng bằng source, test độc lập và CI, không chỉ dựa log tác giả.
- Reviewer tự chạy: lint/build PASS (warning cũ giữ nguyên); web 100/100, backend 174/174; nguyên 12 hook test lặp 5 lượt = 60/60, zero retry/flaky/skip; fixture UI 28/28, không retry. Trình duyệt Chrome 154.0.8037.98, Windows, 1280×720. Không gọi 60 lượt là 60 kịch bản riêng.
- [CI đúng SHA, run 38111580481](https://github.com/lexuansang2004/NovaWay/actions/runs/38111580481): Backend + Web + shared-types, E2E, Mobile đều SUCCESS; E2E log **45 passed, không flaky/retry**, khác head cũ 44 pass + 1 flaky. Vercel checks SUCCESS. Reviewer không chạy lại năm backend-real E2E local; chúng được xác nhận từ CI.
- Chủ dự án yêu cầu merge nếu đạt. Head/checks được kiểm lại trước khi chuyển Ready và squash merge; PR #88 đã MERGED vào develop tại `4be69b84cc57229ed21da6e792e25e577ee728b1`. Không force-push, không sửa checkout chính hoặc thay đổi Flutter có sẵn.
- N01 (biên rate limit E2E) và N02 (POST login pending sau relogin) vẫn OPEN, không được coi đã sửa. N02 cần đặc tả được duyệt ở micro-step riêng. Chưa có evidence thiết bị thật, ma trận RWD hay mạng chậm thật cho WEB-01.

### 43.3. WEB-02 bắt đầu sau merge

Baseline `4be69b8`, branch `feat/web-responsive-navigation`; chỉ shell/navigation trong apps/web, không đổi auth/API/schema hoặc nội dung bốn trang tài khoản. Frontend agent triển khai; UX/QA agent review độc lập; Lead tích hợp. **IN PROGRESS, chưa có quyết định PASS gate merge Windows.** Thiết bị WEB-VH1/VH2 vẫn NOT_RUN; không cần Mac/iPhone cho gate Windows. Các bước WEB-03…WEB-13 chưa bắt đầu.

## 44. WEB-02 — responsive shell/navigation, review độc lập và evidence local (2026-10-12)

**Trạng thái tại commit chứa record này:** review kỹ thuật độc lập PASS; kiểm tra local bên dưới đã chạy; chờ required PR checks và quyết định đóng gate merge Windows. Chưa merge, WEB-03 chưa bắt đầu. Baseline `4be69b8`; branch `feat/web-responsive-navigation`; commit message theo plan: `feat: add responsive web navigation`. §35–§43 được giữ nguyên.

### 44.1. Hành vi và phạm vi

- Bề rộng CSS <1024: header với nút mở drawer có tên; ≥1024: sidebar. Chỉ một cây navigation được mount; Outlet/form giữ nguyên identity khi đổi breakpoint.
- Drawer quản lý focus, Escape/nút đóng/bấm ngoài, chọn route kể cả route hiện tại, nested account menu, Browser Back/Forward; resize dọn portal/scroll lock và đưa focus sang control còn hiển thị nếu focus thuộc navigation.
- Navigation cuộn trong chiều cao thực, nhãn và email đầy đủ wrap; control chính tối thiểu 44×44 CSS px. Email tách khỏi nút tài khoản để anchor không vượt viewport. Account popup được fit theo viewport khi mount, resize và khi animation của chính nó kết thúc; mở sau khi thả pointer để tránh chọn nhầm mục nằm đè lên trigger.
- Chỉ AppLayout/ResponsiveNavigation/Sidebar, một fixture spec và hồ sơ tài liệu. Không đổi API/schema/auth service, nội dung trang tài khoản, Flutter/Unity, dependency/lockfile hoặc cấu hình CI.

### 44.2. Review độc lập

Reviewer `web02_final_review` không viết source hoặc tài liệu trong PR; Lead tích hợp khác các Frontend agent viết source. Review source trước/sau, chạy diagnostic độc lập, không chỉ đọc log tác giả.

- R04 [P2]: email dài làm trigger cao hơn viewport, popup/logout nằm ngoài màn hình ở 320×180 và 320×568 khi tăng root CSS font 32px. Đã tái hiện độc lập; cách sửa đầu còn đo rectangle trong animation. Bản cuối refit sau animation thật, có callback ref/RAF hợp lệ và cleanup. Thuộc tính `onPlaced` không được public type của thư viện hỗ trợ đã loại; build xác nhận lại PASS.
- Reviewer đóng R04: bốn cấu hình keyboard Enter/Space/ArrowDown, Home/End, Escape/focus PASS; cùng diagnostic với animation/transition tắt cũng PASS; menu 99% trong viewport trước resize. Bốn cấu hình viewport với nested account portal và sáu vòng chuyển breakpoint mỗi cấu hình PASS; không pageerror hay lock còn sót. Một regression đổi chiều cao chạy lại độc lập PASS, retries=0.
- Source identity đã review: Sidebar SHA-256 `FAF618A0F073648423D35CE6CA25790ED9DA616B00CA4F20386EC8B836B58238`; ResponsiveNavigation `1EFDBEE8905865F30F0BA9D26067F3C666FCA2F5C6CE55E8534BD49E772346E7`; AppLayout `4F94D8E09E6E1E94FE9343D7A2E45B68D00081558706B7C14C04A2BC2E2EAEB1`; fixture spec `AD8FB646D4D1CE5BE891F679A133E254587B7BD7810FB58FAC27D7862C53D1F5`.
- Reviewer không tự chạy các phép native zoom, Narrator hoặc backend-real; các nguồn bên dưới ghi riêng. Đây không phải chứng nhận accessibility hay release toàn dự án.

### 44.3. Evidence local theo nguồn

| Kiểm tra | Nguồn | Môi trường / phạm vi | Actual |
| --- | --- | --- | --- |
| lint / build | Lead, chạy từng lệnh kiểm exit riêng sau sửa type | Root workspace, Node 24.17.0 | PASS; hai warning Fast Refresh và warning chunk-size cũ còn giữ |
| unit tests | Lead | Web Vitest / backend Jest | 100/100 và 174/174 PASS; không đổi service/backend trong lượt sửa CSS/lifecycle menu |
| Fixture navigation | Frontend agent | Chrome 154.0.8037.98, one worker, retries=0; `apps/web/e2e/responsive-navigation.fixture.spec.ts` | 15/15 PASS; viewport/mouse/keyboard; ca riêng touch/DPR2 thực hiện tap |
| Viewport + resize | Fixture spec / reviewer diagnostic độc lập | 320×568, 844×390, 1024×768, 1280×720; 1023↔1024↔1025; thêm 1024×180 | PASS trong phạm vi shell, focus, form giữ dữ liệu, logout/deep link/404 |
| CSS stress / R04 | Frontend / reviewer | Root font 32px; 320×180/568; popup resize 568→180→390→568→180→568 | PASS sau sửa; không gọi đây là native text zoom |
| True browser zoom | Lead | Chrome 154, content size 1280×720 tại 100%; browser setting thật | 200%: CSS 640×360/DPR2; 400%: CSS 320×180/DPR4; root font vẫn16px; menu/action/focus PASS sau animation thật |
| Native text-only 200% | Lead | Firefox 144.0, profile tạm; viewport BiDi 390×844 và1280×720, DPR1 | Width/DPR không đổi; CSS text14→28px, glyph height19→37px; action/menu PASS |
| Screen-reader tên control (AC-RWD-10) | Lead, Computer Use / Narrator Speech recap thực tế | Narrator10.0.26100.8972, Chrome154,390×844, fixture tài khoản tổng hợp | PASS spot-check: dialog/close button, navigation/link, account button+popup role, Hồ sơ cá nhân1/5, Quyền riêng tư2/5, Cài đặt ứng dụng3/5 |
| Required PR checks / regression backend thật | GitHub Actions | Head PR chứa record này | PENDING tại lúc viết — không thay bằng local PASS |

Phép browser zoom dùng setting Chrome trong profile tạm, không CSS zoom hoặc thu nhỏ viewport. Chờ completion của animation trước đo bounding box; capture surface trực tiếp tránh screenshot bị crop do context DPR không đổi theo browser zoom. Firefox bundled151 tải được nhưng không launch do assembly `mozglue`; dùng Firefox144 đã cài và Selenium trong môi trường QA ngoài Git. Không thay dependency dự án hoặc profile trình duyệt cá nhân.

Narrator spot-check là output thật đọc trong Speech recap, không suy từ aria-label. Lượt kiểm rộng hơn bị ngắt bởi timeout của browser-read wait/kernel reset; **không** gán PASS cho toàn bộ Escape/resize khi Narrator bật hoặc mọi menu item. Các luồng keyboard/focus được xác nhận riêng bởi fixture/reviewer. Windows từ chối tắt Narrator tự động; chủ dự án đã được báo phím Win+Ctrl+Enter để tắt. Không nâng quyền hoặc đổi security/privacy setting. Không thêm ảnh hoặc thông tin cá nhân vào Git.

### 44.4. Còn mở

- Required checks phải SUCCESS ở đúng head; đọc log E2E để phân biệt sạch với flaky/retry. Regression backend-real auth/vehicle/trip-observation/analytics nằm trong golden path của CI, chưa được Lead chạy lại local ở bước này.
- WEB-VH1 Android Chrome thật và WEB-VH2 Safari iPhone thật: NOT_RUN, gate công bố hỗ trợ thiết bị tách riêng theo spec §4.7. Không tuyên bố hỗ trợ thiết bị từ emulation.
- Các nội dung dashboard/login/form/map/analytics/bốn trang tài khoản thuộc WEB-03…WEB-12; các hàng ma trận toàn route còn NOT_RUN. WEB-02 chỉ xác nhận shell/navigation subset theo evidence, không đánh PASS RWD toàn sản phẩm.
- N01/N02 của WEB-01, Privacy Content Gate trước WEB-11 và quyết định preference trước WEB-12 vẫn giữ nguyên. Không gộp code thêm vào PR này.

## 45. WEB-02 đóng gate Windows và merge PR #89; WEB-03 bắt đầu (2026-10-12)

Ghi bởi Lead điều phối. §44 giữ như snapshot local trước CI; mục này bổ sung kết quả cuối, không sửa lịch sử. [Quyết định gate trên PR #89](https://github.com/lexuansang2004/NovaWay/pull/89#issuecomment-6117950112) nêu reviewer QA/UX độc lập với các Frontend agent, Lead tích hợp và thực hiện native zoom/Narrator; đăng qua tài khoản GitHub chủ dự án, không giả native GitHub approval của người thứ hai.

- Head đã duyệt và merge: `2906d75a6ab30fab57f5155c847efca2752f6844`. Source hashes khớp review độc lập; các finding đều đóng; selected-name Narrator record được reviewer đối chiếu với AC-RWD-10, không coi đó là lượt chạy Narrator thứ hai.
- [CI run38204986222](https://github.com/lexuansang2004/NovaWay/actions/runs/38204986222) headSha đúng: Node, E2E, Mobile và Vercel SUCCESS. Lead đọc log E2E: **60 passed (1.5m), không flaky/retry**, gồm regression backend thật auth/vehicle/trip-observation/analytics.
- Chủ dự án cho phép merge khi đạt và tiếp tục bước kế tiếp. Đã kiểm lại head/checks, chuyển Ready và squash merge PR #89 vào develop tại `1c02617ab604b1eace11011e50874d690a3c157f`. **WEB-02 gate merge Windows PASS, đã MERGED.** WEB-VH1/VH2 vẫn NOT_RUN; không dùng một COMPLETED chung hoặc tuyên bố hỗ trợ thiết bị.
- Tree Git của develop `1c02617` bằng tree của head PR `2906d75` (`d7643395932169dbbeb36b5ff0779daede15c53c`); không có code mới ngoài tree đã kiểm. Checkout chính có thay đổi Flutter được giữ nguyên; không pull/reset/stash checkout đó, không tạo PR lên main.
- WEB-03 bắt đầu từ develop `1c02617`, branch `style/web-login-responsive`. Chỉ layout trang/form/notice đăng nhập; không sửa auth contract/semantics hoặc N02. Gate Windows theo plan và spec; bàn phím/thiết bị thật vẫn ghi riêng. **IN PROGRESS, chưa có kết quả gate WEB-03.** WEB-04…WEB-13 chưa bắt đầu.
- Narrator test cleanup vẫn chưa được Windows cho phép tự động; chủ dự án đã được hướng dẫn Win+Ctrl+Enter. Không nâng quyền hoặc đổi setting bảo mật/quyền riêng tư. Điều này không được ghi nhầm thành đã dọn xong.

## 46. WEB-03 — diễn giải phạm vi kiểm tra layout đăng nhập (2026-10-12)

Ghi bởi Lead trước khi đóng gate. Baseline `1c02617`, branch `style/web-login-responsive`; **IN PROGRESS, không phải kết quả kiểm thử hoặc phê duyệt merge**. §35–§45 được giữ nguyên.

- Plan WEB-03 tham chiếu AC-RWD-06, nhưng nguyên văn AC này mô tả form phương tiện, nút Lưu/Huỷ và lỗi gắn trường. Với `/login`, áp dụng phần nguyên tắc layout/form/scroll/giữ dữ liệu khi đổi kích thước của NFR-RWD-05 cùng AC-RWD-01/04; không thêm Lưu/Huỷ, validation hoặc nghiệp vụ phương tiện vào đăng nhập. Form xe và toàn bộ AC-RWD-06 riêng cho xe được kiểm tại WEB-06.
- Phạm vi WEB-03: bố cục trang, form, nhãn, thông báo lỗi phiên và trạng thái retry/submitting trên màn hình hẹp/thấp; giữ nguyên auth contract, trạng thái phiên, nút chủ động đăng nhập lại và N02. Không thêm ghi nhớ đăng nhập hoặc thay hành vi POST login.
- Frontend agent tạo regression trước sửa. Reviewer QA/UX độc lập kiểm source và diagnostic riêng; Lead kiểm native browser zoom và native text-only zoom trong profile tạm. CSS tăng font, viewport emulation và giảm chiều cao cửa sổ phải ghi đúng loại, không gọi là zoom hoặc bàn phím thiết bị thật.
- Gate Windows chỉ đóng sau test mục tiêu, regression, lint/test/build, independent review và required checks ở đúng head đều đạt. WEB-VH1/VH2 và bàn phím ảo thật vẫn NOT_RUN; không dùng kết quả Windows để công bố hỗ trợ thiết bị.

## 47. WEB-03 — layout đăng nhập, review độc lập và evidence local (2026-10-12)

**Trạng thái khi ghi record:** review kỹ thuật độc lập PASS; các phép local bên dưới đã chạy; required checks và merge Windows còn chờ. WEB-04 chưa bắt đầu. Baseline `1c02617`, branch `style/web-login-responsive`, commit message theo plan `style: improve responsive login layout`. §35–§46 giữ nguyên.

### 47.1. Trước/sau và phạm vi

- Frontend agent tái hiện trên source baseline: lỗi credential dài ở viewport320×568 với root CSS font32px làm paragraph rộng670px/scrollWidth3437px; `overflow-hidden` ngoài trang giấu phần tràn. Regression FAIL trước sửa, PASS sau sửa. Đây là CSS stress, không phải native zoom.
- Form/notice/progress dùng chung wrapper có width rõ và min-width0; cột brand/form co theo không gian thực; trang cuộn dọc tự nhiên thay vì che nội dung. Nhãn/error wrap, input/action có chiều cao tự động và tối thiểu44px. Không thay label/input ID/autocomplete, form payload, validation, auth callback hoặc service.
- Lượt keyboard phát hiện lớp motion trang trí tạo Tab stop rỗng trước submit. `tabIndex=-1` chỉ bỏ lớp trang trí khỏi thứ tự Tab; button thật vẫn submit bằng Enter. Không thêm nghiệp vụ hoặc thay animation preference.
- Source chỉ LoginPage/LoginForm và styling Notice/Progress; protected SessionCheckErrorScreen không đổi. Không backend/API/schema, Flutter/Unity, generic primitives, dependency/lockfile hoặc cấu hình CI. N01/N02 của WEB-01 giữ OPEN.

### 47.2. Review độc lập và identity

Reviewer QA/UX `web02_final_review` không viết source/test/docs trong PR, không commit/merge. Đọc diff source, fixture18 ca và docs §45–§46; chạy probe riêng, error text khác fixture tác giả. **PASS, không có finding chặn** trên snapshot freeze:

- LoginPage SHA-256 `8A90BCA953A98787889C8589374907DE00E2E1DDA462130305729E83CCC3A609`.
- LoginForm `2B330F442BABC37E61BF4819988D1D12E3E83179BAAFF3E9A164B42CB95E66E6`.
- SessionCheckError `E1A838DDDF64CCB6E9EA80C6C3C86797C7CF1F4E60CF4D87C95A90F50B60D034`.
- Login fixture `32ED6071EC3453256377F457E455629A7967D48A0B5D57C103DCAD13D3BCE037`.

Probe riêng: tám cấu hình empty/credential-error/resize (320×568,390×844,844×390,1280×720, biên1023/1024/1025×800,320×180 root32) và ba cấu hình notice→retry-busy/reduced-height. Toàn bộ PASS: text/document không tràn ngang, control cuộn tới được với full bbox, email/password/focus giữ nguyên, token còn giữ và form dùng được. Đây là11 lượt cấu hình, không cộng thành test của suite18 hoặc73. Reviewer không chạy native zoom, Firefox hoặc backend-real; nguồn đó ghi riêng.

### 47.3. Gate local theo nguồn

| Kiểm tra | Nguồn / môi trường | Actual |
| --- | --- | --- |
| Lint / production build | Lead, từng lệnh exit riêng trên source freeze | PASS; hai warning Fast Refresh và chunk-size warning cũ giữ nguyên |
| Unit tests | Lead, Vitest/Jest | Web100/100, backend174/174 PASS |
| Login fixture | Frontend agent, Chrome154.0.8037.98, one worker/retries0 | 18/18 PASS; C320/360/390/430, V05, VB3, text stress, submitting/error/session failures/timeout/retry, keyboard; touch390×844/DPR2 có input và submit tap thật |
| Regression fixture / hook | Lead, Chrome154, one worker/retries0 | 73/73 PASS (18login+15navigation+28sessionUI+12hook); không backend thật trong lượt local này |
| Browser zoom thật | Lead, Chrome154 profile tạm, content1280×720 ở100% | 200% CSS640×360/DPR2 và400% CSS320×180/DPR4; credential-error, session-notice, submitting, retry-busy =8 lượt PASS; bbox/scroll/value/token và capture surface |
| Native text-only200% | Lead, Firefox144 profile tạm, viewport BiDi390×844 và1280×720/DPR1 | Credential-error, session-notice, submitting =6 lượt PASS; heading20→40px, width/DPR không đổi, text/control/value/token dùng được |
| Required checks / backend-real regression | CI của PR chứa record này | PENDING khi viết; phải kiểm đúng head và đọc E2E log, không gán local PASS thay CI |

Native zoom dùng setting thật trong profile browser tạm; không đổi profile cá nhân hoặc dependency dự án. Helper Firefox đã sửa locator đo heading để chọn heading login đang hiển thị, không heading brand bị ẩn; phép đo đầu sai không dùng làm evidence cuối. Native single-line input được cuộn text bên trong, không đòi email dài wrap như paragraph. Visual QA xem capture Chrome400% và Firefox text200%; nội dung dưới fold tiếp cận bằng cuộn dọc, không yêu cầu toàn bộ form vừa một màn hình.

### 47.4. Giới hạn còn giữ

- WEB-VH1/VH2, bàn phím ảo thật/safe area: NOT_RUN, gate thiết bị riêng, không chặn merge Windows nhưng chặn công bố hỗ trợ. Giảm chiều cao viewport không thay thiết bị thật.
- Không đánh PASS toàn ma trận route/thiết bị; chỉ login subset được ghi ở W03. Không claim WCAG audit, Narrator run mới hoặc Firefox toàn regression từ sáu lượt text-zoom.
- Lead kiểm read-only sau lượt Narrator trước: process Narrator không còn chạy; không ghi thành agent đã tự tắt bằng quyền cao. §44–§45 là lịch sử tại lúc trước, không bị sửa.
- WEB-04 chỉ bắt đầu sau required checks/review cuối và merge WEB-03; Privacy Content Gate và các quyết định preference trước WEB-11/12 giữ nguyên.

## 48. WEB-03 đóng gate Windows và merge PR #90; WEB-04 bắt đầu (2026-10-12)

Ghi bởi Lead điều phối sau merge. §47 là snapshot local trước CI và được giữ nguyên. [Quyết định phê duyệt cuối trên PR #90](https://github.com/lexuansang2004/NovaWay/pull/90#issuecomment-6122549124) có provenance QA/UX độc lập với Frontend author và Lead tích hợp; đăng qua tài khoản chủ dự án, không giả phê duyệt GitHub của người dùng thứ hai.

- Head đã duyệt `c845e74aceae7b7d4e2c2b9bacd9bbd88136fdfd`; bốn source/test hashes giữ nguyên từ review. QA audit thêm docs/evidence JSON cuối: PASS, không finding chặn; phân biệt18 fixture tác giả,73 regression Lead và11 lượt probe reviewer, không cộng số liệu sai.
- [CI run38236742395](https://github.com/lexuansang2004/NovaWay/actions/runs/38236742395) đúng headSha: Node, Mobile, E2E và Vercel SUCCESS. Lead đọc E2E log: **78 passed (1.8m), không flaky/retry/fail/skip**, gồm regression backend thật.
- Đã kiểm lại checks/head, chuyển Ready và squash merge PR #90 theo yêu cầu của chủ dự án. Merge commit `20b9bc579191454ed8e5c3b2f3ecd14fec5c844a`; merge/head tree cùng `2cc6c362ab428ff4f8b942a2f98526acf5f98147`. **WEB-03 gate merge Windows PASS, MERGED; WEB-VH1/VH2 và bàn phím thật vẫn NOT_RUN.** Không merge main hoặc suy thành production release.
- WEB-04 bắt đầu sau merge từ develop `20b9bc5`, branch `style/web-dashboard-responsive`. Chỉ Dashboard layout và sizing tối thiểu của StatCard nếu cần; StatCard còn dùng trong Analytics nên phải kiểm regression label/tổng số hiện hành, không triển khai WEB-08. Card `—` và badge Online tĩnh được giữ, không gọi đó là số liệu hoặc health API thật.
- Frontend author và reviewer QA/UX tiếp tục riêng biệt; Lead owns docs, native zoom, gate và CI. WEB-04 **IN PROGRESS, chưa PASS**. WEB-05…WEB-13 chưa bắt đầu. N01/N02, Privacy Content Gate, quyết định preference và gate thiết bị giữ nguyên; checkout chính và thay đổi Flutter có sẵn không bị chạm.

## 49. WEB-04 — Dashboard reflow, review độc lập và evidence local (2026-10-12)

**Trạng thái khi ghi record:** review kỹ thuật độc lập PASS; gate local đã chạy; required PR checks/merge Windows còn chờ. WEB-05 chưa bắt đầu. Baseline `20b9bc5`, branch `style/web-dashboard-responsive`, commit message `style: improve responsive dashboard layout`. §35–§48 được giữ nguyên.

### 49.1. Tái hiện và phạm vi

- Frontend agent tái hiện trước sửa tại320×568/root CSS font32px: badge Online x332.47→481.91 và CTA x113→441.64 vượt main0→320; caption client94/scroll98, bốn giá trị `—` client14/scroll48. Parent overflow có thể giấu lỗi. Test baseline FAIL, sau sửa PASS; đây là CSS stress, không native zoom.
- Dashboard có gutter đáp ứng không gian, header/action wrap, nút cao tự động/tối thiểu44px. Grid theo chiều rộng container: một cột khi hẹp, hai từ28rem, bốn từ56rem; không giả định sidebar ở1024 còn đủ chỗ cho bốn cột.
- StatCard dùng chung với Analytics chỉ đổi min-width/wrap/gap/icon-shrink; props, value/label/accent, Analytics source/formula/filter/chart và API không đổi. Regression analytics kiểm tổng/bộ lọc hiện hành; không triển khai WEB-08.
- Giữ nguyên bốn giá trị `—`, badge Online **tĩnh**, route `/start-trip` chỉ để quan sát. Dashboard không thêm metric API; action không tạo POST start/end trip. Không biến placeholder thành số liệu thật hoặc health check thật.
- Source chỉ DashboardPage/StatCard và một fixture mới. Không auth/navigation/service, backend/API/schema, Flutter/Unity, generic primitives, dependency/lockfile hoặc CI configuration.

### 49.2. Review độc lập và source identity

Reviewer QA/UX `web02_final_review` không viết source/test/docs trong PR. Đọc source/consumer/fixture và chạy probe riêng:13 cấu hình PASS, gồm C, biên767/768/769 và1023/1024/1025, chiều cao thấp, root32 CSS stress riêng. Kiểm main/text/control bbox, label/icon không đè, một cột khi320px, bốn `—`/Online tĩnh, no metric API, focus/route qua resize và Enter sang `/start-trip` không POST. Reviewer tự chạy lại một test StatCard/analytics: **1/1 PASS, retries0**. Không coi13 lượt probe là13 test của tác giả; không gán native zoom/unit/CI của Lead thành reviewer tự chạy.

Source/test frozen SHA-256:

- DashboardPage `3A9E2D3514E418D5A84A5D4EEF6AF86005BBA4CE5BB5241E0C8D6D1C1CED7C7A`.
- StatCard `BC4DA4A0369CD267A8600F2610BFC612125C98B3F0CE95CD645317D4D2A4DE97`.
- Dashboard fixture `B8AC2F386767A6F7412C7B776FBC6D1FA75DD7570EEFE6F60046FBB95C6EE474`.

**Technical review PASS, không finding chặn**, chưa thay required checks hoặc gate thiết bị.

### 49.3. Evidence local theo nguồn

| Kiểm tra | Nguồn / môi trường | Actual |
| --- | --- | --- |
| Lint/build | Lead, từng lệnh exit riêng trên source freeze | PASS; hai Fast Refresh warning và chunk-size warning cũ giữ nguyên |
| Unit tests | Lead, Web Vitest / backend Jest | 100/100 và174/174 PASS |
| Dashboard fixture | Frontend agent, Chrome154.0.8037.98, one worker/retries0 | 13/13 PASS:6 viewport,3 CSS-stress, biên md/lg/focus, keyboard CTA, touch390×844/DPR2 có tap, shared analytics regression |
| Full fixture/hook regression | Lead, Chrome154, one worker/retries0 | 86/86 PASS (13dashboard+18login+15navigation+28sessionUI+12hook); không backend thật trong lượt này |
| Native browser zoom | Lead, Chrome154 profile tạm, content1280×720 ở100% | 200% CSS640×360/DPR2 và400% CSS320×180/DPR4:2 lượt PASS; text/card/CTA cuộn tới được, static values giữ, action route đúng |
| Native text-only200% | Lead, Firefox144 profile tạm, viewport BiDi390×844 và1280×720/DPR1 | 2 lượt PASS; heading24→48px, glyph32→64px, width/DPR không đổi; static values/action route giữ nguyên |
| Required checks / backend-real regression | CI của PR chứa record này | PENDING khi viết; không thay bằng local PASS; phải đọc đúng head/E2E log |

Visual QA xem actual Chrome400% action và Firefox text200% cards capture. Nội dung dưới fold tiếp cận qua cuộn dọc; không đòi tất cả card vừa một màn hình. Browser profile/fixture data tổng hợp/diagnostics ngoài Git; không đổi profile cá nhân, đọc secret hoặc đưa screenshot vào Git. `git diff --check` sạch; main checkout và thay đổi Flutter có sẵn giữ nguyên.

### 49.4. Giới hạn

WEB-VH1/VH2 và safe area/thiết bị thật NOT_RUN; không công bố hỗ trợ từ emulation. Không claim dashboard metric/API mới, đầy đủ Analytics RWD, full Firefox regression, Narrator mới hoặc WCAG audit. N01/N02, Privacy Content Gate và quyết định preference giữ OPEN. WEB-05 chỉ bắt đầu sau exact-head required checks và merge WEB-04.
