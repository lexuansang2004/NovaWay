# Checklist kiểm tra

- [ ] Vào `/start-trip`, chỉ GĐ 1 sáng rõ, GĐ 2 và GĐ 3 bị mờ và không thể click.
- [ ] Hover vào "Đi bộ" hoặc "Xe đạp" hiện đúng tooltip. Không thể chọn.
- [ ] Chọn "Xe máy", GĐ 2 sáng lên và màn hình tự động cuộn mượt xuống GĐ 2.
- [ ] GĐ 2 chỉ hiển thị danh sách các xe máy.
- [ ] Chọn 1 chiếc xe máy, GĐ 3 sáng lên và màn hình cuộn xuống GĐ 3.
- [ ] Bấm "Bắt đầu xác minh", giao diện Hologram quét khuôn mặt hiện ra, chạy luồng FaceID bình thường.
- [ ] Sau khi quét xong và hiện popup uỷ quyền 2 giây, toàn bộ màn hình 3 bước biến mất.
- [ ] Giao diện thay thế bằng một vùng chữ "Driving Map Cockpit Placeholder" to ở giữa. URL vẫn là `/start-trip`.
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Console trình duyệt sạch (không có error/warning đỏ).
- [ ] Các step trước vẫn chạy bình thường (không regression).
