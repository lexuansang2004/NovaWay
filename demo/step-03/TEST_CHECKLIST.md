# Checklist kiểm tra

- [ ] Route `/face-auth` load thành công.
- [ ] Giao diện Avatar Hologram hiển thị đúng, tia laser xanh quét lên xuống mượt mà.
- [ ] Truy cập thử `/face-auth?mode=login_auth`, quét xong hiện thông báo thành công; dev harness log kết quả `onComplete` (component không tự chuyển trang).
- [ ] Truy cập `/face-auth?mode=vehicle_auth`, quét 3 giây xong bật Pop-up to.
- [ ] Test thử biến `isOwner = true` trong code, Text Pop-up báo đúng `✅ Quyền sử dụng: Chủ xe...`
- [ ] Test thử biến `isOwner = false` trong code, Text Pop-up báo đúng `✅ Quyền sử dụng: Chủ xe... phê duyệt... (Còn 24h)`
- [ ] Pop-up hiện 2 giây rồi component gọi `onComplete` kèm `authData` (dev harness hiển thị/log kết quả, không tự redirect).
- [ ] Trong file code có comment TODO nhắc nhở việc đấu API lịch sử và quản lý xe.
- [ ] Login thật: nhập đúng mật khẩu -> FaceScanner (`login_auth`) hiện -> thành công -> VRScannerLoading -> vào `/dashboard`.
- [ ] Có Badge "Demo Simulation" trên màn hình scan.
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Console trình duyệt sạch (không có error/warning đỏ).
- [ ] Các step trước vẫn chạy bình thường (không regression).
