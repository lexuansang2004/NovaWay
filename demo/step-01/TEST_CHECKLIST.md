# Checklist kiểm tra

- [ ] Dự án được tạo trong thư mục `/demo-app/`.
- [ ] Lệnh `npm run dev` chạy không lỗi, không có warning đỏ ở Console trình duyệt.
- [ ] Đã có các thư viện trong `package.json`: `tailwindcss`, `react-router-dom`, `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge` (các dependency của shadcn).
- [ ] Truy cập `http://localhost:5173/` ra được chữ Placeholder Splash.
- [ ] Truy cập `http://localhost:5173/login` ra được chữ Placeholder Login.
- [ ] Truy cập `http://localhost:5173/start-trip` ra được chữ Placeholder Start Trip.
- [ ] Có đủ thư mục `src/services/`, `src/stores/`, `src/mocks/`, `src/config/` và file `src/config/demo.ts` chứa hằng số demo dùng chung.
- [ ] Cấu hình path alias `@/*` trong `tsconfig.json` và `vite.config.ts` hoạt động chuẩn.
- [ ] Lệnh `npm run build` pass, không vướng TypeScript error.
