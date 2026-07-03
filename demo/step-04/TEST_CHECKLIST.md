# Checklist kiểm tra

- [ ] Đăng nhập xong tự động vào Layout có Sidebar.
- [ ] Sidebar hiển thị đầy đủ 6 menu chính.
- [ ] Icon của từng menu sử dụng Lucide React hiển thị đẹp và đều.
- [ ] Click vào từng menu thì URL đổi, khu vực bên phải hiển thị Placeholder text tương ứng.
- [ ] Góc dưới bên trái Sidebar có Avatar và tên user.
- [ ] Click vào Avatar bung ra Dropdown menu mượt mà (bằng shadcn/ui).
- [ ] Bấm nút "Đăng xuất" trong Dropdown thì lập tức bị văng ra form Login.
- [ ] Khi đã đăng xuất, thử cố tình gõ URL `http://localhost:5173/dashboard` thì bị chặn và đá lại về `/login`.
- [ ] Bố cục giao diện không bị vỡ khi resize cửa sổ.
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Console trình duyệt sạch (không có error/warning đỏ).
- [ ] Các step trước vẫn chạy bình thường (không regression).
