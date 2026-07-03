# DEMO-09 - Mobility Mismatch Warning

## Mục tiêu
Demo tính năng Cảnh báo sai lệch loại phương tiện (Mobility Mismatch) khi phát hiện tốc độ di chuyển bất thường. Hệ thống đóng vai trò "Nhắc nhở an toàn" và "Ghi nhận dữ liệu" bằng chứng (bao gồm tọa độ) thay vì kết luận vi phạm.

## Scope
- Làm trong step này:
  - Cập nhật màn hình Map Cockpit (DEMO-07). Lắng nghe sự thay đổi của tốc độ xe (`currentSpeed`).
  - Giao diện (UI): Modal cảnh báo ở giữa màn hình. Tone màu Cam (Orange/Amber).
  - Nội dung: "Tốc độ hiện tại có vẻ không phù hợp với phương tiện đã chọn. Bạn có muốn kiểm tra lại phương tiện không?".
  - Action Buttons: `[Xác nhận tôi đi xe máy]` và `[Đổi phương tiện]`.
  - Auto-dismiss: Thanh đếm ngược 10 giây (progress bar / text), sau đó tự ẩn Modal.
  - Tích hợp Audit Log: Đẩy Event `MISMATCH_WARNING` (chứa Tốc độ, Thời gian, Tọa độ Lat/Lng) vào Offline Store của DEMO-08.

## Non-scope
- Không làm cho phương tiện Ô tô (chỉ kích hoạt nếu đang chọn Xe máy).
- Không dùng ngôn từ kết tội ("gian lận", "vi phạm").

## Tech stack
- React `useEffect` (để monitor state).
- `setTimeout` / `setInterval` (đếm ngược tự tắt).
- Framer Motion (hiệu ứng Popup Modal).
- Zustand/Context từ DEMO-08.

## Output expected
- Tốc độ Xe máy vọt > 80km/h -> Popup màu cam hiện lên đếm ngược 10s. Log hệ thống ghi nhận.

## Commit message
```bash
feat: add mobility mismatch warning overlay and audit logging
```
