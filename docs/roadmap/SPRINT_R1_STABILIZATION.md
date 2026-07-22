# NovaWay — Sprint R1: Stabilization & Staging

> Sprint đầu tiên sau `v0.1.0-mvp-baseline`. Mục tiêu: ổn định hạ tầng CI/CD, đóng gap giữa thiết kế và implementation, chuẩn bị điều kiện cho E2E-on-staging gate — **không** phải sprint tính năng mới.

## 1. Sprint Goal

Đưa NovaWay từ "MVP code xong, verify thủ công từng bước" sang "có staging thật + gate CI/CD đáng tin cậy hơn", mà không mở rộng phạm vi sản phẩm. Khi kết thúc sprint, `main` phải có: (a) một môi trường staging thật để deploy, và (b) ít nhất một luồng E2E tự động chạy được trên đó.

## 2. Ngoài phạm vi (Out of Scope) — nhắc lại rõ ràng

- **Step `8.1` (AR Terrain Mesh Prototype)** — vẫn hoãn, không đụng tới trong sprint này (xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §1). Chỉ quay lại khi có Unity + thiết bị AR thật, và chỉ khi được yêu cầu riêng.
- **Bất kỳ tính năng sản phẩm mới nào** không nằm trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` gốc.
- Load test quy mô lớn, security audit toàn diện — vẫn ngoài phạm vi MVP theo `docs/TEST_STRATEGY.md` §4.

## 3. Backlog (ưu tiên theo mức độ chặn)

Nguồn: `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`. Không mục nào ở đây được triển khai trong lúc viết doc này — đây là kế hoạch, chờ xác nhận trước khi bắt đầu từng mục.

| # | Việc | Ưu tiên | Vì sao | Chặn gì |
|---|---|---|---|---|
| R1-1 | Chốt nhà cung cấp hosting/staging | P0 | Điều kiện tiên quyết cho mọi thứ còn lại trong sprint | R1-2, E2E-on-staging gate |
| R1-2 | Deploy `develop` lên staging (thủ công hoặc CD tối thiểu) | P0 | Cần môi trường thật để chạy E2E | E2E-on-staging gate |
| R1-3 | Viết E2E suite tối thiểu cho 1 luồng vàng: đăng nhập → chọn xe → bắt đầu chuyến đi → thấy vị trí trên dashboard → kết thúc chuyến đi (web, Playwright) | P0 | Đây là gate còn thiếu duy nhất giữa CI hiện tại và yêu cầu gốc của `TEST_STRATEGY.md` §3 | Merge-to-main gate đầy đủ |
| R1-4 | ✅ Rate limiting cho login + GPS event (batch sync N/A — endpoint chưa tồn tại, xem `OPEN_ITEMS_AFTER_MVP.md` §5) | P1 | FR-REALTIME-04/NFR-API-01 chưa hiện thực hoá, rủi ro abuse trước khi có traffic thật | — |
| R1-5 | ✅ Mobile Trip Cockpit: thêm map view thật (chốt OQ-006) | P1 | Gap giữa `docs/ARCHITECTURE.md` §5.1 và implementation thật — cockpit hiện chỉ có text | — |
| R1-6 | ✅ Benchmark chi phí `gps_event_dedup` (xem `docs/performance/GPS_EVENT_DEDUP_BENCHMARK.md`) | P2 | Xác nhận idempotency design chịu được tải trước khi có traffic thật | — |
| R1-7 | ✅ Technical spike tile provider (OQ-005: Protomaps vs Mapbox) — chốt Protomaps, xem `docs/architecture/TDR-tile-provider-spike.md` | P2 | Cần trước khi đổi Leaflet → MapLibre GL JS (TDR-002) | Migrate Leaflet → MapLibre GL JS cố ý chưa làm — việc riêng ngoài phạm vi spike |
| R1-8 | Đánh giá biometric provider thật (FR-BIOMETRIC-05) | P2 | Không khẩn cấp cho staging nội bộ — mock vẫn dùng được | — |

**Đề xuất thứ tự làm:** R1-1 → R1-2 → R1-3 trước (đây là nhóm P0, mở khoá E2E-on-staging gate thật sự); R1-4/R1-5 làm song song nếu có nhân lực; R1-6/7/8 để cuối sprint hoặc sang R2 nếu hết thời gian.

## 4. Checklist tạo GitHub Release từ tag `v0.1.0-mvp-baseline`

> Đề xuất — chưa thực hiện. Tạo GitHub Release là hành động public/visible, cần xác nhận riêng trước khi bấm publish.

- [ ] Xác nhận tag `v0.1.0-mvp-baseline` đã có trên `main` (đã push).
- [ ] Xác nhận `main` đã có `docs/releases/RELEASE_NOTES_v0.1.0.md` (PR #4 — chờ merge).
- [ ] Tạo Release trên GitHub từ tag `v0.1.0-mvp-baseline`:
  - Title: `v0.1.0 — MVP Baseline`.
  - Description: copy/paste nội dung `docs/releases/RELEASE_NOTES_v0.1.0.md` (hoặc link tới file trong repo).
  - Đánh dấu **"Set as a pre-release"** — đây là MVP baseline nội bộ, chưa phải bản phát hành ra người dùng cuối.
  - Không đính kèm build artifact nào (APK/exe) trừ khi có yêu cầu riêng — MVP chưa có quy trình build/ký release chính thức.
- [ ] Review lại danh sách "Đã hoãn" trong release notes (8.1 AR, E2E-on-staging) trước khi publish — đảm bảo không gây hiểu nhầm là "hoàn chỉnh 100%".
- [ ] Sau khi publish, thông báo trong kênh nội bộ dự án kèm link Release + link `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`.

## 5. Đề xuất Branch Protection cho `main`/`develop`

> Đề xuất — hiện tại **chưa có protection nào** trên cả hai nhánh (đã kiểm tra qua GitHub API). Đây là khuyến nghị, cần xác nhận riêng trước khi áp dụng (thay đổi setting repo).

| Rule | `main` | `develop` | Lý do |
|---|---|---|---|
| Require PR trước khi merge (no direct push) | ✅ Bắt buộc | ✅ Bắt buộc | Đã là quy trình thực tế xuyên suốt dự án (mọi merge đều qua PR) — protection chỉ enforce việc đã làm |
| Require status check `CI / Backend + Web + shared-types` pass | ✅ Bắt buộc | ✅ Bắt buộc | Đúng mục đích `9.2` — PR fail nếu test fail |
| Require status check `CI / Mobile` pass | ✅ Bắt buộc | ✅ Bắt buộc | Tương tự |
| Require branch up-to-date trước khi merge | ✅ Nên bật | ⚪ Tuỳ chọn | Tránh merge code đã lỗi thời trên `main`; `develop` có thể lỏng hơn vì tốc độ merge nhanh hơn |
| Require review approval (số người) | ⚪ Tuỳ team size | ⚪ Tuỳ team size | Dự án hiện có 1 người — bật review bắt buộc sẽ tự khoá chính mình; chỉ bật khi có ≥2 người maintain |
| Cấm force-push | ✅ Bắt buộc | ✅ Bắt buộc | Bảo vệ lịch sử — đặc biệt quan trọng sau khi có tag release trên `main` |
| Cấm xoá nhánh | ✅ Bắt buộc | ✅ Bắt buộc | — |

**Ghi chú:** "Require review approval" nên để trống/0 cho tới khi có thêm người maintain — bật ngay bây giờ sẽ khoá luôn khả năng tự merge PR của chính mình.

## 6. Definition of Done cho Sprint R1

- [x] R1-1, R1-2, R1-3 hoàn tất — có staging thật (Railway backend + Vercel web) + luồng E2E vàng chạy pass thật trên đó (07/2026).
- [x] `docs/TEST_STRATEGY.md` §3 được cập nhật để phản ánh đúng trạng thái mới (không còn ghi "chưa triển khai" cho phần đã xong).
- [x] `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` được cập nhật — mục nào xong thì đánh dấu, không xoá lịch sử.
- [x] Không có tính năng sản phẩm mới nào được thêm ngoài danh sách ở mục 3.

**Ghi chú:** R1-8 (P2) vẫn còn mở, chưa bắt đầu — xem mục 3.
