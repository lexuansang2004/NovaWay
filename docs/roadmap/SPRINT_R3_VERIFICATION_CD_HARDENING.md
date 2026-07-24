# NovaWay — Sprint R3: Real-Device Verification & CD Hardening

> Sprint thứ ba sau `Sprint R2: Product Completion & Ops Follow-through` (`docs/roadmap/SPRINT_R2_PRODUCT_COMPLETION.md`, hoàn tất 07/2026). R2 đã đóng toàn bộ gap sản phẩm còn lại từ MVP + tự động hoá CD; ngay khi lên kế hoạch R3, phát hiện thêm **2 sự cố CD thật đang diễn ra** (Railway deploy bị deadlock, Vercel Production Branch bị revert khỏi `develop` — cả hai đã sửa trước khi viết doc này, xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §2/§6). R3 tập trung đóng các khoản nợ "verify bằng thiết bị/trình duyệt thật" còn treo từ R2, và bổ sung một lớp phòng vệ để các sự cố CD kiểu "âm thầm lệch, không ai biết" như vừa gặp không tái diễn mà không bị phát hiện.

## 1. Sprint Goal

Đóng các khoản nợ verify thật còn treo từ R2 (GPS thiết bị thật, trình duyệt/thiết bị thật cho mobile map) và thêm cơ chế tự phát hiện khi CD lệch trạng thái (thay vì chỉ phát hiện tình cờ khi lên kế hoạch sprint tiếp theo, như vừa xảy ra). Việc mở rộng tính năng sản phẩm (biometric capture UI thật, terrain-warnings endpoint) làm sau khi các khoản nợ verify đã đóng.

## 2. Ngoài phạm vi (Out of Scope)

- **Step `8.1` (AR Terrain Mesh Prototype)** — vẫn hoãn, chưa có Unity + thiết bị AR thật (`docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §1).
- **Production hosting** (khác staging) — đưa vào backlog R3 ở mức P2 (R3-6, chỉ đánh giá/quyết định), chưa triển khai thật trong sprint này trừ khi có nhân lực dư.
- **Tinh chỉnh rate limit dựa trên traffic thật** — chưa có traffic sản xuất thật để đo, giữ nguyên giá trị thận trọng từ R1-4.
- **Xác minh `btree_gist` trên production host cuối cùng** — phụ thuộc R3-6, chưa cần nếu R3-6 chưa chốt.
- **Bất kỳ tính năng sản phẩm mới nào** không nằm trong danh sách ở mục 3.

## 3. Backlog (ưu tiên theo mức độ "đang là gap thật, đã bị chứng minh là im lặng không ai biết")

Nguồn: `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`, cuộc điều tra CD ngay trước khi viết doc này. Không mục nào ở đây được triển khai trong lúc viết doc — đây là kế hoạch, chờ xác nhận trước khi bắt đầu từng mục (giữ đúng micro-step workflow: branch riêng → implement → verify thật → commit → PR → merge, xác nhận riêng ở mỗi bước, như R1/R2).

| # | Việc | Ưu tiên | Vì sao | Phụ thuộc / Rủi ro |
|---|---|---|---|---|
| R3-1 | Verify GPS thật trên thiết bị mobile thật cho pipeline LiveMapPage (`apps/mobile`'s Trip Cockpit đọc GPS thật → backend → `apps/web`'s LiveMapPage) | P0 | Nợ từ R2-1 (`OPEN_ITEMS_AFTER_MVP.md` §9) — verify hiện tại chỉ dùng toạ độ gõ tay vào script test giả lập mobile, chưa từng chạy hết đường link qua Geolocation API thật của một thiết bị thật | Cần thiết bị Android/iOS thật hoặc emulator có mock-location đúng toạ độ thật — chưa xác nhận có sẵn trong môi trường làm việc, có thể cần thiết bị của người dùng |
| R3-2 | Verify mobile MapLibre (`apps/mobile`'s Trip Cockpit map, R2-4) trên trình duyệt thật của người dùng + thiết bị Android/iOS thật | P1 | Nợ từ R2-4 (`OPEN_ITEMS_AFTER_MVP.md` §7) — verify trước đó chạy qua Browser pane tự động (`flutter run -d chrome`), chưa phải trình duyệt/thiết bị thật của người dùng | Cùng phụ thuộc thiết bị thật như R3-1 — có thể gộp chung một đợt verify thiết bị |
| R3-3 | Thêm cơ chế kiểm tra định kỳ "CD health": xác nhận bundle web đang chạy production khớp commit mới nhất của `develop`, và backend `/health` phản ánh đúng version | P1 | Bài học trực tiếp từ 2 sự cố thật vừa gặp (Railway CI-deadlock, Vercel Production Branch bị revert) — cả hai đều **không có bất kỳ cảnh báo tự động nào**, chỉ phát hiện được nhờ kiểm tra tay khi lên kế hoạch sprint tiếp theo. Không có cơ chế này, sự cố tương tự có thể tái diễn và không ai biết trong nhiều tuần | Cần quyết định thiết kế cụ thể khi bắt đầu: thêm commit SHA vào `GET /health` response + so sánh với `develop` HEAD trong `e2e-staging.yml` (đã có, chạy theo lịch từ R2-7) là hướng khả thi nhất, không cần thêm hạ tầng mới — sẽ hỏi nếu có phương án khác đáng cân nhắc |
| R3-4 | Xây UI capture khuôn mặt thật trên `apps/mobile` (tích hợp AWS Amplify Face Liveness SDK) để flow session của R2-6 (`POST /verify/session` → capture → `POST /verify`) dùng được thật, end-to-end | P2 | Hiện chưa có client nào (web hay mobile) gọi được trọn vẹn flow này — R2-6 chỉ xác nhận backend↔AWS hoạt động đúng qua HTTP trực tiếp, không phải qua UI thật (`OPEN_ITEMS_AFTER_MVP.md` §4) | Việc lớn nhất trong backlog này — cần tích hợp SDK bên thứ 3 (Amplify) vào `apps/mobile`, đòi hỏi thiết kế UI/UX mới, không chỉ nối API. Có thể cần tách thành sprint riêng nếu ước lượng công việc lớn hơn dự kiến |
| R3-5 | Implement `GET /api/terrain-warnings` (có hợp đồng tài liệu ở `docs/API_CONTRACT.md` §9 và `docs/ARCHITECTURE.md` §3.1 `TerrainWarningsModule`, chưa từng build) | P2 | Phát hiện tình cờ ở R2-2, chưa đánh giá mức ưu tiên sản phẩm — cần xác nhận có còn cần thiết theo đúng tinh thần sản phẩm hiện tại hay không trước khi build | Chưa rõ phạm vi dữ liệu địa hình thật sẽ lấy từ đâu — có thể cần quyết định nguồn dữ liệu trước khi implement, tương tự cách đã làm với routing engine (`docs/architecture/TDR-routing-engine.md`) |
| R3-6 | Quyết định production hosting (khác staging hiện tại) | P2 | Vẫn mở từ R1 (`OPEN_ITEMS_AFTER_MVP.md` §6) — Fly.io được ghi nhận là ứng viên đánh giá lại qua TDR riêng khi cần scale | Có thể chỉ dừng ở mức quyết định/TDR trong sprint này, chưa cần triển khai thật nếu chưa có áp lực traffic/người dùng thật |

**Đề xuất thứ tự làm:** R3-1 trước tiên (P0, gap verify lớn nhất còn lại từ MVP golden path) → R3-2 ngay sau (cùng phụ thuộc thiết bị thật, nên gộp chung một đợt) → R3-3 (P1, đóng lỗ hổng vận hành vừa phát hiện, không phụ thuộc thiết bị) → R3-4/R3-5/R3-6 (P2) cuối sprint hoặc sang R4 nếu hết thời gian.

## 4. Definition of Done cho Sprint R3

- [ ] R3-1 hoàn tất — GPS thật từ thiết bị mobile thật xác nhận đúng trên `LiveMapPage`, không còn phụ thuộc toạ độ gõ tay trong script test.
- [ ] R3-3 hoàn tất — có cơ chế phát hiện tự động khi bundle/deploy production lệch khỏi `develop` HEAD, không chỉ phụ thuộc kiểm tra tay.
- [ ] `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` được cập nhật — mục nào xong thì đánh dấu ✅, không xoá lịch sử.
- [ ] Không có tính năng sản phẩm mới nào được thêm ngoài danh sách ở mục 3.

**Ghi chú:** R3-2 (P1) nên đi cùng R3-1 vì cùng phụ thuộc thiết bị thật — nếu không có thiết bị trong sprint này, cả hai cùng bị đẩy sang R4, không tách riêng. R3-4/R3-5/R3-6 (P2) có thể kéo dài sang R4 nếu hết thời gian — DoD chỉ bắt buộc R3-1/R3-3 để coi sprint là thành công tối thiểu.
