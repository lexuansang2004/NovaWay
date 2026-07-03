# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-03
* **Step Name**: Face ID Simulation
* **Mục tiêu**: Xây dựng màn hình giả lập Face ID 3D Hologram, hỗ trợ mode đăng nhập và mode check điều kiện xe.

* **Yêu cầu thực hiện**:
  1. Dựng component tái sử dụng `FaceScanner` (đặt tại `src/components/face-id/FaceScanner.tsx`). Trang `/face-auth` chỉ là dev harness render component này (mode đọc từ query `?mode=...`) để test độc lập.
  2. **Thiết kế UI Scanner**: Nền tối. Giữa màn hình là một hình ảnh Avatar (sẽ dùng ảnh AI Hologram). Dùng Framer Motion hoặc CSS Keyframes vẽ một thanh laser sáng (scan line) màu cyan quét từ trên xuống dưới.
  3. **Logic Mode**: Component nhận props `mode: 'login_auth' | 'vehicle_auth'` và `onComplete(result)`. **Component KHÔNG tự navigate** — mọi điều hướng do flow cha quyết định bên trong `onComplete`.
     - Nếu `mode === 'login_auth'`: 
       + Quét 3s (hằng `FACE_SCAN_MS`) -> Hiện chữ "Xác thực chủ tài khoản thành công" -> gọi `onComplete({ mode: 'login_auth', success: true })`.
     - Nếu `mode === 'vehicle_auth'`:
       + Quét 3s -> Hiện Pop-up chi tiết check điều kiện phương tiện.
  4. **Logic Pop-up Mode `vehicle_auth`**:
     + Bạn phải tạo ra bộ dữ liệu mock sau, đặt tại `src/mocks/authResult.ts`:
       ```ts
       const mockAuthData = {
         driverName: "Nguyễn Văn A", email: "demo@novaway.vn", age: 22,
         isOwner: false, // Thay đổi biến này để test
         ownerName: "Trần Văn B", durationLeft: "Còn 24h"
       }
       ```
     + Nếu `isOwner === true` (Trường hợp 1 - Chủ xe): Hiển thị dòng chữ: `✅ Quyền sử dụng: Chủ xe {mockAuthData.ownerName}`.
     + Nếu `isOwner === false` (Trường hợp 2 - Mượn xe): Hiển thị dòng chữ: `✅ Quyền sử dụng: Chủ xe {mockAuthData.ownerName} phê duyệt {mockAuthData.driverName} ({mockAuthData.durationLeft})`.
     + Các dòng khác luôn hiện: `✅ Danh tính khớp: {mockAuthData.driverName}` và `✅ Độ tuổi: {mockAuthData.age} (Đạt chuẩn hạng xe)`.
     + Pop-up hiện trong 2 giây (hằng `RESULT_POPUP_MS`) rồi gọi `onComplete({ mode: 'vehicle_auth', success: true, authData: mockAuthData })`.
  5. **Tích hợp vào Login (DEMO-02)**: Sửa flow login: mật khẩu đúng -> render `FaceScanner` mode `login_auth` -> trong `onComplete` -> hiện `VRScannerLoading` -> redirect `/dashboard` (khớp kịch bản pitch cảnh 0:00-0:30). Thêm Badge nhỏ "Demo Simulation" ở góc màn hình scan.
  6. **Ghi chú cực kỳ quan trọng (Thêm comment vào Code)**: 
     `// TODO (Production): Logic kiểm tra uỷ quyền (isOwner) và lịch sử sử dụng hiện tại đang MOCK tĩnh cho mục đích Demo. Cần fetch dữ liệu thật từ API Vehicle Management & History để đảm bảo an toàn.`

* **Quy tắc bắt buộc**:
  1. Không bật camera thật, chỉ giả lập bằng ảnh & animation.
  2. Bố cục Component phải đẹp, sang trọng, mang phong cách Sci-Fi.
  3. Sau khi hoàn thành, commit: `feat: add holographic face id simulator with context modes and vehicle auth logic`
