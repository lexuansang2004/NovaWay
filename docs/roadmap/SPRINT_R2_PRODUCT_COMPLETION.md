# NovaWay — Sprint R2: Product Completion & Ops Follow-through

> Sprint thứ hai sau `Sprint R1: Stabilization & Staging` (`docs/roadmap/SPRINT_R1_STABILIZATION.md`, hoàn tất 07/2026). R1 đã dựng staging thật + gate CI/CD; R2 tập trung **đóng các gap sản phẩm còn lại từ MVP** (LiveMapPage mock, batch sync chưa build, tile provider/biometric provider mới chỉ dừng ở quyết định) trước khi tiếp tục hoàn thiện quy trình vận hành.

## 1. Sprint Goal

Đưa golden path "đăng nhập → chọn xe → bắt đầu chuyến đi → thấy vị trí trên dashboard → kết thúc chuyến đi" chạy **thật 100% qua UI** (không còn `useMockGpsSender` phía client) và đóng các quyết định kỹ thuật đã chốt ở R1 (Protomaps, AWS Rekognition) thành code thật — có kiểm chứng. Ops follow-through (CD tự động, branch protection, GitHub Release) làm sau khi các gap sản phẩm đã đóng, không mở rộng phạm vi sản phẩm.

## 2. Ngoài phạm vi (Out of Scope)

- **Step `8.1` (AR Terrain Mesh Prototype)** — vẫn hoãn, chưa có Unity + thiết bị AR thật (`docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §1).
- **Production hosting** (khác staging) — chưa cần tới, Railway/Vercel staging đủ dùng cho giai đoạn này (`OPEN_ITEMS_AFTER_MVP.md` §6).
- **Tinh chỉnh rate limit dựa trên traffic thật** — chưa có traffic sản xuất thật để đo, giữ nguyên giá trị thận trọng từ R1-4 cho tới khi có dữ liệu thật.
- **Xác minh `btree_gist` trên production host cuối cùng** — phụ thuộc quyết định production hosting, chưa cần.
- **Bất kỳ tính năng sản phẩm mới nào** không nằm trong backlog gốc (`NovaWay_COMPLETE_MICRO_STEP_PLAN.md`) hoặc danh sách ở mục 3.

## 3. Backlog (ưu tiên theo mức độ chặn golden path thật)

Nguồn: `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`. Theme đã xác nhận: **đóng gap sản phẩm trước, ops hardening sau**. Không mục nào ở đây được triển khai trong lúc viết doc này — đây là kế hoạch, chờ xác nhận trước khi bắt đầu từng mục (giữ đúng micro-step workflow đã dùng xuyên suốt R1: branch riêng → implement → verify thật → commit → PR → merge, xác nhận riêng ở mỗi bước).

| # | Việc | Ưu tiên | Vì sao | Phụ thuộc / Rủi ro |
|---|---|---|---|---|
| R2-1 | ⚠️ Nối `apps/web`'s `LiveMapPage` vào API thật — xong về code/pipeline, **CHƯA verify với GPS thật** — xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §9 | **P0** | Golden path hiện chỉ "thật" khi test qua E2E gọi thẳng REST/WS — qua UI thật vẫn là `useMockGpsSender` (`OPEN_ITEMS_AFTER_MVP.md` §9). Đây là gap sản phẩm lớn nhất còn lại từ MVP | **Quyết định phạm vi khi làm:** web chỉ xem live (poll `GET /trips` + join phòng WebSocket của trip active), không có nút bắt đầu/kết thúc — biometric verify (FR-BIOMETRIC-01) vẫn chỉ ở mobile. **Còn nợ:** verify lại bằng thiết bị/emulator mobile thật có vị trí GPS thật (không phải toạ độ gõ tay trong script test) — xem cảnh báo ⚠️ ở `OPEN_ITEMS_AFTER_MVP.md` §9, chưa có thiết bị thật trong môi trường hiện tại |
| R2-2 | ✅ Build `POST /api/trips/sync` (batch sync) — xem `docs/API_CONTRACT.md` §7, `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §5 | P1 | Hoàn thành phần "N/A" của R1-4 — endpoint hiện chỉ có hợp đồng tài liệu, chưa từng implement (`OPEN_ITEMS_AFTER_MVP.md` §5) | **Phát hiện + sửa khi làm:** Express body-parser mặc định giới hạn 100KB, quá nhỏ cho batch 500 events thực tế — 500 events đầu tiên gửi thật trả `500 INTERNAL_ERROR` thay vì `400 BATCH_TOO_LARGE`; đã nâng lên 1MB (`apps/backend/src/main.ts`), verify lại đúng. Phát hiện thêm ngoài phạm vi: `GET /api/terrain-warnings` cũng có hợp đồng tài liệu nhưng chưa implement — ghi ở `OPEN_ITEMS_AFTER_MVP.md` §10, chưa build (ngoài phạm vi R2-2) |
| R2-3 | Migrate `apps/web`'s `TripMap.tsx`: Leaflet → MapLibre GL JS + wire Protomaps hosted API thật | P1 | Đóng quyết định đã chốt ở R1-7 (`docs/architecture/TDR-tile-provider-spike.md`) thành code thật; cần verify trực quan trong browser | Cần tạo API key/config Protomaps hosted API (miễn phí, tự phục vụ — không có rào cản) |
| R2-4 | Migrate `apps/mobile`'s `flutter_map` → `maplibre_gl` song song với R2-3 | P1 | Đồng bộ tile source giữa web/mobile, đóng nốt phần "sẽ đổi" đã ghi ở OQ-006 (`OPEN_ITEMS_AFTER_MVP.md` §7) | Nên làm sau R2-3 để tránh 2 tile source khác nhau tồn tại song song lâu |
| R2-5 | Tự động hoá E2E-on-staging: job/schedule CI chạy lại `golden-path.spec.ts` nhắm domain Vercel + Railway thật sau mỗi lần deploy | P1 | Hiện chỉ chạy thủ công nhắm staging thật; gate CI hiện tại (`e2e` job) chạy nhắm Postgres dựng trong runner, không phải staging thật (`OPEN_ITEMS_AFTER_MVP.md` §2) | Cần quyết định trigger: sau mỗi push `develop`, theo lịch (cron), hay thủ công qua `workflow_dispatch` — sẽ hỏi khi bắt đầu R2-5 nếu chưa rõ |
| R2-6 | Implement `AwsRekognitionBiometricProvider` thật (đóng quyết định R1-8) — verify kỹ thuật bằng AWS sandbox/test credential | P2 | Đóng quyết định đã chốt ở R1-8 (`docs/architecture/TDR-biometric-provider-spike.md`) thành code thật | **Không bật trong staging thật xử lý dữ liệu người dùng thật** cho tới khi có xác nhận ToS/DPA với AWS (việc pháp lý, ngoài phạm vi kỹ thuật) — code sẵn sàng nhưng để sau `MockBiometricProvider` qua feature flag/config cho tới khi xác nhận xong |
| R2-7 | CD tự động: auto-deploy Vercel/Railway khi merge `develop` + tự chạy lại E2E-on-staging sau deploy | P2 | Hoàn thiện phần "CD thủ công" còn lại của R1-1/R1-2 (`OPEN_ITEMS_AFTER_MVP.md` §6) | Phụ thuộc R2-5 (cần job E2E-on-staging tồn tại trước khi tự động hoá trigger sau deploy) |
| R2-8 | Áp dụng Branch Protection rules cho `main`/`develop` theo đề xuất đã viết ở `SPRINT_R1_STABILIZATION.md` §5 | P2 | Đề xuất đã có từ R1, chưa từng bấm áp dụng thật (đã xác nhận qua GitHub API: cả 2 nhánh vẫn "Branch not protected") | Thay đổi setting repo — cần xác nhận riêng trước khi áp dụng (đúng nguyên tắc "explicit permission required" cho thay đổi cấu hình tài khoản) |
| R2-9 | Publish GitHub Release `v0.1.0-mvp-baseline` theo checklist đã viết ở `SPRINT_R1_STABILIZATION.md` §4 | P2 | Checklist đã có từ trước R1, chưa từng thực hiện — hành động public/visible | Cần xác nhận riêng trước khi publish (đúng nguyên tắc "explicit permission required" cho nội dung public) |

**Đề xuất thứ tự làm:** R2-1 trước tiên (P0, gap sản phẩm lớn nhất) → R2-2/R2-3/R2-4/R2-5 (P1, có thể xen kẽ tuỳ nhân lực, R2-4 nên theo sau R2-3) → R2-6/R2-7/R2-8/R2-9 (P2) cuối sprint hoặc sang R3 nếu hết thời gian.

## 4. Definition of Done cho Sprint R2

- [ ] R2-1 hoàn tất — golden path chạy thật 100% qua UI thật (không còn `useMockGpsSender`), verify bằng browser thật (không chỉ E2E gọi thẳng REST/WS).
- [x] R2-2 hoàn tất — `POST /api/trips/sync` hoạt động đúng contract, có rate limit, có test.
- [ ] `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` được cập nhật — mục nào xong thì đánh dấu ✅, không xoá lịch sử (đúng phong cách đã dùng xuyên suốt R1).
- [ ] Không có tính năng sản phẩm mới nào được thêm ngoài danh sách ở mục 3.

**Ghi chú:** R2-3 đến R2-9 (P1/P2) có thể kéo dài sang R3 nếu hết thời gian trong sprint — DoD chỉ bắt buộc R2-1/R2-2 (P0/gap batch sync) để coi sprint là thành công tối thiểu.
