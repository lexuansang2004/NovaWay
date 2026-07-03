# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-01
* **Step Name**: Web Setup
* **Mục tiêu**: Tạo dự án nền tảng web React Vite với Tailwind, shadcn/ui, Framer Motion và React Router.

* **Phạm vi làm**:
  - Checkout sang nhánh `feature/quick-demo` trước khi làm (nếu chưa ở nhánh này).
  - Tạo dự án tại thư mục `/demo-app/` bằng `npx create-vite@latest demo-app --template react-ts`.
  - cd vào `demo-app`, cài đặt dependency cơ bản (`npm install`).
  - Cài đặt và init `tailwindcss`, `postcss`, `autoprefixer`.
  - Cài đặt và init `shadcn/ui` (với cấu hình alias `@/components` trỏ vào `src/components`). Chỉnh sửa `tsconfig.json` và `vite.config.ts` để hỗ trợ path alias theo chuẩn shadcn.
  - Cài đặt `framer-motion` và `react-router-dom`.
  - Tạo cấu trúc thư mục: `src/pages/`, `src/components/`, `src/layouts/`, `src/services/`, `src/stores/`, `src/mocks/`, `src/config/`.
  - Tạo file `src/config/demo.ts` export các hằng số demo dùng chung: `LOGIN_LOADING_MS = 3500`, `FACE_SCAN_MS = 3000`, `RESULT_POPUP_MS = 2000`, `WARNING_AUTO_DISMISS_MS = 10000`, `MISMATCH_SPEED_KMH = 80`, `HAZARD_RADIUS_M = 50`, `SYNC_BATCH_SIZE = 5`, `SYNC_INTERVAL_MS = 1000`. Các step sau BẮT BUỘC import từ đây thay vì hardcode magic numbers.
  - Thiết lập Router ở file `App.tsx` hoặc `main.tsx` với các đường dẫn Placeholder theo IA cuối cùng của app: `/` (Splash), `/login`, `/dashboard`, `/start-trip`, `/vehicles`, `/trip-history`, `/offline-sync`, `/settings`, và `/face-auth` (dev harness test FaceScanner của DEMO-03). Các component này chỉ cần `return <div>Tên trang</div>`. KHÔNG tạo route `/vehicle`, `/map`, `/summary` — flow lái xe và summary nằm bên trong `/start-trip` (xem DEMO-05, DEMO-11).
  - Chỉnh sửa file HTML hoặc CSS nền tảng để giao diện hiển thị tốt cho kích thước Laptop.

* **Phạm vi KHÔNG làm**:
  - Không thiết kế giao diện chi tiết.
  - Không code tính năng logic.

* **Quy tắc bắt buộc**:
  1. Nếu báo lỗi conflict file khi cài shadcn, hãy ưu tiên force hoặc dọn dẹp sạch file cũ.
  2. Hãy viết sẵn script hướng dẫn chạy dev và build sau khi hoàn tất.
  3. Commit code với message `chore: add NovaWay web demo foundation with tailwind, shadcn, and router`.
