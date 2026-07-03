# Checklist kiểm tra

- [ ] Đã có file `/demo/DEMO_SCOPE_LOCK.md`.
- [ ] Trong file có đề cập tới các công nghệ React + Vite, Leaflet/OSM (demo) kèm định hướng MapLibre GL JS (production), localStorage.
- [ ] Trong file có liệt kê rõ các tính năng Mock (Face ID, GPS, offline queue).
- [ ] Trong file có nhấn mạnh các thứ KHÔNG LÀM (không dùng camera thật, không backend thật...).
- [ ] Có đề cập quy tắc thiết kế UI: tối ưu cho kích thước Laptop.
- [ ] Có chiến lược Git: branch `feature/quick-demo`, ghi rõ demo là nền tái sử dụng cho project chính (không phải disposable prototype).
- [ ] Có mục Clean Demo Foundation (mocks trong `src/mocks/`, hằng số trong `src/config/demo.ts`, services thay thế được trong `src/services/`, marker `TODO(production)`).
- [ ] Chỉ tạo document, không dính dáng tới khởi tạo project React.
