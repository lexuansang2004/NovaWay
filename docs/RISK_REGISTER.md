# NovaWay — Risk Register v0.1

> Step D0.2. Likelihood/Impact: Thấp / Trung bình / Cao. Risk nào Cao×Cao bắt buộc có mitigation trước khi rời D0.5 (Review vòng 1).

## 1. Technical Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Realtime layer (WebSocket) quá tải khi nhiều client reconnect đồng thời sau mất mạng diện rộng | Trung bình | Cao | Exponential backoff with jitter bắt buộc ở client (FR-REALTIME-07); thiết kế cho phép thêm Redis adapter khi cần scale (NFR-SCALE-01) |
| R-02 | Database phình nhanh vì raw GPS events tích luỹ không giới hạn | Cao (nếu không xử lý) | Cao | TTL 30 ngày + partitioning theo thời gian ngay từ MVP (FR-RETENTION-02, TDR-006) |
| R-03 | Offline sync tạo dữ liệu trùng lặp khi mobile retry nhiều lần | Trung bình | Trung bình | Idempotency bắt buộc theo `client_event_id` (FR-SYNC-02, NFR-SEC-02) |
| R-04 | Batch sync timeout hoặc lỗi khi payload quá lớn | Trung bình | Trung bình | Giới hạn cứng 500 events/payload + chunking bắt buộc phía mobile (FR-SYNC-05) |
| R-05 | Tile provider (Protomaps/Mapbox Free Tier) đổi chính sách giá/quota giữa chừng | Trung bình | Trung bình | Ghi cả 2 candidate, không hardcode 1 provider vào kiến trúc; kiểm tra quota/cost ở D0.3 trước khi implement (OQ-005) |
| R-06 | Pin/nhiệt độ thiết bị tăng nhanh khi chạy AR/camera liên tục | Cao (nếu không giới hạn) | Trung bình | AR Lite MVP không chạy camera liên tục; có fallback theo thermal/low-light state (FR-AR-03) |
| R-07 | Background location trên iOS bị hệ điều hành giới hạn/thu hồi quyền bất ngờ | Trung bình | Cao | Thiết kế fallback foreground-only + thông báo rõ giới hạn cho người dùng (FR-BGLOC-04) |
| R-08 | GPS sampling rate chưa được test ảnh hưởng pin thực tế | Cao (chưa có dữ liệu) | Trung bình | Đưa vào Open Question OQ-007; cần test trước khi chốt tần suất final ở D0.3 |
| R-16 | App bị App Store/Play Store từ chối vì xin quyền vị trí "Always/background" ngay từ đầu mà không xin "While Using" trước và giải thích rõ lý do nâng cấp | Trung bình | Cao | Thiết kế luồng xin quyền 2 bước: xin "While Using" trước, chỉ nâng cấp lên "Always" khi người dùng thực sự bắt đầu chuyến đi và cần tracking nền, kèm màn hình giải thích rõ mục đích (phát hiện ở `REVIEW_NOTES.md` §4) |
| R-17 | Phụ thuộc dịch vụ/SDK xác thực khuôn mặt bên thứ ba — rủi ro về chi phí, độ chính xác, uptime khi tích hợp thật | Trung bình | Cao | **Đã đánh giá (R1-8, 07/2026):** chốt AWS Rekognition Face Liveness làm primary candidate (xem `docs/architecture/TDR-biometric-provider-spike.md`); cần xác nhận ToS/DPA đã tắt lưu video trước khi implement thật. Thiết kế API nội bộ (`POST /api/vehicles/:id/verify`) độc lập với provider cụ thể để dễ đổi sau |
| R-20 | AR Terrain Thesis Prototype (`8.x`, R&D độc lập, không phải MVP) có rủi ro tiến độ: ngày 2026-09-04 chủ dự án xác nhận Mac chưa sẵn có; iPhone 16 Pro dự kiến chưa có ETA/chưa kiểm chứng. Lenovo + iPhone 11 Pro sẵn có. Student subscription ACTIVE ngày 03/09 theo người dùng, activation tại máy kiểm tra riêng | Hiện hữu — lịch iOS/LiDAR gần nhất AT RISK | Cao đối với R&D; không chặn roadmap MVP | Windows-first `8.1a` có gate riêng; `8.1b` Mac/iOS vẫn bắt buộc trước `8.2`; không dùng Windows/iPhone 11 Pro thay LiDAR. Checkpoint thiết bị 06/09, mục tiêu mesh thật đầu tiên 07/09; khi có máy phải đánh giá lại lịch, không tự lùi code freeze 15/11. Giữ PLY ổn định 04/10, RTK đợt 1 25/10; Measurement Gate/Accuracy KPI tách biệt, không chỉnh số liệu. Xem baseline §4/§11/§13, `REVIEW_NOTES.md` §20 |

## 2. Product & Scope Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-09 | Scope phình vì cố nhét feedback NotebookLM (gamification, crowdsourced trust, Kafka...) vào MVP | Cao (đã từng xảy ra ở D0.1) | Cao | Đã phân tầng rõ MVP/Post-MVP/R&D ở `docs/02_NOTEBOOKLM_FEEDBACK_REVIEW.md`; PRD/SRS này giữ nguyên phân tầng đó |
| R-10 | Vehicle Mismatch Detection bị hiểu/triển khai như một cơ chế "buộc tội" gây trải nghiệm tiêu cực | Trung bình | Cao | Terminology rules bắt buộc (không "gian lận"/"phạt nguội"); UI luôn ở dạng gợi ý xác nhận lại, không khoá tài khoản (FR-MISMATCH-03, FR-MISMATCH-05) |
| R-11 | Người dùng cảm thấy bị giám sát quá mức vì tracking vị trí liên tục | Trung bình | Cao | Consent rõ ràng trước khi tracking, nút dừng luôn sẵn có, không tracking ngoài lúc có chuyến đi active (FR-TRIP-01, FR-TRIP-02, NFR-PRIVACY-01/02) |
| R-18 | Dữ liệu sinh trắc học (khuôn mặt) là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân — rủi ro pháp lý/compliance nếu thu thập, xử lý hoặc lưu trữ không đúng quy định | Trung bình | Cao | Không lưu ảnh thô (FR-BIOMETRIC-04, NFR-PRIVACY-03); consent riêng cho dữ liệu sinh trắc, tách biệt consent vị trí; xác nhận chính sách lưu trữ của nhà cung cấp SDK trước khi chọn (liên quan R-17) |
| R-19 | Thêm Biometric Vehicle Binding + Vehicle Authorization vào MVP sau khi D0.2 gần hoàn tất làm tăng khối lượng tài liệu/công việc, có thể ảnh hưởng tiến độ nếu không giữ đúng thứ tự ưu tiên | Trung bình | Trung bình | Giữ đúng thứ tự triển khai đã chốt: nền tảng (Auth/Vehicle/Trip/Realtime/Sync) trước, Biometric/Authorization sau (`PRD.md` §5.1) — không làm song song để tránh rối |
| R-12 | Cảnh báo hiển thị gây mất tập trung khi đang lái, có thể ảnh hưởng an toàn thật | Thấp (nếu tuân thủ FR-WARNUI) | Cao | Driver-friendly overlay bắt buộc: one-tap, auto-dismiss 10s, không chặn bản đồ lâu (FR-WARNUI-01 → 04) |

## 3. Process Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-13 | Bắt đầu code trước khi Requirement Baseline v1.0 hoàn tất, dẫn tới rework | Trung bình | Cao | Giữ đúng nguyên tắc "không code khi tài liệu chưa đạt Requirement Baseline v1.0" xuyên suốt D0.2 → D0.7 |
| R-14 | Nhiều AI công cụ khác nhau (ChatGPT, Claude, Gemini) tham gia từng bước có thể tạo tài liệu không nhất quán | Trung bình | Trung bình | Mỗi bước ghi rõ input/output, dùng chung terminology rules và cùng bộ ID (`FR-*`, `NFR-*`) để đối chiếu |
| R-15 | Open Questions còn treo (OQ-001 → OQ-014) bị quên, ảnh hưởng tới thiết kế kiến trúc D0.4 | Trung bình | Trung bình | Danh sách Open Questions được mang nguyên vào cuối `SRS.md` §6 và phải đóng trước khi chốt Baseline v1.0 (D0.7) |

## 4. Risks Requiring D0.3 Decision Before Proceeding

Các rủi ro sau **chưa có mitigation đầy đủ**, cần Claude Opus/Gemini review kỹ ở D0.3 trước khi sang D0.4 (Architecture):

- R-05 (tile provider quota) — cần technical spike, không chỉ quyết định trên giấy.
- R-07 (iOS background permission) — cần xác nhận UX flow cụ thể, có thể cần tham khảo Apple HIG.
- R-08 (GPS sampling vs pin) — cần số liệu thực nghiệm, không chỉ ước lượng.
