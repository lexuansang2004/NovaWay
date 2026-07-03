# Checklist kiểm tra

- [ ] Công tắc Mạng (Online/Offline) xuất hiện ở giữa màn hình Cockpit, đổi màu đúng trạng thái.
- [ ] Vào trang `/offline-sync`, bấm "Tạo 20 Event Test" khi đang Online -> Hiện báo lỗi.
- [ ] Gạt tắt mạng (Offline), bấm "Tạo 20 Event Test" -> 20 events xuất hiện ở Cột Queue.
- [ ] Bật lại mạng (Online) -> Nhìn vào Cột Queue tự động đếm ngược giảm dần (bốc từng lô 5 cái/giây), Cột History tăng dần lên.
- [ ] Trong toàn bộ quá trình, Sidebar hoàn toàn sạch sẽ, không có bất kỳ chấm đỏ cảnh báo nào.
- [ ] Reload trang (F5) khi có data trong Queue -> Dữ liệu không bị mất (nhờ localStorage).
- [ ] localStorage dùng đúng key `novaway_demo_offline_queue` / `novaway_demo_sync_history`.
- [ ] Gọi `addEvent()` khi đang Online -> event vào thẳng History (không qua Queue).
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Console trình duyệt sạch (không có error/warning đỏ).
- [ ] Các step trước vẫn chạy bình thường (không regression).
