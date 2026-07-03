# DEMO-05 - Start Trip Flow

## Mục tiêu
Xây dựng luồng chuẩn bị chuyến đi (Start Trip Flow) theo phong cách cuộn dọc (Vertical Accordion). Kết hợp 3 giai đoạn: Chọn chế độ di chuyển -> Chọn phương tiện -> Xác thực khuôn mặt vào một màn hình duy nhất (`/start-trip`).

## Scope
- Làm trong step này:
  - Trang `/start-trip` hiển thị 3 khối dọc (Sections).
  - Khối 1: Chọn chế độ di chuyển (Mobility Mode). 4 Card: Xe máy, Ô tô, Đi bộ, Xe đạp.
  - Khối 2: Chọn phương tiện (Garage). Hiển thị danh sách xe mock. Lọc xe theo chế độ đã chọn ở Khối 1.
  - Khối 3: Xác thực khuôn mặt. Gọi component `FaceScanner` (mode `vehicle_auth`).
  - Giao diện áp dụng quy tắc "Mở khóa tuần tự" (Chưa làm xong bước 1 thì bước 2, 3 mờ/disable). Tự động cuộn xuống bước tiếp theo sau khi chọn.
  - Sau khi xác thực xong, thay thế toàn bộ 3 khối bằng 1 thẻ rỗng "DrivingCockpitPlaceholder" (giữ nguyên route `/start-trip`).

## Non-scope
- Không code chi tiết giao diện bản đồ hay cảnh báo (dành cho DEMO-06).

## Tech stack
- React + Tailwind CSS
- Framer Motion (hiệu ứng fade-in, cuộn mượt).
- shadcn/ui components (Card, Tooltip).

## UI requirements
- Thiết kế cuộn dọc sạch sẽ.
- Card có hiệu ứng hover mượt mà.
- Khối chưa kích hoạt có độ mờ (opacity 0.4 - 0.5) và vô hiệu hóa click.

## Behavior requirements
- Chọn Xe máy -> Sáng Khối 2, tự cuộn xuống.
- Click Đi bộ/Xe đạp -> Không được chọn, hiện Tooltip "Mobility Mode Expansion".
- Chọn Xe -> Sáng Khối 3, tự cuộn xuống.
- Quét mặt xong -> Đổi giao diện sang Placeholder Cockpit.

## Output expected
- Flow chuẩn bị 3 bước trơn tru, không có lỗi logic.

## Commit message
```bash
feat: add vertical accordion start trip flow
```
