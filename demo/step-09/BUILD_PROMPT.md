# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-09
* **Step Name**: Mobility Mismatch Warning
* **Mục tiêu**: Xây dựng Modal cảnh báo "Sai lệch phương tiện" màu Cam khi Xe máy đi quá 80km/h. Tự động tắt sau 10s và ghi Log kèm tọa độ.

* **Yêu cầu thực hiện**:
  1. Mở Component `DrivingCockpit`. Viết một `useEffect` theo dõi `currentSpeed` và `selectedVehicle`.
  2. **Rule Kích hoạt**: Nếu `selectedVehicle.type === 'motorcycle'` và `currentSpeed > 80`, set State `showMismatchWarning = true`. 
     *(Lưu ý: dùng biến flag để đảm bảo Modal chỉ hiện 1 lần trong suốt quá trình demo để tránh spam liên tục).*
  3. **UI Modal Cảnh báo**:
     - Hiển thị Modal/Dialog nổi bật giữa màn hình (đè lên Map).
     - Màu chủ đạo: **Cam (Orange / Amber)**, Icon cảnh báo.
     - Text: *"Tốc độ hiện tại có vẻ không phù hợp với phương tiện đã chọn. Bạn có muốn kiểm tra lại phương tiện không?"*
     - Hai nút: `"Xác nhận xe máy"` và `"Đổi phương tiện"`. (Nút nào click cũng set state false để ẩn).
  4. **Logic Auto-Dismiss (10s)**:
     - Dùng `useEffect` kết hợp `setInterval` tạo 1 thanh đếm ngược (ProgressBar màu cam) hoặc text `10s... 9s...`.
     - Hết 10s, tự động đóng Modal (set state false).
  5. **Ghi Audit Log**:
     - Khi Modal vừa bật lên, lập tức gọi hàm `addEvent()` từ Offline Store (theo contract DEMO-08: đang Online -> vào thẳng History; đang Offline -> vào Queue).
     - Payload bắt buộc phải có: 
       ```ts
       { 
         type: 'MISMATCH_WARNING',
         speed: currentSpeed, 
         lat: currentPosition.lat, 
         lng: currentPosition.lng, 
         timestamp: new Date().toISOString()
       }
       ```

* **Quy tắc bắt buộc**:
  1. Tuyệt đối không dùng các từ "Vi phạm", "Gian lận", "Xử phạt".
  2. Modal phải nổi bật, đè lên các UI khác (`z-index` cao).
  3. Sau khi code xong, commit: `feat: add mobility mismatch warning overlay and audit logging`.
