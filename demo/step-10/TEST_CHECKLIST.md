# Checklist kiểm tra

- [ ] Vào màn hình lái xe, hệ thống AR tự động ở trạng thái sẵn sàng ngầm (không cần nút bật).
- [ ] Xe di chuyển (có thể bấm x5 cho nhanh) tới gần tọa độ vật cản thứ nhất.
- [ ] Khoảng cách < 50m, viền màn hình chớp đỏ, lưới AR xuất hiện trên Map.
- [ ] Trình duyệt phát ra giọng nói tiếng Việt rồi tiếng Anh cảnh báo đúng loại vật thể (Ví dụ: "ổ gà", "người đi bộ").
- [ ] Xe đi qua khỏi tọa độ (khoảng cách > 50m), UI đỏ biến mất, âm thanh bị ngắt ngay lập tức.
- [ ] Sự kiện phát hiện vật cản được log vào `/offline-sync` thành công.
- [ ] Trải qua 3-4 vật cản khác nhau, hệ thống vẫn đọc đúng tên và không bị kẹt âm thanh.
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Console trình duyệt sạch (không có error/warning đỏ).
- [ ] Các step trước vẫn chạy bình thường (không regression).
