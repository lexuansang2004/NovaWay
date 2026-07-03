# Checklist kiểm tra

- [ ] Chọn phương tiện "Ô tô", dùng Demo Controls tăng tốc (x5) vượt 80km/h -> KHÔNG hiển thị cảnh báo.
- [ ] Chọn phương tiện "Xe máy", dùng Demo Controls tăng tốc (x5) vượt 80km/h -> Popup cảnh báo màu Cam xuất hiện ở giữa màn hình.
- [ ] Popup cảnh báo có chứa 2 nút: "Xác nhận xe máy" và "Đổi phương tiện". Text nhẹ nhàng, lịch sự.
- [ ] Bảng đếm ngược 10 giây (progress bar / text) hoạt động và tự động ẩn Popup khi hết giờ.
- [ ] Bấm nút 1 trong 2 nút trên Popup thì tắt nhanh Popup.
- [ ] Kiểm tra màn hình `/offline-sync`, thấy dòng Log `MISMATCH_WARNING` xuất hiện (ở cột History nếu đang Online, cột Queue nếu đang Offline), có chứa toạ độ (Lat, Lng) và tốc độ lúc kích hoạt.
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Console trình duyệt sạch (không có error/warning đỏ).
- [ ] Các step trước vẫn chạy bình thường (không regression).
