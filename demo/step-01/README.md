# DEMO-01 - Web Setup

## Mục tiêu
Khởi tạo nền tảng dự án React + Vite + TypeScript với các công nghệ UI hiện đại (Tailwind CSS, shadcn/ui, Framer Motion) và cấu hình điều hướng (React Router) tại thư mục `/demo-app/`. Thiết lập sẵn khung sườn các trang để chuẩn bị cho các bước tiếp theo.

## Scope
- Khởi tạo dự án Vite React TS tại `/demo-app/`.
- Cài đặt và cấu hình Tailwind CSS.
- Cài đặt và khởi tạo `shadcn/ui`.
- Cài đặt `framer-motion` cho animation.
- Cài đặt `react-router-dom` và thiết lập sườn các trang theo IA cuối cùng: `/` (Splash), `/login`, `/dashboard`, `/start-trip`, `/vehicles`, `/trip-history`, `/offline-sync`, `/settings`, và `/face-auth` (dev harness cho FaceScanner ở DEMO-03).
- Dọn dẹp code mặc định của Vite.

## Non-scope
- Không thiết kế UI chi tiết cho các trang.
- Không viết logic đăng nhập hay kiểm tra điều kiện người dùng (để dành cho DEMO-03, DEMO-04).

## Tech stack
- React + Vite + TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Router DOM

## UI requirements
Giao diện trống hoặc hiển thị các dòng chữ Placeholder (ví dụ: "Đây là trang Login", "Đây là trang Map") giữa các Route.

## Data/state requirements
*Không yêu cầu*

## Behavior requirements
Truy cập vào các URL tương ứng (ví dụ `/login` hoặc `/map`) thì phải chuyển sang đúng Component tương ứng mà app không bị crash.

## Output expected
Thư mục `/demo-app/` với dự án đã được cài đặt và cấu hình đầy đủ các công cụ kể trên.

## Commit message
```bash
chore: add NovaWay web demo foundation with tailwind, shadcn, and router
```
