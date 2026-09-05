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
