# Điều kiện qua step tiếp theo

Step `DEMO-08` chỉ được coi là hoàn thành khi:

1. Cơ chế State Management (Context/Zustand) chia sẻ trạng thái mạng thông suốt giữa màn hình Cockpit và trang Offline Sync.
2. Logic Batch Auto-Sync hoạt động chính xác với hàm `setInterval`, tạo được hiệu ứng loading (tải dần từng lô) chân thực.
3. Đúng với triết lý bảo mật, mọi thứ đều chạy ngầm, không đòi hỏi user bấm nút "Đồng bộ" thủ công.
4. Có comment TODO kiến trúc (IndexedDB/Aggregation) trong code.
5. Đã commit code đúng chuẩn.
