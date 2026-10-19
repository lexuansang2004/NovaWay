# WEB-10 — Content map trang Trợ giúp `/help`

> Truy vết từng heading, đoạn và hướng dẫn trên `/help` → requirement/AC → nguồn `path:dòng`. Tất cả số dòng tính tại base `fbed87272d4f32b29adcb35ef12a587925e11603` (`origin/develop` khi bắt đầu WEB-10), trừ khi ghi khác.
>
> Nội dung trên trang nằm ở `apps/web/src/pages/helpContent.ts`, mỗi câu có một id `H-xx`. Sửa một câu thì sửa cả ở đây, và chỉ khi hành vi sản phẩm mà câu đó mô tả đã đổi.
>
> Vòng review 1 (2026-10-19, PR #97): H-02, H-03 và H-23 được viết lại cho đúng mã nguồn (R02, R03, N01); quy tắc fragment thêm theo R01. Không đổi hành vi xác thực để khớp câu chữ. Chi tiết: `docs/REVIEW_NOTES.md` §64.
>
> Requirement: `docs/SRS.md:181–183` (FR-WEBHELP-01…03). AC: `docs/ACCEPTANCE_CRITERIA.md:382–407` (AC-WEBHELP-01…05). Ràng buộc nội dung: `docs/web/WEB_ACCOUNT_RWD_SPEC.md:181–194` (§4.5), WEB-G07 (`WEB_ACCOUNT_RWD_SPEC.md:42`), WEB-D05 (`:72`).

## 1. Khung trang

| Phần tử | Nội dung | Requirement/AC | Nguồn |
|---|---|---|---|
| Route | `/help` trong `AppLayout` (cùng auth guard với mọi route bảo vệ) | FR-WEBHELP-01 | `apps/web/src/App.tsx:30` (placeholder thay bằng `HelpPage`), `apps/web/src/layouts/AppLayout.tsx:16–46` (`main` là vùng cuộn, `:44`) |
| Lối vào | Menu tài khoản → "Trợ giúp" | FR-WEBHELP-01 | `apps/web/src/components/layout/Sidebar.tsx:160–161` |
| `h1` | "Trợ giúp" | AC-WEBHELP-05 | Tên menu `Sidebar.tsx:161`; tiêu đề placeholder cũ `App.tsx:30` |
| Đoạn mở đầu | "Hướng dẫn ngắn cho các chức năng đang có trên trang web NovaWay. Chọn một mục để đi tới phần tương ứng." | FR-WEBHELP-02 (chỉ nói chức năng đang có) | Spec §4.5 `WEB_ACCOUNT_RWD_SPEC.md:183` |
| Mục lục | `nav` "Mục lục trợ giúp", danh sách đánh số 6 mục theo đúng thứ tự §4.5; mỗi mục là link `#id` tới heading của mục | AC-WEBHELP-05 | Spec §4.5 `WEB_ACCOUNT_RWD_SPEC.md:183, 185–192` |
| Heading mục | 6 `h2`, mỗi `h2` là đích của link (focus được bằng chương trình, `tabIndex=-1`) | AC-WEBHELP-05 | Như trên |
| Fragment trong URL | Chỉ id của 6 mục Help là đích; fragment hỏng (ví dụ `#%`, chuỗi UTF-8 bị cắt), rỗng hoặc id khác trong trang không phải đích: trang Help vẫn hiển thị, không đổi focus | AC-WEBHELP-05; review R01 | `apps/web/src/pages/HelpPage.tsx` (`sectionFromHash`); ErrorBoundary toàn app `apps/web/src/main.tsx:15–17`, `apps/web/src/components/ErrorBoundary.tsx:18–40` |
| Link route | Một link mỗi chủ đề có "Route đích" trong §4.5; đi qua router và auth guard hiện có | FR-WEBHELP-01, AC-WEBHELP-02, -05 | `WEB_ACCOUNT_RWD_SPEC.md:187–191`; route `App.tsx:18, 23–25, 29` |

## 2. Từng câu

### 2.1. Đăng nhập và phiên đăng nhập (`#dang-nhap`) → link "Mở trang Đăng nhập" `/login`

| Id | Câu trên trang (tóm tắt) | Requirement/AC | Nguồn sự thật |
|---|---|---|---|
| H-01 | Đăng nhập bằng email và mật khẩu tại trang Đăng nhập | FR-WEBHELP-01 | `apps/web/src/components/auth/LoginForm.tsx:53, 60, 75`; route `App.tsx:18` |
| H-02 | NovaWay kiểm tra phiên với máy chủ khi bạn mở hoặc tải lại trang web ở một trang cần đăng nhập, hoặc ngay sau khi đăng nhập; chuyển giữa các trang trong ứng dụng không kiểm tra lại mỗi lần; máy chủ báo phiên không còn hợp lệ → về trang Đăng nhập | FR-WEBHELP-01; AC-WEBHELP-03 (phiên hết hạn); review R02 | Kiểm khi `AppLayout` mount: `apps/web/src/services/useSessionCheck.ts:13–17, 27–32` (effect dependency rỗng), `AppLayout.tsx:17`; các route con dùng chung một `AppLayout`: `App.tsx:21–36`; sau đăng nhập `LoginPage.tsx:21–22` chuyển tới `/dashboard` (mount `AppLayout`); 401 → xoá phiên và về `/login`: `authService.ts:59–64`, `authSession.ts:135–141`, `AppLayout.tsx:37–38` |
| H-03 | Chưa kiểm tra được phiên (ví dụ mất mạng, máy chủ sự cố, chờ quá lâu) → thông báo + "Thử lại" và "Đăng nhập lại"; các lỗi này tự chúng không đăng xuất; "Thử lại" mà máy chủ báo phiên không còn hợp lệ → về trang Đăng nhập; "Đăng nhập lại" là chủ động bỏ phiên hiện tại | AC-WEBHELP-03; review R03 | Màn lỗi và hai nút: `apps/web/src/components/auth/SessionCheckError.tsx:8–12, 33, 38, 41`, `AppLayout.tsx:27–35`; lỗi khác 401 giữ token: `authSession.ts:143–149`; quá 15 giây: `authSession.ts:24, 120–126`; "Thử lại" chạy lại kiểm tra: `authSession.ts:174–176`, kết quả 401 → xoá đúng token đó và `unauthenticated`: `authService.ts:59–64`, `authSession.ts:135–141`, `AppLayout.tsx:37–38`; "Đăng nhập lại" = `endLocalSession`: `authSession.ts:188–195` |
| H-04 | Phiên còn hợp lệ thì mở trang Đăng nhập sẽ tự về Dashboard | FR-WEBHELP-01 (link `/login` đi qua hành vi auth hiện có) | `apps/web/src/pages/LoginPage.tsx:21–22` |
| H-05 | Không gửi mật khẩu hoặc mã đăng nhập cho bất kỳ ai; chỉ nhập mật khẩu tại trang Đăng nhập | FR-WEBHELP-03; AC-WEBHELP-03; spec `:187` | Spec §4.5 `WEB_ACCOUNT_RWD_SPEC.md:187` |

### 2.2. Quản lý phương tiện (`#phuong-tien`) → link "Mở Quản lý phương tiện" `/vehicles`

| Id | Câu trên trang (tóm tắt) | Requirement/AC | Nguồn sự thật |
|---|---|---|---|
| H-06 | Trang liệt kê các xe của bạn | AC-WEBHELP-02 | `apps/web/src/pages/VehiclesPage.tsx:106–107` |
| H-07 | Thêm: "Thêm phương tiện" → Loại xe (Xe máy/Ô tô), Biển số (bắt buộc), Hãng/Dòng xe tuỳ ý → "Lưu" | AC-WEBHELP-02 | `VehiclesPage.tsx:115`; `apps/web/src/components/vehicles/VehicleForm.tsx:44, 52–53, 59, 66, 73, 93` |
| H-08 | Sửa: nút Sửa (bút chì) ở dòng của xe → "Lưu" | AC-WEBHELP-02 | `VehiclesPage.tsx:215, 219`; `VehicleForm.tsx:93` |
| H-09 | Xoá: nút Xoá (thùng rác) → hỏi "Xoá phương tiện này?" → "Xoá"; "Huỷ" để đổi ý | AC-WEBHELP-02 | `VehiclesPage.tsx:224, 228, 174, 187, 196` |
| H-10 | "Đặt đang dùng" → nhãn "Đang hoạt động"; mỗi lúc một xe, xe trước tự bỏ nhãn; xe mới thêm chưa phải xe đang dùng | AC-WEBHELP-02 | `VehiclesPage.tsx:165–167, 201–209`; `apps/backend/src/vehicles/vehicles.service.ts:29, 53–54`; `docs/API_CONTRACT.md:79–81` |
| H-11 | Nhãn "Đang hoạt động" chỉ là xe bạn chọn dùng, không có nghĩa xe đang di chuyển hay đang có chuyến | Handoff WEB-10 (không coi xe active là bằng chứng có chuyến); FR-WEBHELP-02 | Trạng thái chuyến tách khỏi xe: `apps/web/src/services/useLiveTrip.ts:69` (chuyến active lấy từ danh sách chuyến, không từ xe) |

### 2.3. Xem vị trí chuyến đi (`#vi-tri`) → link "Mở Vị trí trực tiếp" `/start-trip`

| Id | Câu trên trang (tóm tắt) | Requirement/AC | Nguồn sự thật |
|---|---|---|---|
| H-12 | Trang chỉ để xem chuyến đang diễn ra; web không có nút bắt đầu/kết thúc; bắt đầu và kết thúc thuộc ứng dụng NovaWay trên điện thoại | AC-WEBHELP-01; FR-WEBHELP-02; spec `:189` | `apps/web/src/pages/LiveMapPage.tsx:12–55` (không có nút/hành động bắt đầu–kết thúc); vai trò mobile theo spec §4.5 `:189` và `docs/ARCHITECTURE.md:90`. **Xem GAP-H1.** |
| H-13 | Có chuyến và đã nhận vị trí → bản đồ, vị trí mới nhất, tốc độ | FR-WEBHELP-01 | `LiveMapPage.tsx:30–51`; `useLiveTrip.ts:101–110` |
| H-14 | Trang tự kiểm tra lại sau vài giây, không cần tải lại khi chuyến vừa bắt đầu | FR-WEBHELP-01 | `useLiveTrip.ts:9, 115` (5 000 ms) |
| H-15 | "Chưa có chuyến đi nào đang diễn ra" có thể là chưa có chuyến, chuyến đã bắt đầu nhưng chưa có vị trí, hoặc trang chưa tải được dữ liệu chuyến; không chắc chắn là không có chuyến | WEB-G07; spec `:189`; AC-WEBHELP-03 | `LiveMapPage.tsx:15, 20`; `useLiveTrip.ts:62–66` (lỗi tải bị bỏ qua tới lượt sau), `:101–110`; spec `WEB_ACCOUNT_RWD_SPEC.md:42` |
| H-16 | Hai nhãn mất kết nối → vị trí có thể chưa mới nhất trong lúc trang tự kết nối lại | AC-WEBHELP-03 | `LiveMapPage.tsx:5–10, 43–48`; `useLiveTrip.ts:90–99` |

### 2.4. Lịch sử và thống kê chuyến đi (`#lich-su`) → link "Mở Lịch sử chuyến đi" `/trip-history`

| Id | Câu trên trang (tóm tắt) | Requirement/AC | Nguồn sự thật |
|---|---|---|---|
| H-17 | Chỉ tính chuyến đã kết thúc | Spec `:190` (chỉ mô tả cái đang có) | `apps/web/src/pages/AnalyticsPage.tsx:64–67` |
| H-18 | Bộ lọc Tất cả / Xe máy / Ô tô | Spec `:190` | `AnalyticsPage.tsx:23–25, 70–74` |
| H-19 | Ô tổng: Tổng quãng đường, Tổng thời gian, số Cảnh báo an toàn của chuyến khớp bộ lọc | Spec `:190` (không thêm metric) | `AnalyticsPage.tsx:88–97, 139–141` |
| H-20 | Biểu đồ: quãng đường (km, trục trái), thời gian (phút, trục phải); cột đỏ = chuyến có cảnh báo an toàn | Spec `:190` | `AnalyticsPage.tsx:148, 152, 181` |
| H-21 | Không cần rê chuột: mở "Đọc số liệu từng chuyến" bằng bàn phím hoặc chạm | Spec `:190` | `AnalyticsPage.tsx:182–184` (`<details>`) |
| H-22 | Không có chuyến phù hợp → "Chưa có chuyến đi nào đã kết thúc phù hợp bộ lọc." | Spec `:190` | `AnalyticsPage.tsx:135` |

### 2.5. Quyền riêng tư (`#quyen-rieng-tu`) → link "Mở trang Quyền riêng tư" `/account/privacy`

| Id | Câu trên trang | Requirement/AC | Nguồn sự thật |
|---|---|---|---|
| H-23 | "Mở trang Quyền riêng tư từ liên kết bên dưới." | Spec `:191` (chỉ link; nội dung theo §4.3 / WEB-11, Privacy Content Gate còn mở); review N01 | Route `App.tsx:29` (còn `ComingSoonPage`, `apps/web/src/pages/ComingSoonPage.tsx:11`); menu `Sidebar.tsx:154–155` |

Không viết chính sách, thời hạn lưu, nhà cung cấp hay đầu mối liên hệ nào ở đây.

### 2.6. Lỗi thường gặp (`#loi-thuong-gap`) → link trong trang "Đi tới mục Xem vị trí chuyến đi" `#vi-tri`

| Id | Câu trên trang (tóm tắt) | Requirement/AC | Nguồn sự thật |
|---|---|---|---|
| H-24 | Mất mạng: trang có thể báo không tải được dữ liệu hoặc chưa kiểm tra được phiên; kiểm tra mạng rồi tải lại trang; nếu có nút "Thử lại" thì có thể chọn | AC-WEBHELP-03; spec `:192` | `VehiclesPage.tsx:57`; `AnalyticsPage.tsx:52`; `SessionCheckError.tsx:8, 38` (nút "Thử lại" chỉ có ở màn kiểm tra phiên) |
| H-25 | Phiên hết hạn: bị đưa về trang Đăng nhập thì đăng nhập lại bằng email và mật khẩu | AC-WEBHELP-03 | `AppLayout.tsx:38`; `authService.ts:62–63` |
| H-26 | Bản đồ chưa có vị trí: xem mục Xem vị trí chuyến đi | AC-WEBHELP-03; WEB-G07 | Trỏ tới H-15/H-16 |

## 3. Cố ý không có trên trang

| Không có | Lý do | Nguồn |
|---|---|---|
| Kênh liên hệ, ticket, chat, email, số điện thoại, form "gửi thành công" | Chưa có kênh được chủ dự án xác nhận | FR-WEBHELP-03; AC-WEBHELP-04; spec `:194`; WEB-D05 `:72` |
| Mô tả `/offline-sync` | Còn placeholder | FR-WEBHELP-02; spec `:194`; `App.tsx:26` |
| Hướng dẫn bắt đầu/kết thúc chuyến trên web | Web không có chức năng này | AC-WEBHELP-01; `LiveMapPage.tsx` |
| Yêu cầu gửi mật khẩu, JWT, ảnh khuôn mặt; hứa khôi phục dữ liệu hay cấp quyền | Không có cơ chế; cấm theo spec | AC-WEBHELP-03; spec `:187, 192` |
| Nội dung chính sách quyền riêng tư | WEB-11 Privacy Content Gate còn mở | Spec `:191` |
| Số step nội bộ, debug flag, tên API/token | Không dành cho người dùng cuối | Spec `:194` |
| Metric, chỉ số hiệu năng, độ trễ, "thời gian thực" | Không có nguồn đo | Spec `:190`; handoff WEB-10 |

## 4. Khoảng trống phát hiện khi lập map (báo cáo, không tự xử lý)

- **GAP-H1 — vai trò mobile so với hiện trạng mobile.** Spec đã duyệt nói bắt đầu/kết thúc chuyến làm trên mobile (`WEB_ACCOUNT_RWD_SPEC.md:189`), và backend đã có `POST /trips/start`, `POST /trips/:id/end` (`apps/backend/src/trips/trips.controller.ts:19, 26`). Tuy vậy app mobile tại base chưa gọi các API này:
  - nút "Bắt đầu chuyến đi" chỉ mở cockpit (`apps/mobile/lib/screens/home_screen.dart:90–96`);
  - không có `DEBUG_TRIP_ID` thì báo "Trip API chưa sẵn sàng" (`apps/mobile/lib/config/api_config.dart:18–21`, `apps/mobile/lib/screens/trip_cockpit_screen.dart:192–198`);
  - "Dừng" chỉ ngắt luồng vị trí, không kết thúc chuyến (`trip_cockpit_screen.dart:231–241`).

  H-12 vì vậy chỉ nêu phân vai ("thuộc ứng dụng NovaWay trên điện thoại") theo spec, không mô tả các bước trên điện thoại và không nói luồng đó đã hoàn chỉnh. Chủ dự án/Lead quyết định có cần điều chỉnh câu này khi mobile chưa có luồng thật hay không.
- **Quan sát ngoài phạm vi:** empty state hiện có của `LiveMapPage.tsx:21–23` ghi "Bắt đầu chuyến đi từ ứng dụng di động (xác thực khuôn mặt trên điện thoại)…", trong khi mobile tại base còn hoãn xác thực khuôn mặt (`home_screen.dart:7–12, 85`). WEB-10 không sửa trang này.
