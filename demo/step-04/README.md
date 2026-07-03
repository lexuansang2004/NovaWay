# DEMO-04 - App Shell & Navigation Menu

## Mục tiêu
Xây dựng giao diện App Shell (Khung ứng dụng chính) của NovaWay sau khi người dùng đăng nhập thành công. Khung này bao gồm Sidebar (Thanh điều hướng bên trái) mang phong cách hiện đại (như ChatGPT) và khu vực Main Content bên phải để render các Route con.

## Scope
- Cấu hình lại React Router với component `Layout` (Sidebar + Main Area).
- Xây dựng Component Sidebar gồm:
  - Top/Middle: 6 menu chính (`/dashboard`, `/start-trip`, `/vehicles`, `/trip-history`, `/offline-sync`, `/settings`).
  - Bottom: Account Menu dạng popover/dropdown chứa Avatar, Tên người dùng và nút Đăng xuất.
- Xử lý logic Đăng xuất (xóa `localStorage` và đẩy về `/login`).
- Tạo sẵn các Component rỗng (Placeholder) cho tất cả các đường dẫn trên.

## Non-scope
- Không code UI chi tiết bên trong `/start-trip` hay `/vehicles`.

## Tech stack
- React + Vite
- Styling thống nhất: Tailwind CSS + shadcn/ui + Framer Motion.
- React Router DOM
- Lucide React (Icons)

## UI requirements
- Sidebar nằm cố định bên trái, màu sắc và icon phải tuân thủ nghiêm ngặt chuẩn UI của dự án.
- Dropdown Account hiện lên khi click vào tên user ở góc dưới.

## Behavior requirements
- Bấm menu -> Đổi URL -> Đổi nội dung Main Area.
- Bấm Đăng xuất -> Xóa session -> Về Login.

## Output expected
- Khung App Shell hoạt động ổn định.
- React Router chạy mượt mà không lỗi.

## Commit message
```bash
feat: add app shell and navigation menu
```
