# Checklist kiểm tra

- [ ] Route `/login` load thành công, giao diện Centered Card có ảnh nền mờ.
- [ ] Gõ sai tài khoản hiện thông báo lỗi.
- [ ] Gõ đúng `demo@novaway.vn` / `123456`, form fade out.
- [ ] Màn hình Loading VR Scanner xuất hiện lấp đầy màn hình.
- [ ] Giao diện Loading bám sát phong cách "tương lai", nền tối, có radar quét, có xe di chuyển/chữ "Đang chuẩn bị hành trình...".
- [ ] Sau ~3.5 giây loading, tự động chuyển trang `/dashboard`.
- [ ] Check `localStorage` ở Application tab có key `novaway_demo_auth`.
- [ ] F5 reload lại trang `/login` sẽ bị văng sang `/dashboard` (nếu session còn giữ).
- [ ] Component `VRScannerLoading.tsx` nằm trong thư mục chung (ví dụ `src/components/common/`) để gọi dùng ở chỗ khác được.
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Console trình duyệt sạch (không có error/warning đỏ).
- [ ] Các step trước vẫn chạy bình thường (không regression).
