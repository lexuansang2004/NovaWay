# DEMO-03 - Face ID Simulation

## Mục tiêu
Xây dựng trang giả lập quét khuôn mặt `FaceScanner` sử dụng giao diện Hologram 3D hiện đại để xác thực danh tính tài khoản và kiểm tra điều kiện phương tiện. Component này được thiết kế linh hoạt để hỗ trợ đa luồng (Multi-context).

## Scope
- Làm trong step này:
  - Tạo Component `FaceScanner` dùng chung.
  - Sử dụng hình ảnh AI Hologram Mesh kết hợp CSS Animation quét laser từ trên xuống dưới.
  - Xử lý logic 2 Chế độ (Mode): `login_auth` và `vehicle_auth` qua props; kết quả trả về flow cha bằng callback `onComplete(result)` — component KHÔNG tự điều hướng route.
  - Tích hợp mode `login_auth` vào flow Login (DEMO-02): mật khẩu đúng -> FaceScanner -> VRScannerLoading -> `/dashboard` (khớp kịch bản pitch).
  - Route `/face-auth` chỉ là dev harness để test component độc lập.
  - Mode `vehicle_auth` hiển thị bảng Pop-up phân biệt 2 trường hợp: Tự lái xe (Owner) và Mượn xe (Borrower) với cấu trúc thông báo khác nhau.
  - Thêm Ghi chú (Note) vào code về việc kết nối dữ liệu thật ở bản production.

## Non-scope
- Không thiết kế trang Chọn Xe (chỉ mock nút test tạm thời).
- Không dùng quyền Camera vật lý. Không dùng thuật toán Face Recognition thật.
- Không làm API lưu lịch sử.

## Tech stack
- React + Tailwind CSS
- Framer Motion
- Ảnh AI Generated (Avatar 3D Hologram)

## UI requirements
- Ảnh trung tâm: Hologram Avatar có laser xanh quét.
- Text: "Đang phân tích dữ liệu sinh trắc...".
- Pop-up kết quả: Bảng chứa các tích xanh ✅ hiển thị rõ tên Chủ xe, Người mượn.
- Badge nhỏ "Demo Simulation" ở góc màn hình scan (minh bạch đây là mô phỏng).

## Data/state requirements
- `MOCK_AUTH_RESULT` với biến cờ `isOwner` (`true`/`false`) để test.

## Behavior requirements
- Quét 3 giây -> Mở pop-up kết quả 2 giây -> gọi `onComplete(result)`. Flow cha quyết định bước tiếp theo (Login: sang VRScannerLoading; Start Trip Flow ở DEMO-05: sang Cockpit). Dev harness `/face-auth` chỉ log/hiển thị kết quả, không tự chuyển trang.

## Output expected
- Component `FaceScanner.tsx` chạy mượt 2 mode, giao tiếp thuần bằng props/callback (tái sử dụng được ở mọi flow).
- Luồng giả lập báo cáo điều kiện xe chính xác logic Chủ xe / Người mượn.

## Commit message
```bash
feat: add holographic face id simulator with context modes and vehicle auth logic
```
