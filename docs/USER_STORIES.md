# NovaWay — User Stories v0.1

> Step D0.2. Mỗi story tham chiếu tới `FR-*` liên quan trong `SRS.md` để trace. Định dạng: *Là [vai trò], tôi muốn [hành động], để [lợi ích].*

## 1. Driver (Tài xế)

| ID | Story | Liên quan |
|---|---|---|
| US-D-01 | Là tài xế, tôi muốn đăng ký/đăng nhập nhanh, để bắt đầu dùng app mà không mất nhiều bước. | FR-AUTH-01, FR-AUTH-02 |
| US-D-02 | Là tài xế, tôi muốn thêm phương tiện của mình vào hệ thống, để chọn đúng xe trước mỗi chuyến đi. | FR-VEHICLE-01 |
| US-D-03 | Là tài xế, tôi muốn chọn phương tiện đang hoạt động trước khi đi, để hệ thống biết tôi đang lái xe gì. | FR-VEHICLE-03, FR-VEHICLE-04 |
| US-D-04 | Là tài xế, tôi muốn được giải thích rõ vì sao app cần vị trí của tôi trước khi bật tracking, để tôi yên tâm đồng ý chia sẻ. | FR-TRIP-01, NFR-PRIVACY-01 |
| US-D-05 | Là tài xế, tôi muốn bấm một nút để bắt đầu chuyến đi, để hệ thống theo dõi hành trình từ lúc đó. | FR-TRIP-03 |
| US-D-06 | Là tài xế, tôi muốn app vẫn ghi nhận vị trí khi tôi khoá màn hình hoặc chuyển sang app khác, để chuyến đi không bị gián đoạn giữa chừng. | FR-BGLOC-01 → FR-BGLOC-05 |
| US-D-07 | Là tài xế, tôi muốn biết rõ khi nào app đang theo dõi vị trí ở chế độ nền, để tôi không bất ngờ về việc bị theo dõi. | FR-BGLOC-02 |
| US-D-08 | Là tài xế, tôi muốn app không bị treo hay mất dữ liệu khi tôi đi vào vùng mất sóng, để tôi không phải lo lắng về việc mất lịch sử chuyến đi. | FR-SYNC-01 → FR-SYNC-04, NFR-REL-01 |
| US-D-09 | Là tài xế, tôi muốn app tự động gửi lại dữ liệu khi có mạng trở lại, để tôi không phải làm gì thêm. | FR-SYNC-03 |
| US-D-10 | Là tài xế, tôi muốn thấy cảnh báo rõ ràng, dễ hiểu khi có dấu hiệu sai lệch phương tiện, thay vì bị buộc tội, để tôi có thể xác nhận hoặc sửa lại thông tin. | FR-MISMATCH-01 → FR-MISMATCH-05 |
| US-D-11 | Là tài xế, tôi muốn cảnh báo tự biến mất nếu tôi không rảnh tay phản hồi ngay, để nó không cản trở việc lái xe. | FR-WARNUI-01 → FR-WARNUI-04 |
| US-D-12 | Là tài xế, tôi muốn xem lại các cảnh báo đã nhận được sau chuyến đi, để hiểu chuyện gì đã xảy ra. | FR-WARNUI-05 |
| US-D-13 | Là tài xế, tôi muốn thấy cảnh báo địa hình nguy hiểm trên bản đồ khi đang di chuyển, để chủ động tránh. | FR-AR-01 |
| US-D-14 | Là tài xế, tôi muốn app vẫn hoạt động bình thường (không crash) ngay cả khi điện thoại nóng hoặc trời tối, để không bị gián đoạn vì lý do kỹ thuật. | FR-AR-03, FR-AR-04 |
| US-D-15 | Là tài xế, tôi muốn kết thúc chuyến đi bất kỳ lúc nào chỉ với một thao tác, để kiểm soát hoàn toàn việc app theo dõi tôi. | FR-TRIP-04, FR-BGLOC-06 |
| US-D-16 | Là tài xế, tôi muốn xác thực khuôn mặt nhanh trước khi lái, để hệ thống xác nhận đúng tôi được phép dùng xe này. | FR-BIOMETRIC-01 → FR-BIOMETRIC-03 |
| US-D-17 | Là tài xế đang mượn xe, tôi muốn thấy rõ tôi đang mượn xe của ai và còn hiệu lực bao lâu, để chủ động biết khi nào cần trả xe hoặc gia hạn. | FR-AUTHZ-04 |
| US-D-18 | Là tài xế đang mượn xe, tôi muốn được thông báo rõ nếu chủ xe thu hồi quyền sử dụng, thay vì bị chặn đột ngột không rõ lý do. | FR-AUTHZ-03 |

## 2. Vehicle Owner (Chủ phương tiện)

| ID | Story | Liên quan |
|---|---|---|
| US-O-01 | Là chủ xe, tôi muốn biết ai đang sử dụng xe của mình, để yên tâm khi cho mượn xe. | FR-VEHICLE-01, FR-TRIP-05 |
| US-O-02 | Là chủ xe, tôi muốn xoá hoặc cập nhật thông tin xe khi cần, để dữ liệu luôn chính xác. | FR-VEHICLE-01 |
| US-O-03 | Là chủ xe, tôi muốn cấp quyền sử dụng xe cho người khác trong một khoảng thời gian cụ thể, để kiểm soát rõ ai được mượn xe và trong bao lâu. | FR-AUTHZ-01 |
| US-O-04 | Là chủ xe, tôi muốn thu hồi quyền sử dụng bất kỳ lúc nào, để xử lý ngay khi có tình huống bất thường. | FR-AUTHZ-03 |
| US-O-05 | Là chủ xe, tôi muốn dùng xe của chính mình mà không cần xin quyền từ ai, để không bị làm phiền bởi chính cơ chế bảo vệ mà tôi thiết lập. | FR-AUTHZ-05 |

## 3. Dashboard User / Fleet Operator

| ID | Story | Liên quan |
|---|---|---|
| US-F-01 | Là người quản lý vận hành, tôi muốn đăng nhập vào dashboard web, để xem tình trạng đội xe. | FR-AUTH-02 |
| US-F-02 | Là người quản lý vận hành, tôi muốn thấy danh sách phương tiện, để nắm được đội xe đang có gì. | FR-VEHICLE-01 |
| US-F-03 | Là người quản lý vận hành, tôi muốn thấy vị trí các xe đang hoạt động cập nhật theo thời gian thực trên bản đồ, để giám sát vận hành. | FR-REALTIME-01 → FR-REALTIME-03 |
| US-F-04 | Là người quản lý vận hành, tôi muốn thấy danh sách chuyến đi đã hoàn tất, để đối chiếu khi cần. | FR-TRIP-05 |
| US-F-05 | Là người quản lý vận hành, tôi muốn biết khi hệ thống phát hiện sai lệch phương tiện ở một chuyến đi, để theo dõi chất lượng vận hành mà không cần buộc tội tài xế. | FR-MISMATCH-02, FR-MISMATCH-05 |
| US-F-06 | Là người quản lý vận hành, tôi muốn biết trạng thái đồng bộ/kết nối của các xe (nếu có), để hiểu vì sao một xe tạm thời không cập nhật vị trí. | FR-REALTIME-05 |

## 4. Cross-cutting (không gắn riêng vai trò)

| ID | Story | Liên quan |
|---|---|---|
| US-X-01 | Là bất kỳ người dùng nào, tôi muốn dữ liệu vị trí của mình không bị lưu trữ vô thời hạn, để giảm rủi ro về quyền riêng tư. | FR-RETENTION-02 |
| US-X-02 | Là dev/QA, tôi muốn giả lập được các tình huống khó tái hiện (mất mạng, thiết bị nóng, thiếu sáng) mà không cần điều kiện thật, để kiểm thử nhanh và lặp lại được. | FR-DEVMODE-01 → FR-DEVMODE-04 |

## 5. Web account & responsive (bổ sung `WEB-00`, review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu)

> Bổ sung 10/2026 sau Baseline v1.0; chưa triển khai. Actor: người dùng đã đăng nhập web (Dashboard User / Fleet Operator, hoặc chủ xe dùng web). Đặc tả: `docs/web/WEB_ACCOUNT_RWD_SPEC.md`.

| ID | Story | Liên quan |
|---|---|---|
| US-W-01 | Là người dùng web, tôi muốn xem email của tài khoản đang đăng nhập, để chắc mình đang dùng đúng tài khoản. | FR-WEBPROFILE-01 → FR-WEBPROFILE-03 |
| US-W-02 | Là người dùng web, tôi muốn đọc NovaWay xử lý dữ liệu của tôi thế nào và cách dừng theo dõi vị trí, để hiểu quyền riêng tư mà không bị hứa điều hệ thống chưa làm. | FR-WEBPRIVACY-01 → FR-WEBPRIVACY-04 |
| US-W-03 | Là người dùng web nhạy cảm với chuyển động, tôi muốn giảm hiệu ứng giao diện trên trình duyệt của mình, để dùng dashboard dễ chịu hơn mà không ảnh hưởng dữ liệu hay cảnh báo. | FR-WEBSETTINGS-01 → FR-WEBSETTINGS-05 |
| US-W-04 | Là người dùng web, tôi muốn có hướng dẫn ngắn theo các chức năng thật, để biết làm gì trên web và việc gì phải làm trên mobile. | FR-WEBHELP-01 → FR-WEBHELP-03 |
| US-W-05 | Là người dùng web, tôi muốn khi mạng hoặc máy chủ lỗi lúc kiểm tra phiên thì thấy thông báo và nút thử lại thay vì kẹt màn hình chờ hoặc bị đăng xuất, để tiếp tục làm việc khi kết nối trở lại. | FR-WEBSESSION-01 → FR-WEBSESSION-04 |
| US-W-06 | Là người dùng web trên điện thoại, tablet hoặc khi phóng to chữ, tôi muốn điều hướng và đọc được mọi trang, để không phải dùng máy tính bàn mới làm được việc. | NFR-RWD-01 → NFR-RWD-07 |
