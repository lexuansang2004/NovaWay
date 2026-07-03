# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-05
* **Step Name**: Start Trip Flow
* **Mục tiêu**: Xây dựng màn hình `/start-trip` kết hợp chuỗi 3 thao tác: Chọn Mode -> Chọn Xe -> Quét Face ID thành 1 luồng duy nhất (Vertical Accordion).

* **Yêu cầu thực hiện**:
  1. Component chính đặt tại trang `/start-trip`. Quản lý state cho chuỗi 3 bước.
  2. **Giai đoạn 1 (Mobility Mode)**: 
     - Hiển thị 4 Card ngang: Xe máy, Ô tô, Đi bộ, Xe đạp.
     - Dùng shadcn `Tooltip` bọc Đi bộ và Xe đạp: `"Tính năng này thuộc Mobility Mode Expansion và sẽ được phát triển sau MVP."` Các mode này bị `disabled`.
  3. **Giai đoạn 2 (Vehicle Selection)**:
     - Dùng mảng mock `MOCK_VEHICLES` đặt tại `src/mocks/vehicles.ts` (có ít nhất SH 150i, VF8, Exciter).
     - Mặc định khối này có class `opacity-50 pointer-events-none` nếu GĐ 1 chưa hoàn tất.
     - Tự động lọc danh sách xe: Nếu GĐ 1 chọn Xe máy, chỉ hiện các xe 2 bánh.
     - Dùng JS (ref.current.scrollIntoView) để tự động cuộn màn hình mượt (`behavior: 'smooth'`) xuống khối này sau khi chọn xong GĐ 1.
  4. **Giai đoạn 3 (Face ID Verification)**:
     - Tương tự, khối này bị mờ cho đến khi chọn xong GĐ 2.
     - Hiển thị nút "Bắt đầu xác minh". Khi nhấn vào, render Component `FaceScanner` (mode `vehicle_auth`, truyền callback `onComplete`) đã làm ở DEMO-03.
     - Bên trong `onComplete` của `FaceScanner`: xóa/ẩn toàn bộ 3 khối wizard. (Nhắc lại: `FaceScanner` KHÔNG tự điều hướng — flow cha này toàn quyền quyết định bước tiếp theo.)
  5. **Giai đoạn 4 (Transition)**:
     - Render thẻ `<div id="map-cockpit-placeholder">Driving Map Cockpit Placeholder</div>` chiếm toàn màn hình (sẽ code thật ở step sau).
     - **QUAN TRỌNG**: KHÔNG thay đổi URL, vẫn giữ nguyên ở `/start-trip`.

* **Quy tắc bắt buộc**:
  1. Luôn dùng bộ styling chuẩn (Tailwind, shadcn/ui). Thêm Framer Motion cho các hiệu ứng xuất hiện.
  2. Tuyệt đối không cho phép bấm nhảy cóc (phải hoàn thành tuần tự).
  3. Sau khi code xong, commit: `feat: add vertical accordion start trip flow`.
