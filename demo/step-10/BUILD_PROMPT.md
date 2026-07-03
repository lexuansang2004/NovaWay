# Yêu cầu thực thi (Gửi cho AI Coding)

Bạn là AI coding assistant cho dự án NovaWay Demo.
Hãy thực hiện đúng micro-step sau:

* **Step ID**: DEMO-10
* **Step Name**: AR Lite Terrain Scanner & Omni-Detection
* **Mục tiêu**: Xây dựng UI HUD AR giả lập quét mọi vật thể và đọc cảnh báo bằng giọng nói. Hệ thống chạy TỰ ĐỘNG, không cần user bật.

* **Yêu cầu thực hiện**:
  1. Chuyển component `VrRadarOverlay` (DEMO-06) sang `autoMode` **Luôn Bật** (Always ON) khi đang lái xe; gỡ nút Toggle khỏi UI (chỉ đổi prop và ẩn nút, KHÔNG viết lại component).
  2. Tạo mảng `MOCK_HAZARDS` đặt tại `src/mocks/hazards.ts` chứa ít nhất 4 đối tượng dọc đường Quang Trung (người, động vật, ổ gà, tường) kèm tọa độ `[lat, lng]`, `nameVi`, `nameEn`.
  3. **Thuật toán quét**:
     - Lắng nghe `currentPosition`. Tính khoảng cách tới các hazard.
     - Nếu khoảng cách < `HAZARD_RADIUS_M` (50m, import từ `src/config/demo.ts`), kích hoạt state `activeHazard`. Nếu lớn hơn thì null.
  4. **UI AR HUD (Kiểu 2 - Kính thực tế ảo)**:
     - Khi có `activeHazard`: Thêm class CSS bao trọn màn hình Cockpit bằng `box-shadow: inset 0 0 50px 20px rgba(255, 0, 0, 0.5)` để viền màn hình đỏ rực lên.
     - Tạo 1 div phủ toàn màn hình chứa lưới AR (grid background) có animation trượt nhẹ.
     - Ở giữa hiển thị Box cảnh báo: `[!] Nhận diện: {activeHazard.nameVi}`.
  5. **Audio Voice Alert (Quan trọng)**:
     - Dùng `const speech = new SpeechSynthesisUtterance()` để đọc.
     - Kịch bản: `"Chú ý, có ${nameVi} phía trước. Warning, ${nameEn} ahead."`
     - Lưu ý cơ chế lặp (loop): Âm thanh lặp lại mỗi 3-5 giây nếu xe vẫn trong vùng nguy hiểm (<50m). Khi ra khỏi vùng, gọi `window.speechSynthesis.cancel()` ngay lập tức để dừng đọc.
  6. **Audit Log**:
     - Ghi nhận vào Offline Queue 1 sự kiện `TERRAIN_HAZARD_DETECTED` (kèm loại vật cản và tọa độ). Đảm bảo chỉ log 1 lần cho mỗi vật cản để tránh spam.

* **Quy tắc bắt buộc**:
  1. Trải nghiệm thị giác phải mang tính Sci-Fi, ngầu, nhưng không che khuất hoàn toàn bản đồ ở phía dưới.
  2. Xử lý triệt để Web Speech API để không bị kẹt giọng nói (Voice Queue Bug).
  3. Sau khi code xong, commit: `feat: add auto ar hud scanner, omni-detection mock, and bilingual voice`.
