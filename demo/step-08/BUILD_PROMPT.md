# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-08
* **Step Name**: Offline Queue Mock
* **Mục tiêu**: Xây dựng kho lưu trữ ngầm `offlineQueue` (localStorage) và cơ chế tự động đồng bộ theo lô (Batch Auto-sync) khi có mạng trở lại. Không làm giao diện thông báo cho user (chạy ngầm).

* **Yêu cầu thực hiện**:
  1. Tạo Zustand Store `useOfflineStore` (thống nhất Zustand toàn app). Quản lý `isOnline` (mặc định true), `offlineQueue` (array, sync với localStorage key `novaway_demo_offline_queue`), `syncHistory` (array, key `novaway_demo_sync_history`). Store expose hàm `addEvent(event)` với contract rõ ràng: nếu `isOnline === true` -> ghi thẳng vào `syncHistory` (giả lập đã gửi server thành công); nếu `isOnline === false` -> push vào `offlineQueue`. DEMO-09/10 chỉ cần gọi `addEvent()` mà không quan tâm trạng thái mạng.
  2. Tại màn hình **Driving Map Cockpit (DEMO-06)**: 
     - Thêm 1 thẻ UI mờ (Glassmorphism) ở trên cùng ở giữa bản đồ chứa 1 `Switch` của shadcn/ui. Label là "Mạng: Online" (Màu xanh) hoặc "Mạng: Offline (Demo)" (Màu đỏ).
     - Switch này thay đổi state `isOnline`.
  3. Hoàn thiện trang `/offline-sync`:
     - Trang này là **Màn hình Giám sát Dev**.
     - Có 1 nút lớn "Tạo 20 Event Test" (Bấm vào tạo 20 object giả push vào `offlineQueue` **nếu đang Offline**, nếu đang Online thì chửi/toast báo lỗi "Phải tắt mạng mới test được").
     - Hiển thị 2 cột (hoặc 2 bảng): Cột 1 "Đang kẹt (Queue)", Cột 2 "Đã đồng bộ (History)".
  4. **Logic Batch Auto-Sync (Cực kỳ quan trọng)**:
     - Dùng `useEffect` lắng nghe `isOnline`. Nếu `isOnline === true` và `offlineQueue.length > 0`.
     - Tạo một `setInterval` chạy mỗi `SYNC_INTERVAL_MS` (1000ms). Mỗi lần chạy, lấy ra tối đa **`SYNC_BATCH_SIZE` (5) phần tử đầu tiên** của `offlineQueue` (dùng `splice`), đẩy sang `syncHistory` (hằng số import từ `src/config/demo.ts`). 
     - Lặp lại đến khi `offlineQueue` rỗng thì `clearInterval`.
     - (Đây là mô phỏng cơ chế Batch Syncing để tránh nghẽn Server).
  5. Đặt Comment kiến trúc vào code store:
     `// TODO (Production): Replace localStorage with IndexedDB. Implement Data Aggregation to compress events before syncing.`

* **Quy tắc bắt buộc**:
  1. Tuyệt đối không làm nút "Đồng bộ thủ công" (Sync Now) cho user. Hệ thống phải TỰ ĐỘNG làm khi `isOnline` bật xanh.
  2. Không để cảnh báo (Badge) trên menu Sidebar, làm mọi thứ vô hình với tài xế.
  3. Sau khi hoàn thành, commit: `feat: add background offline queue mock and batch auto-sync mechanism`.
