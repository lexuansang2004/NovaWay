# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI Assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-00
* **Step Name**: Scope Lock
* **Mục tiêu**: Tạo tài liệu thống nhất phạm vi demo để tránh lan man.
* **Yêu cầu thực hiện**: 
  - Đọc và rà soát các tài liệu hiện có (với sự hỗ trợ của NotebookLM nếu cần) để đảm bảo không bị mâu thuẫn.
  - Tạo file `/demo/DEMO_SCOPE_LOCK.md` (đặt tên khác với `docs/demo/DEMO_SCOPE.md` hiện có để tránh hai file trùng tên nhưng khác nội dung).
  - Liệt kê các công nghệ sẽ dùng: React + Vite + TypeScript, OpenStreetMap + Leaflet (demo; production sẽ chuyển sang MapLibre GL JS theo TDR-002), localStorage.
  - Liệt kê các tính năng Mock: Mock GPS route, Mock offline queue, Mock Face ID Simulation, Mock AR Lite Overlay.
  - Nhấn mạnh nguyên tắc tính năng: KHÔNG dùng camera thật, nhận diện khuôn mặt thật, Flutter thật, Unity AR thật, Backend production, PostgreSQL/PostGIS, OSRM, Kafka/Redis, App Attestation.
  - **Quy tắc UI**: Giao diện demo phải được thiết kế và tối ưu hiển thị cho kích thước màn hình Laptop để tiện mang đi review trực tiếp.
  - **Chiến lược Git**: Toàn bộ code demo thực hiện trên branch `feature/quick-demo`. Demo KHÔNG phải throwaway prototype: sau khi demo xong sẽ review và merge có chọn lọc vào `develop` để làm nền cho project chính.
  - **Nguyên tắc Clean Demo Foundation**: Demo-only ở MẶT TÍNH NĂNG (mock GPS, mock Face ID, mock offline queue, mock cảnh báo địa hình), nhưng cấu trúc code, route, component, state, naming phải đủ sạch để thay mock bằng real service sau này. Quy ước: mock data trong `src/mocks/`, hằng số demo trong `src/config/demo.ts`, logic thay thế được bọc trong `src/services/`, mọi chỗ mock đánh dấu `// TODO(production): ...`. Chi tiết: `docs/demo/DEMO_TO_PRODUCTION_BRIDGE.md`.

* **Quy tắc bắt buộc**:
  1. Chỉ tạo file markdown, không setup project code trong step này.
  2. Cập nhật lại tài liệu cũ nếu NotebookLM phát hiện sai sót.
  3. Sau khi hoàn thành, commit file với message: `docs: add NovaWay demo scope and git strategy`
