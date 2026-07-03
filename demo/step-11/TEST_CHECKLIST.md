# Checklist kiểm tra

- [ ] Khởi động chuyến đi, tua nhanh x5 để dính cảnh báo.
- [ ] Bấm bừa vào 1 menu trên Sidebar (VD: Offline Sync) -> Map biến mất, nhưng có thanh Mini-player hiện ra ở góc phải dưới.
- [ ] Bấm vào thanh Mini-player -> Trở lại màn hình lái xe nguyên vẹn, số liệu km vẫn tiếp tục tăng không bị reset.
- [ ] Bấm nút "Kết thúc chuyến đi" màu đỏ trên bản đồ -> Chuyển sang màn hình Tổng kết.
- [ ] Màn hình Tổng kết hiện Điểm An Toàn hình tròn lớn màu Xanh/Vàng/Đỏ tùy điểm.
- [ ] Thông số quãng đường, thời gian khớp với lúc đang chạy.
- [ ] Bảng Audit Report liệt kê đầy đủ các sự kiện Mismatch và Hazard kèm số điểm bị trừ.
- [ ] Bấm "Về trang chủ" thì toàn bộ state được clear.
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Console trình duyệt sạch (không có error/warning đỏ).
- [ ] Các step trước vẫn chạy bình thường (không regression).
