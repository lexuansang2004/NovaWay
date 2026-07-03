# DEMO-08 - Offline Queue Mock

## Mục tiêu
Xây dựng cơ chế hàng chờ ngoại tuyến (Offline Queue) lưu dữ liệu ngầm vào `localStorage` khi rớt mạng và **tự động đồng bộ theo lô (Batch Auto-sync)** ngay khi có mạng trở lại. Đảm bảo tính minh bạch và chống nghẽn mạng.

## Scope
- Làm trong step này:
  - Khởi tạo State toàn cục bằng Zustand (thống nhất với `useTripStore` ở DEMO-07) để quản lý `isOnline` và mảng `offlineQueue`.
  - Bổ sung nút Switch "Giả lập rớt mạng" (Force Offline) trên màn hình lái xe (Driving Map Cockpit), góc trên giữa.
  - Logic **Auto-sync (Batch Syncing)**: Khi `isOnline` bật lại `true`, tạo interval bốc từng lô 5 events từ Queue ghi vào History cho đến khi hết, để demo quá trình tải dần.
  - Hoàn thiện trang `/offline-sync` thành màn hình giám sát (Admin/Dev Monitor). Gồm 2 cột: Danh sách Đang kẹt (Queue) và Lịch sử đã gửi (History).
  - Nút "Tạo Event Test" ở trang giám sát để giả lập dữ liệu vào Queue.

## Non-scope
- Không làm UI cảnh báo cho người dùng (Không có chấm đỏ Badge trên Menu), vì việc đồng bộ là hoàn toàn tự động và ẩn danh dưới nền.

## Tech stack
- Zustand (thống nhất toàn app).
- `localStorage`.
- `setInterval` / `setTimeout` cho hiệu ứng Batch Syncing.
- Tailwind CSS, shadcn/ui.

## Output expected
- Tắt mạng -> Tạo event -> Dữ liệu kẹt ở Queue.
- Bật mạng -> Dữ liệu từ Queue tự động tụt dần (VD: bốc mỗi lô 5 cái) sang History. Không cần user thao tác.

## Commit message
```bash
feat: add background offline queue mock and batch auto-sync mechanism
```
