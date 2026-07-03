# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-04
* **Step Name**: App Shell & Navigation Menu
* **Mục tiêu**: Xây dựng App Shell với Sidebar Menu và Account Dropdown.

* **Yêu cầu thực hiện**:
  1. Đảm bảo toàn bộ code tuân thủ bộ styling chuẩn của dự án: **React + Vite + Tailwind CSS + shadcn/ui + Framer Motion**.
  2. Tạo Component `AppLayout` (hoặc `DashboardLayout`) dùng làm layout chính bọc các route bảo vệ (Protected Routes).
  3. Xây dựng **Sidebar**:
     - Sử dụng Lucide React cho các icon.
     - **Menu chính**: Dashboard (`/dashboard`), Bắt đầu chuyến đi (`/start-trip`), Quản lý phương tiện (`/vehicles`), Lịch sử chuyến đi (`/trip-history`), Offline Sync (`/offline-sync`), Cài đặt (`/settings`).
     - **Menu tài khoản (Bottom)**: Dùng component `DropdownMenu` và `Avatar` của shadcn/ui. Hiển thị chữ "Lê Xuân Sang" & "NovaWay Demo". Khi click hiện ra các mục: Hồ sơ cá nhân, Quyền riêng tư, Cài đặt ứng dụng, Trợ giúp, và **Đăng xuất**.
  4. Viết logic Đăng xuất: Hàm onClick xoá item `novaway_demo_auth` trong localStorage và dùng `useNavigate` đẩy về `/login`.
  5. Cập nhật file Router (`App.tsx` hoặc `router.tsx`):
     - Gom các route trên vào trong `AppLayout`.
     - Trỏ các route về các Component rỗng (VD: `const Dashboard = () => <div>Dashboard</div>`).
     - Route mặc định (sau khi login) là `/dashboard`.
  6. Xử lý giữ phiên: Nếu user vào thẳng `/dashboard` mà chưa có `novaway_demo_auth` trong localStorage, đá văng ra `/login`.

* **Quy tắc bắt buộc**:
  1. Sidebar thiết kế tinh tế, lấy cảm hứng từ giao diện sidebar của ChatGPT.
  2. Tuyệt đối không code chi tiết các trang bên trong trong bước này.
  3. Sau khi code xong, commit: `feat: add app shell and navigation menu`.
