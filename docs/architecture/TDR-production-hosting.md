# NovaWay — Technical Decision Record: Production Hosting (R3-6)

> Bổ sung 07/2026. `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §6 ghi "production hosting (khác staging) — chưa chốt" từ R1; `docs/ARCHITECTURE.md` §9 cũng liệt kê mục này trong Open Items từ D0.4, chưa từng cập nhật dù staging đã chốt và chạy thật từ R1-1/R1-2. R3-6 (`docs/roadmap/SPRINT_R3_VERIFICATION_CD_HARDENING.md`) đóng khoản nợ này.

## Decision

Không dựng hạ tầng production riêng biệt. **Railway (backend) + Vercel (web) — môi trường đang đóng vai staging — chính thức trở thành production cho giai đoạn pilot hiện tại** (chưa có traffic/người dùng thật). Không đổi CD, không đổi branch tracking (`develop`), không đổi domain — chỉ là một quyết định chính thức thay cho trạng thái "chưa chốt" đã treo từ D0.4.

Fly.io giữ nguyên vị trí ứng viên hàng đầu để đánh giá lại **khi có áp lực scale thật** (nhiều instance, đa vùng, SLA cao hơn, hoặc chi phí Railway usage-based không còn tối ưu) — quyết định đổi sang Fly.io (hoặc nhà cung cấp khác) vẫn phải đi qua TDR riêng, không đổi ở đây.

## Context

- Dự án hiện ở giai đoạn pilot/MVP, chưa có người dùng thật, chưa có traffic thật để đo. `RAILWAY_STAGING_PLAN.md` §7 đã ghi rõ: quyết định hạ tầng production "phải đi qua TDR riêng" và "không phải bây giờ".
- Staging (Railway + Vercel) đã chạy thật, ổn định từ R1, deploy tự động khi push `develop` (R2-7), có CD health check tự động phát hiện lệch (R3-3), branch protection trên cả `main`/`develop` (R2-8).
- `RAILWAY_STAGING_PLAN.md` §2 đã thiết kế sẵn nguyên tắc **"không lock-in"**: đóng gói bằng Docker chuẩn, không dùng tính năng build đặc thù của Railway — nếu cần chuyển sang Fly.io/VPS sau này chỉ cần trỏ lại `DATABASE_URL`/`WEB_ORIGIN` và re-deploy cùng Docker image, không sửa code.
- `docs/OBSERVABILITY.md` dẫn tinh thần TDR-004 (Realtime Scale Strategy): không over-engineer hạ tầng trước khi có tải thật — cùng tinh thần áp dụng ở đây.

## Options

| Option | Ưu điểm | Nhược điểm | Quyết định |
|---|---|---|---|
| Railway + Vercel hiện tại làm luôn production | Không tốn thêm chi phí/công sức khi chưa có traffic thật; đã verify ổn định qua nhiều sprint; "không lock-in" đã sẵn sàng cho khi cần chuyển | Không tách bạch môi trường test/thật — một lỗi ở staging cũng là lỗi ở production | **Chọn** |
| Tách project/environment Railway+Vercel riêng cho production, deploy từ `main` | Tách bạch rõ ràng test vs thật, đúng convention phổ biến | Gấp đôi chi phí/cấu hình cho một hệ thống chưa có traffic thật để justify; thêm một bộ CD/health-check cần bảo trì | Hoãn — làm khi có traffic thật hoặc trước khi ra mắt chính thức |
| Chuyển sang Fly.io ngay | WebSocket/global edge tốt, chạy Docker container (kể cả `postgis/postgis`) trực tiếp | Chưa có áp lực scale nào để justify — đúng loại quyết định `RAILWAY_STAGING_PLAN.md` §7 đã nói "không phải bây giờ" | Hoãn — ứng viên khi cần scale thật |
| VPS tự quản lý | Kiểm soát tối đa, chi phí cố định | Tự vận hành toàn bộ (patching, backup, monitoring) — không phù hợp với quy mô một người vận hành hiện tại | Không xem xét ở quy mô này |

## Rationale

Không có traffic/người dùng thật để đo lường hay justify chi phí/độ phức tạp của một môi trường production tách biệt. Nguyên tắc "không lock-in" đã được thiết kế sẵn từ R1 chính là để hoãn được quyết định này một cách an toàn — chuyển đổi sau này (sang Fly.io, VPS, hay một project Railway/Vercel riêng cho production) không cần sửa code backend/web, chỉ cần trỏ lại env var và re-deploy cùng Docker image. Quyết định "chốt luôn Railway+Vercel làm production" đóng khoản nợ tài liệu đã treo từ D0.4 mà không cần triển khai gì thêm, đúng tinh thần "chưa cần triển khai thật nếu chưa có áp lực traffic" đã ghi trong backlog R3-6.

## Consequence

- Không có thay đổi code/hạ tầng nào — CD, branch tracking (`develop`), domain giữ nguyên như hiện tại.
- `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §6 và `docs/ARCHITECTURE.md` §9 cập nhật để phản ánh quyết định này, đóng khoản nợ tài liệu đã treo từ D0.4.
- Thuật ngữ "staging" trong các doc vận hành (`RAILWAY_DASHBOARD_CHECKLIST.md`, `VERCEL_WEB_CHECKLIST.md`, `e2e-staging.yml`) **giữ nguyên tên gọi cũ** — đổi tên không phải việc bắt buộc của quyết định này, và đổi tên file/domain/workflow là rủi ro thao tác không cần thiết cho một quyết định thuần tài liệu.

## Chưa quyết định (cần đánh giá lại khi có áp lực thật)

- Có nên tách deploy source sang `main` (thay vì `develop`) để đúng ngữ nghĩa "production" hơn — chưa quyết định, không phải một phần của quyết định này (giữ nguyên `develop` để tránh thay đổi vận hành không cần thiết).
- Thời điểm cụ thể để tách môi trường production riêng biệt (traffic thật ở mức nào, số người dùng thật nào) — chưa có ngưỡng cụ thể, sẽ đánh giá khi có dấu hiệu traffic thật đầu tiên.
- Chuyển sang Fly.io — vẫn cần TDR riêng, chỉ thực hiện khi có áp lực scale thật (đa vùng, uptime cao hơn, hoặc chi phí Railway không còn tối ưu).
