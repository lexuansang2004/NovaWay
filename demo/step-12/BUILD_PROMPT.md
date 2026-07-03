# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-12
* **Step Name**: Polish Demo & Pitching Prep
* **Mục tiêu**: Làm mượt UI/UX cho màn hình 16:9, fix toàn bộ cảnh báo React và làm công cụ Reset Demo.

* **Yêu cầu thực hiện**:
  1. **UI/UX Polish (16:9 Laptop View)**:
     - Rà soát CSS toàn bộ các file từ `step-01` đến `step-11`. Đảm bảo các khung hình (Container) được set `max-w-7xl` hoặc vừa vặn trên màn hình Desktop.
     - Kiểm tra khoảng cách padding/margin chuẩn xác.
  2. **Presenter Tool (Nút Reset)**:
     - Tạo một nút nhỏ "Reset Demo" (Có màu đỏ/xám) nằm ở góc dưới cùng bên trái của Sidebar.
     - Hàm onClick: 
       ```javascript
       localStorage.clear();
       window.location.reload();
       ```
  3. **Code Cleanup**:
     - Tìm và xóa toàn bộ `console.log()` rác trong code.
     - Rà soát: mọi hằng số demo (timings, ngưỡng tốc độ, bán kính hazard, batch size) phải import từ `src/config/demo.ts`; mọi mock data nằm gọn trong `src/mocks/`.
     - Chạy grep `TODO(production)` và liệt kê toàn bộ kết quả vào cuối file `/demo/DEMO_SCOPE_LOCK.md` (mục "Nợ kỹ thuật có chủ đích") — đây là checklist khi chuyển demo thành project chính.
     - Fix các lỗi React Warnings trong console trình duyệt (Ví dụ: `.map()` thiếu thuộc tính `key`, thẻ `<a>` thiếu `href`).
  4. **Performance**:
     - Đảm bảo việc dùng `setInterval` hay `requestAnimationFrame` ở DEMO-07, 09, 10 đều có hàm `cleanup` (như `clearInterval` hoặc `cancelAnimationFrame`) khi component unmount để không rò rỉ bộ nhớ gây giật lag sau 3 lần demo.

* **Quy tắc bắt buộc**:
  1. Không làm thay đổi bất kỳ logic lõi nào đã viết ở các step trước.
  2. Bắt buộc luồng chạy mượt mà, không giật lag.
  3. Sau khi code xong, commit: `style: polish ui for 16-9 display, fix warnings and prepare for presentation`.
