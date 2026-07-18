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

## 2. Vehicle Owner (Chủ phương tiện)

| ID | Story | Liên quan |
|---|---|---|
| US-O-01 | Là chủ xe, tôi muốn biết ai đang sử dụng xe của mình, để yên tâm khi cho mượn xe. | FR-VEHICLE-01, FR-TRIP-05 |
| US-O-02 | Là chủ xe, tôi muốn xoá hoặc cập nhật thông tin xe khi cần, để dữ liệu luôn chính xác. | FR-VEHICLE-01 |

*Ghi chú: quản lý uỷ quyền chi tiết (ai được mượn xe bao lâu) là phần mở rộng từ demo pitch, chưa có FR riêng ở MVP này — cần bổ sung ở D0.3 nếu được xác nhận là MVP core, hiện tạm xếp Post-MVP vì chưa có trong MVP Scope Draft.*

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
