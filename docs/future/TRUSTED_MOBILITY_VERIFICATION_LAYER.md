# NovaWay - Trusted Mobility Verification Layer

## Mục tiêu tương lai

Trong phiên bản sản phẩm thật, NovaWay có thể mở rộng thành một lớp xác minh di chuyển tin cậy, hỗ trợ phân tích dữ liệu giao thông theo thời gian thực.

Hệ thống không tự động kết luận vi phạm. Vai trò của NovaWay là:

* Hỗ trợ cảnh báo.
* Phân tích dữ liệu di chuyển.
* Phát hiện dấu hiệu bất thường.
* Ghi log sự kiện để phục vụ kiểm tra/đối chiếu.
* Gợi ý người dùng hoặc admin kiểm tra/xác minh.
* Hỗ trợ xác minh bằng nhiều nguồn dữ liệu.

## Vai trò của NovaWay

NovaWay là hệ thống hỗ trợ cảnh báo, phân tích dữ liệu di chuyển, phát hiện dấu hiệu bất thường và ghi nhận log để phục vụ kiểm tra/đối chiếu.

Hệ thống có thể:

* Phát hiện dấu hiệu bất thường về tốc độ, phương tiện, tuyến đường hoặc hành vi di chuyển.
* Ghi log sự kiện vào hệ thống.
* Hiển thị dữ liệu phân tích trên dashboard admin trong các phiên bản sau.
* Gợi ý người dùng kiểm tra lại phương tiện hoặc chế độ di chuyển.
* Hỗ trợ cung cấp dữ liệu tham khảo cho quá trình xác minh.

## Định hướng tích hợp hạ tầng

Trong tương lai, NovaWay có thể kết hợp với:

* Ứng dụng mobile của người dùng.
* Tín hiệu định danh thiết bị/phương tiện.
* Trạm cảm biến giao thông.
* Camera hạ tầng.
* Dữ liệu GPS.
* Dữ liệu cảm biến phụ.
* Map matching.
* Hệ thống phân tích tốc độ.
* Hệ thống xác minh đa nguồn.

## Các lớp kiểm soát nâng cao sau MVP

Các thành phần sau không thuộc demo và không thuộc MVP đầu:

* App Attestation.
* Chống fake GPS.
* Audit log nâng cao.
* Dữ liệu cảm biến phụ.
* Map matching nâng cao.
* Camera/cảm biến hạ tầng.
* Bằng chứng nhiều nguồn.
* Human review.
* Quy trình pháp lý rõ ràng.

## Giới hạn trách nhiệm

NovaWay không tự động xử phạt người dùng.

NovaWay không tự kết luận pháp lý rằng người dùng vi phạm.

NovaWay chỉ đưa ra kết luận ở mức:

* Có dấu hiệu bất thường.
* Cần xác minh thêm.
* Cần đối chiếu thêm dữ liệu.
* Cần người dùng xác nhận lại.
* Cần người có thẩm quyền hoặc admin/human review kiểm tra.

Việc xử lý vi phạm giao thông, nếu có, thuộc trách nhiệm và thẩm quyền của cơ quan chức năng như công an giao thông hoặc đơn vị quản lý được pháp luật cho phép.

## Admin Dashboard trong tương lai

Admin Dashboard không thuộc demo hiện tại.

Trong các giai đoạn sau, hệ thống có thể bổ sung dashboard admin để:

* Xem danh sách sự kiện bất thường.
* Xem log tốc độ/phương tiện/tuyến đường.
* Lọc theo thời gian, phương tiện, khu vực.
* Xem trạng thái xác minh.
* Đánh dấu sự kiện cần kiểm tra thêm.
* Xuất báo cáo phục vụ phân tích nội bộ.

## Nguyên tắc an toàn

NovaWay nên dùng các kết luận dạng:

* Có dấu hiệu bất thường.
* Cần xác minh thêm.
* Cần đối chiếu thêm dữ liệu hạ tầng.
* Cần human review nếu liên quan đến xử lý vi phạm.

NovaWay không nên tự động ghi:

* Người dùng vi phạm.
* Người dùng gian lận.
* Người dùng khai báo sai có chủ ý.
* Dữ liệu này đủ để xử phạt.

## Cách diễn đạt nên dùng

Nên dùng:

`Hệ thống hỗ trợ cảnh báo, phân tích dữ liệu, phát hiện dấu hiệu bất thường, ghi log và gợi ý kiểm tra/xác minh.`

Không nên dùng:

`Hệ thống tự động phát hiện và xử phạt vi phạm.`

## Ghi chú cho demo hiện tại

Bản demo hiện tại chỉ mô phỏng cảnh báo sai lệch phương tiện và ghi mock log vào localStorage.

Admin Dashboard, xác minh đa nguồn, tích hợp hạ tầng giao thông, App Attestation, chống fake GPS và quy trình pháp lý sẽ được thiết kế ở giai đoạn sản phẩm thật sau demo/MVP.
