# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-06
* **Step Name**: Driving Map Cockpit
* **Mục tiêu**: Xây dựng màn hình lái xe tràn viền với Leaflet, có UI Glassmorphism và chế độ VR Radar giả lập.

* **Yêu cầu thực hiện**:
  1. Cài đặt dependency: `npm install leaflet react-leaflet` và `npm install -D @types/leaflet`.
  2. Tạo Component `DrivingCockpit` (hoặc đặt trong folder `map`). Bọc riêng phần Leaflet vào component `TripMap` (props: route, position, children overlays) kèm comment `// TODO(production): swap Leaflet -> MapLibre GL JS (TDR-002). Chỉ cần thay bên trong TripMap, không lan ra app.`
  3. **Khởi tạo Bản đồ**:
     - Render thẻ `<MapContainer>` chiếm 100% không gian. Nhớ import `leaflet/dist/leaflet.css`.
     - Tâm bản đồ (Center): Đường Quang Trung, Gò Vấp (Toạ độ mock: `[10.833, 106.660]`).
  4. **Vẽ Route và Marker**:
     - Dùng `<Polyline>` vẽ một tuyến đường (khoảng 3-4 cặp toạ độ dọc đường Quang Trung). Màu stroke: Cyan/Blue sáng.
     - Dùng `<Marker>` đặt một icon xe (dùng Custom DivIcon để hiển thị icon xe máy hoặc ô tô thay vì pin mặc định của Leaflet) tại điểm bắt đầu.
  5. **UI Overlays (Giao diện trôi nổi)**:
     - Tạo div bọc ngoài map, thiết lập `z-index` để nằm đè lên Map.
     - Dùng `backdrop-blur-md bg-slate-900/60 text-white` (Glassmorphism) cho các thẻ này.
     - Góc trên trái: Speedometer (0 km/h lớn).
     - Góc trên phải: Quãng đường (2.5 km), Thời gian (00:00).
     - Góc dưới: Nút đỏ lớn "Kết thúc chuyến đi" (Click -> Redirect `/dashboard` — đích TẠM, DEMO-11 sẽ đổi sang màn hình Summary).
  6. **Tính năng VR Radar Placeholder**:
     - Tách hiệu ứng radar thành component riêng `VrRadarOverlay` nhận prop `autoMode: boolean` (DEMO-10 sẽ chuyển sang luôn-bật và gỡ nút — thiết kế sẵn để không phải đập lại code).
     - Đặt một nút Toggle/Button "Bật/Tắt VR Radar" điều khiển component này.
     - Khi bật: State `isVrMode = true`.
     - Dùng DOM chèn thêm một lớp màng lưới (grid) mờ toàn màn hình.
     - Dùng CSS Keyframes (`@keyframes spin`) gắn quanh vị trí xe để tạo hiệu ứng một vòng radar xanh lá quét 360 độ liên tục. Hiện dòng chữ nhỏ "Đang quét môi trường...".

* **Quy tắc bắt buộc**:
  1. Phải fix triệt để lỗi mất icon/thiếu css của Leaflet (nếu có).
  2. Bố cục UI Overlays không được che khuất hoàn toàn tầm nhìn trung tâm.
  3. Sau khi hoàn thành, commit: `feat: add driving map cockpit with overlays and vr radar placeholder`.
