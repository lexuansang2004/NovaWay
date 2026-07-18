# NovaWay — Product Requirements Document (PRD) v0.1

> Step D0.2. Nguồn: `docs/00_SOURCE_SUMMARY.md` → `docs/06_NEXT_STEP_D0_2_INPUT.md` (D0.1 v0.5). Tài liệu này **chưa yêu cầu code** — là draft PRD để D0.3 (Claude Opus + Gemini) review logic/risk/edge case trước khi chốt Requirement Baseline v1.0 ở D0.7.

## 0. Document Info

| | |
|---|---|
| Product | NovaWay |
| Doc | PRD |
| Version | v0.1 (D0.2 draft) |
| Status | Draft — chưa duyệt |
| Input | D0.1 v0.5 (`docs/00`–`docs/06`) |
| Companion docs | `SRS.md`, `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md`, `RISK_REGISTER.md`, `EDGE_CASES.md`, `DATA_REQUIREMENTS.md`, `API_REQUIREMENTS.md`, `TEST_STRATEGY.md` |

## 1. Vision

NovaWay là hệ thống định tuyến vị trí, quản lý phương tiện cá nhân hóa và cảnh báo địa hình thời gian thực cho người lái xe. Sản phẩm xác thực đúng người đang cầm lái gắn với đúng phương tiện, theo dõi hành trình theo thời gian thực, và tự động ghi nhận — không kết tội — mọi bất thường phát sinh trong chuyến đi, tạo thành một lớp dữ liệu tin cậy và minh bạch cho cả người dùng lẫn nền tảng vận hành.

Về lâu dài, NovaWay hướng tới việc cộng đồng người dùng cùng đóng góp dữ liệu địa hình (ổ gà, vật cản, điều kiện đường) để cải thiện độ an toàn chung của mạng lưới di chuyển.

## 2. Problem Statement

Các nền tảng có phương tiện được chia sẻ hoặc cho mượn (gọi xe công nghệ, cho thuê xe tự lái, đội xe doanh nghiệp/giao hàng) hiện xác thực **tài khoản**, không xác thực **người đang thực sự cầm lái** và **phương tiện đang thực sự được sử dụng**. Hệ quả:

- Không có cách đáng tin cậy để biết ai đang lái, đang lái xe gì, đi tuyến nào, tốc độ ra sao tại một thời điểm cụ thể.
- Khi có sự cố (tai nạn, tranh chấp, khiếu nại), không có dữ liệu hành trình để đối chiếu.
- Người dùng di chuyển trong khu vực mất mạng hoặc gặp địa hình nguy hiểm không có cảnh báo hoặc bằng chứng ghi nhận.
- Việc đối chiếu loại phương tiện đăng ký với hành vi di chuyển thực tế hiện không tồn tại như một cơ chế tự động, thân thiện với người lái.

## 3. Target Users

| Persona | Mô tả | Nhu cầu chính |
|---|---|---|
| **Driver (Tài xế)** | Người trực tiếp lái phương tiện đã đăng ký/được uỷ quyền | Bắt đầu/kết thúc chuyến đi nhanh, nhận cảnh báo an toàn rõ ràng không gây mất tập trung, không bị gián đoạn khi mất mạng |
| **Vehicle Owner (Chủ phương tiện)** | Người sở hữu xe, có thể cho người khác mượn | Biết ai đang dùng xe của mình, trong bao lâu |
| **Dashboard User / Fleet Operator** | Người quản lý vận hành (nền tảng gọi xe, đội xe doanh nghiệp) | Theo dõi vị trí realtime, xem lịch sử chuyến đi, nhận cảnh báo sai lệch phương tiện |

Ngoài phạm vi MVP: hành khách/người nhận hàng, admin toàn quyền, đơn vị bảo hiểm (xem §6, §7).

## 4. Goals & Success Metrics

Mục tiêu MVP là **chứng minh luồng nghiệp vụ cốt lõi hoạt động ổn định**, không phải tối ưu tăng trưởng người dùng. Success metrics ở giai đoạn MVP mang tính kỹ thuật/vận hành, không phải kinh doanh:

| Mục tiêu | Chỉ số | Ngưỡng đạt MVP |
|---|---|---|
| Luồng chuyến đi hoàn chỉnh chạy được đầu-cuối | % lần chạy thử pass MVP Test Gate (`docs/05_MVP_SCOPE_DRAFT.md` §6) | 100% trên môi trường dev/staging |
| Vị trí realtime tới đúng dashboard | Độ trễ marker cập nhật trên web khi online | ≤ 5 giây |
| Không mất dữ liệu khi mất mạng | % GPS event queued offline được đồng bộ thành công khi có mạng lại | 100% (trừ event thật sự invalid) |
| Cảnh báo sai lệch phương tiện không làm phiền quá mức | Tỉ lệ cảnh báo tự ẩn đúng 10 giây, không chặn thao tác khác | 100% theo Acceptance Criteria |
| Ổn định khi test lặp lại | App/backend không crash sau nhiều vòng test bằng Developer Mode | 0 crash trong test suite mô phỏng mất mạng/thermal/low-light |

Các chỉ số kinh doanh (số chuyến đi thật, tỉ lệ giữ chân người dùng, doanh thu) nằm ngoài phạm vi PRD MVP này — sẽ bổ sung khi có bản pilot với người dùng thật.

## 5. MVP Scope (Product View)

Chi tiết kỹ thuật đầy đủ nằm ở `SRS.md`; đây là tóm tắt ở góc nhìn sản phẩm.

1. **Đăng nhập & tài khoản** — đăng ký/đăng nhập, JWT session.
2. **Quản lý phương tiện** — thêm/sửa/xoá xe, chọn xe đang hoạt động; phải có xe mới bắt đầu được chuyến đi.
3. **Chuyến đi (Trip)** — bắt đầu/kết thúc chuyến đi trên mobile, có sự đồng ý (consent) chia sẻ vị trí trước khi tracking.
4. **Theo dõi realtime** — mobile gửi GPS qua WebSocket khi online; web dashboard thấy marker cập nhật theo thời gian thực.
5. **Hoạt động khi mất mạng** — mobile lưu hàng đợi cục bộ, đồng bộ lại qua REST batch (`POST /api/trips/sync`) khi có mạng, không trùng lặp dữ liệu.
6. **Cảnh báo sai lệch phương tiện (Vehicle Mismatch Detection)** — phát hiện mềm khi hành vi di chuyển không khớp loại xe đã đăng ký; chỉ nhắc nhở, không khoá tài khoản.
7. **Cảnh báo địa hình / AR Lite** — overlay cảnh báo trực quan trên màn hình sử dụng phương tiện, có fallback khi thiết bị không đủ điều kiện (nóng, pin yếu, thiếu sáng).
8. **Nhật ký chuyến đi (Trip Logs)** — lưu lại lịch sử chuyến đi dài hạn; dữ liệu GPS thô chỉ lưu có thời hạn.
9. **Developer Mode / Simulator** — chế độ ẩn dành cho dev/test, không hiển thị cho người dùng thường.

## 6. Out of Scope (MVP)

- Full Unity AR Mesh Grid nhúng vào app chính (xem R&D, §8).
- Kafka/NATS hoặc hạ tầng realtime quy mô lớn.
- Gamification (điểm thưởng, huy hiệu).
- Crowdsourced Trust Verification ở mức production (xác thực chéo nhiều nguồn).
- Nhận diện vật cản bằng AI camera ở mức production.
- Cổng quản trị (admin portal) đầy đủ.
- Tải bản đồ offline.
- Tự vận hành (self-host) tile server.
- App Attestation / Play Integrity / DeviceCheck.
- Thanh toán / gói thuê bao.
- Routing engine thật (MVP dùng route mock theo loại phương tiện).

## 7. Post-MVP

- Crowdsourced Trust Verification (xác thực cảnh báo địa hình qua nhiều nguồn).
- Gamification cho người đóng góp dữ liệu.
- Redis adapter cho realtime scale.
- Trip analytics nâng cao.
- Tích hợp routing engine thật (OSRM/GraphHopper).
- Push notification.
- Kiểm duyệt nội dung (admin moderation).
- App Attestation / device trust score.
- Tự vận hành tile server/vector tiles nếu cần kiểm soát chi phí.

## 8. R&D Track

- Unity AR Terrain Mesh prototype (tách biệt hoàn toàn khỏi mobile app chính cho tới khi đạt test gate riêng: FPS, nhiệt độ, pin, độ ổn định, fallback ánh sáng yếu).
- Thuật toán phát hiện ổ gà/vật cản bằng camera AI.

## 9. Assumptions & Dependencies

- Backend MVP: NestJS + TypeScript, PostgreSQL + PostGIS (xem `docs/04_TECH_DECISION_RECORD.md`).
- Mobile: Flutter (cần xác nhận cuối tại D0.2/D0.3 — xem Open Questions).
- Web: React, bản đồ ưu tiên MapLibre GL JS.
- Tile provider MVP/dev: Protomaps hoặc Mapbox Free Tier (candidate, chưa chốt final — cần kiểm tra quota/cost trước khi implement).
- Có kết nối Internet không ổn định là điều kiện vận hành bình thường, không phải ngoại lệ — toàn bộ thiết kế phải giả định mất mạng có thể xảy ra bất kỳ lúc nào trong chuyến đi.

## 10. Open Questions Carried Into MVP Design

Danh sách đầy đủ + mức độ ưu tiên: `docs/01_OPEN_QUESTIONS.md` §2 (OQ-001 → OQ-014). Các câu hỏi có ảnh hưởng trực tiếp tới PRD/SRS đã được trả lời tạm thời trong tài liệu này và `SRS.md`; câu hỏi còn treo được liệt kê lại ở cuối `SRS.md` §7.

## 11. Terminology Rules

- Luôn dùng **NovaWay**, không dùng "NovaPay".
- Không dùng "gian lận", "chống gian lận", "phạt nguội", "camera phạt nguội".
- Dùng **"sai lệch phương tiện"** / **"Vehicle Mismatch Detection"**, **"xác nhận lại phương tiện"**, **"cảnh báo an toàn"**, **"cảnh báo địa hình"**.
