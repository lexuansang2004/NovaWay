# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-11
* **Step Name**: End Trip Summary & Trip Protection
* **Mục tiêu**: Xây dựng màn hình tổng kết chứa Safety Score, và cơ chế Mini-player để giữ chuyến đi không bị đứt đoạn khi user navigate.

* **Yêu cầu thực hiện**:
  1. **Trip Protection (Global State)**:
     - Trạng thái chuyến đi đã nằm sẵn trong global store `useTripStore` (DEMO-07). Ở step này chỉ cần đảm bảo engine mô phỏng GPS không bị unmount theo route (đưa vòng lặp `requestAnimationFrame` lên mức `AppLayout` hoặc chạy độc lập trong store) để khi user rời `/start-trip`, chuyến đi vẫn tiếp tục.
     - Viết 1 Component `TripMiniPlayer`: Nổi ở góc phải dưới (fixed position). Chỉ render khi `isDriving === true` và route hiện tại KHÔNG PHẢI `/start-trip`.
     - Nội dung Mini-player: Hiện thời gian, tốc độ, nút "Mở rộng". Bấm mở rộng -> `navigate('/start-trip')`.
  2. **Thuật toán Safety Score**:
     - Lọc `syncHistory` và `offlineQueue` của chuyến đi hiện tại.
     - `Điểm = 100 - (số_lần_mismatch * 5) - (số_hazard * 2)`.
  3. **UI Màn hình Summary (`/start-trip/summary`)**:
     - Hiển thị khi người dùng bấm nút đỏ "Kết thúc chuyến đi" trên Map. Xóa state `isDriving`.
     - Trung tâm: Vẽ 1 vòng tròn Circular Progress lớn (Dùng SVG) chứa điểm Safety Score (Màu Xanh nếu >80, Vàng >50, Đỏ <50).
     - Phía dưới: 3 thông số Thống kê (Thời gian, Quãng đường, Tốc độ trung bình).
     - Dưới cùng: Bảng (Table/List) liệt kê các cảnh báo ("10:05 - Lái quá tốc độ xe máy - Trừ 5đ").
     - Nút "Về màn hình chính (Dashboard)".

* **Quy tắc bắt buộc**:
  1. Tuyệt đối không để chuyến đi bị reset nếu user bấm nhầm logo hoặc menu bên Sidebar.
  2. Không cần thư viện Chart nặng nề, chỉ cần code SVG thuần và Tailwind cho vòng tròn.
  3. Sau khi code xong, commit: `feat: add tech summary dashboard, safety score and trip mini-player`.
