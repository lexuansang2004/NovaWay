# Checklist kiểm tra

- [ ] Giao diện (App Shell, Map, Summary) hiển thị cực kỳ cân đối trên màn hình ngang (Laptop), không bị cuộn ngang, chữ không bị tràn viền.
- [ ] Bật DevTools (F12) -> Console sạch sẽ, không có bất kỳ dòng chữ vàng (Warning) hay đỏ (Error) nào.
- [ ] Luồng chạy mượt mà, các Modal (Cảnh báo Mismatch) và AR Grid bật lên/tắt đi êm ái, không giật cục.
- [ ] Bấm nút "Reset Demo" -> Trang web tải lại và trở về trạng thái trống (Chưa đăng nhập, lịch sử xe/queue bị xóa sạch).
- [ ] Chạy đi chạy lại toàn bộ luồng ít nhất 3 lần mà trình duyệt vẫn chạy nhẹ nhàng, không bị đơ.
- [ ] `npm run build` pass, không có TypeScript error.
- [ ] Không còn magic number rải rác (đã gom về `src/config/demo.ts`), mock data nằm gọn trong `src/mocks/`.
- [ ] Danh sách `TODO(production)` đã được liệt kê vào `/demo/DEMO_SCOPE_LOCK.md` (mục "Nợ kỹ thuật có chủ đích").
