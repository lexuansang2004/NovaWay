# NovaWay Demo - Micro-step Updates

## DEMO-09 - Mobility Mismatch Warning

### Target
Demo cảnh báo sai lệch phương tiện cho Xe máy và Ô tô.

### Demo Rule
Nếu chọn Xe máy nhưng tốc độ mock vượt ngưỡng cao, hiển thị cảnh báo xác nhận lại phương tiện.
Nếu chọn Ô tô thì không cảnh báo trong route demo mặc định.

### UI Copy
Tốc độ hiện tại có vẻ không phù hợp với phương tiện đã chọn. Bạn có muốn kiểm tra lại phương tiện không?

### Behavior
- Hiển thị cảnh báo dạng overlay lớn, rõ ràng.
- Cho phép người dùng xác nhận bằng 1 chạm.
- Tự động ẩn sau 10 giây nếu không có phản hồi.
- Ghi mock log vào localStorage để mô phỏng việc hệ thống ghi nhận sự kiện bất thường.
- Admin Dashboard thật sẽ thuộc Post-MVP, không làm trong demo hiện tại.

### Không làm
- Không kết luận vi phạm.
- Không dùng từ gian lận.
- Không xử phạt.
- Không áp dụng cho Đi bộ/Xe đạp trong demo.
- Không làm Admin Dashboard thật trong demo.
- Không gửi dữ liệu thật lên server.

### Test Gate
- Chọn Xe máy và tốc độ mock vượt ngưỡng thì hiện overlay.
- Overlay dùng nội dung trung lập, không kết luận vi phạm.
- Overlay tự ẩn sau 10 giây.
- Người dùng có thể xác nhận/đổi phương tiện bằng 1 chạm.
- Mock log được lưu vào localStorage.
- Không ảnh hưởng đến flow bản đồ và trip summary.

### Commit
`git commit -m "feat: add mobility mismatch warning demo"`
