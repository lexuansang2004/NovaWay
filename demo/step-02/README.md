# DEMO-02 - Login Mock

## Mục tiêu
Xây dựng màn hình đăng nhập dạng Centered Card cao cấp, có mock logic xác thực với tài khoản cố định. Xây dựng component Global Loading giả lập hiệu ứng "VR Terrain Scanner" (có thể tái sử dụng toàn app) nhằm tạo trải nghiệm "WOW" cho người xem demo.

## Scope
- Dựng UI Login: Nền blur overlay, form Card trắng ở giữa.
- Mock Auth: Cố định `demo@novaway.vn` / `123456`.
- Xây dựng component `VRScannerLoading.tsx` dùng chung. Component này phải được code sát nhất với mô tả "Màn hình loading phong cách công nghệ tương lai...".
- Sau khi loading 3.5s thì lưu `localStorage` và chuyển route sang `/dashboard`. (DEMO-03 sẽ chèn bước quét Face ID `login_auth` vào giữa flow này.)

## Non-scope
- Không gọi API thật.
- Không setup Database User.
- Không code 3D WebGL / Three.js quá nặng làm hỏng demo (ưu tiên CSS, Framer Motion và SVG/Image nền).

## Tech stack
- React + Tailwind CSS
- shadcn/ui components (`Card`, `Input`, `Button`, `Checkbox`)
- Framer Motion

## UI requirements
1. **Login Form**: Căn giữa, glassmorphism hoặc màu sáng thanh lịch trên nền blur.
2. **Global Loading**: Nền màu tối (xanh navy/đen), line-art bản đồ, xe di chuyển có radar scan màu cyan, các vật thể hologram nhấp nháy, text "Đang chuẩn bị hành trình...".

## Data/state requirements
- `novaway_demo_auth` trong localStorage.

## Behavior requirements
- Nhập sai báo lỗi đỏ.
- Nhập đúng hiện màn hình Loading VR Scanner full màn hình đè lên form login.
- 3.5s sau chuyển route `/dashboard`.
- F5 ở login sẽ tự động redirect nếu đã có session.

## Output expected
- Form login hoạt động.
- Component `VRScannerLoading.tsx` hoạt động mượt mà.

## Commit message
```bash
feat: add premium login screen and global vr scanner loading
```
