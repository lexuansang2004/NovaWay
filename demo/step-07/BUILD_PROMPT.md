# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-07
* **Step Name**: Mock Realtime GPS
* **Mục tiêu**: Làm cho Marker chiếc xe di chuyển mượt mà (60 FPS) dọc tuyến đường Quang Trung kèm theo bảng điều khiển tua nhanh.

* **Yêu cầu thực hiện**:
  1. Cài đặt thêm thư viện tính toán nếu cần (VD: `npm install @turf/turf` hoặc tự viết hàm Haversine interpolation).
  2. Tạo global store `useTripStore` (Zustand, `src/stores/tripStore.ts`) giữ `isDriving`, `currentPosition`, `currentSpeed`, `distanceTravelled`, `speedMultiplier`. Tạo Custom Hook (VD: `useMockGPS`) chạy engine nội suy và ghi kết quả vào store — UI chỉ đọc từ store. Engine xử lý:
     - Dùng `requestAnimationFrame` để cập nhật toạ độ `currentPosition` dọc theo mảng `mockRoute` (đặt tại `src/mocks/route.quangtrung.ts`). Tránh dùng `setInterval` vì sẽ giật.
     - Cập nhật giá trị Tốc độ (`currentSpeed`) dao động nhẹ quanh mức 40km/h ở chế độ thường.
     - Cập nhật Quãng đường (`distanceTravelled`).
  3. **Auto-Follow Camera**: Dùng Hook của react-leaflet (VD: `useMap()`) để tự động `map.setView()` bám theo toạ độ `currentPosition` của xe.
  4. **Bảng Demo Controls (Góc dưới bên trái)**:
     - Giao diện: Khung nhỏ, có chữ mờ *"Demo Tools - Hidden in Production"*.
     - Các nút: `▶ Play`, `⏸ Pause`, `x1`, `x2`, `x5` (sử dụng shadcn/ui buttons).
     - Logic: Bấm x5 thì `speedMultiplier = 5`, xe đi nhanh gấp 5 lần, đồng hồ tốc độ trên góc HUD hiển thị nhân 5 (VD: 200 km/h). Bấm Pause thì dừng lại, tốc độ bằng 0.

* **Quy tắc bắt buộc**:
  1. Tuyệt đối xe không được "bay" ra khỏi đường line màu xanh, phải trượt dọc theo polyline.
  2. Bảng điều khiển phải nhỏ gọn, không che khuất bản đồ.
  3. Sau khi hoàn thành, commit: `feat: add 60fps mock gps interpolation and demo playback controls`.
