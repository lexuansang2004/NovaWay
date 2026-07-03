# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-02
* **Step Name**: Login Mock
* **Mục tiêu**: Xây dựng màn hình đăng nhập (Centered Card) có mock logic xác thực và Component Global Loading mô phỏng VR Scanner.

* **Yêu cầu thực hiện**:
  1. Cập nhật nhánh `feature/quick-demo`.
  2. Tạo component `LoginForm` đặt giữa màn hình, ảnh nền full-screen blur. Dùng shadcn/ui (`Card`, `Input`, `Button`, `Checkbox`).
  3. Viết mock logic đăng nhập với tài khoản cứng: `demo@novaway.vn` / `123456`. Nhập sai báo chữ đỏ.
  4. Tạo Global Component `VRScannerLoading` để tái sử dụng toàn app. Giao diện component này MANG TÍNH SỐNG CÒN đối với chất lượng demo, bắt buộc phải thiết kế đúng theo mô tả sau:
    > "Màn hình loading phong cách công nghệ tương lai dành cho ứng dụng định tuyến và phát hiện địa hình VR/AR. Nền chính là màu tối, xanh navy hoặc đen, tạo cảm giác hiện đại và cao cấp. Ở giữa màn hình là một bản đồ mini dạng line-art với các tuyến đường mảnh, nút giao thông và điểm định vị được phát sáng nhẹ.
    > Một chiếc xe nhỏ đang di chuyển theo tuyến đường cong phát sáng màu xanh cyan. Bên dưới xe có vòng radar scan mở rộng liên tục, tạo cảm giác hệ thống đang quét môi trường xung quanh. Khi radar quét qua, các vật thể dạng hologram lần lượt hiện sáng quanh tuyến đường như đồi núi, đoạn dốc, tường chắn, người đi bộ, xe máy, xe tải, ổ gà, vết nứt mặt đường, cọc tiêu và rào chắn công trình.
    > Các vật thể không hiển thị bằng nhãn chữ mà được thiết kế như mô hình bán thực tế dạng AR/VR hologram: trong suốt nhẹ, có viền xanh cyan, ánh sáng mềm, đường scan mỏng và hiệu ứng phát sáng khi được phát hiện. Tuyến đường chính chuyển dần từ xanh cyan sang xanh lá ở những đoạn an toàn, trong khi các khu vực có vật cản hoặc địa hình phức tạp có hiệu ứng nhấp nháy cảnh báo nhẹ.
    > Phía dưới animation hiển thị dòng chữ loading: 'Đang chuẩn bị hành trình...'. Tổng thể giao diện cần sạch, tối giản, không rối mắt, không hoạt hình trẻ con, mang cảm giác của một ứng dụng giao thông thông minh, định tuyến hiện đại và phát hiện địa hình bằng lớp phủ VR/AR."
  *(Gợi ý kỹ thuật: Không nhất thiết phải dùng WebGL/Three.js nặng nề. Bạn có thể dùng một ảnh nền tĩnh đẹp do AI generate, kết hợp CSS Animation (vòng tròn quét radar), SVG line-art và Framer Motion để fade-in các điểm phát sáng)*.
  5. Luồng xử lý: Form Login đúng -> Hiện đè `VRScannerLoading` -> Đợi khoảng 3.5 giây (hằng `LOGIN_LOADING_MS` từ `src/config/demo.ts`) -> Lưu `novaway_demo_auth` vào localStorage -> Redirect sang `/dashboard`. *(Lưu ý kiến trúc: tách hàm submit thành các bước rời — validate -> effects -> redirect — vì DEMO-03 sẽ chèn bước FaceScanner mode `login_auth` vào giữa "Form đúng" và `VRScannerLoading` để khớp kịch bản pitch.)*
  6. Xử lý giữ session: Nếu vào route `/login` mà localStorage đã có `novaway_demo_auth`, tự động redirect sang `/dashboard`.

* **Quy tắc bắt buộc**:
  1. Chỉ làm trong thư mục `/demo-app/`.
  2. Bám sát mô tả loading screen bằng CSS/SVG/Image kết hợp Framer Motion sao cho nhìn premium nhất có thể.
  3. Sau khi code xong, commit: `feat: add premium login screen and global vr scanner loading`.
