# DEMO-10 - AR Lite Terrain Scanner & Omni-Detection

## Mục tiêu
Giả lập hệ thống thị giác máy tính (Computer Vision) qua kính AR, tự động quét và phát hiện liên tục các thực thể xung quanh (Người, Động vật, Xe cộ, Địa hình...). Cảnh báo bằng giao diện Kính HUD không gian ảo và giọng nói AI song ngữ.

## Scope
- Làm trong step này:
  - Khởi tạo mảng dữ liệu `MOCK_HAZARDS` chứa tọa độ nhiều loại vật cản trên đường Quang Trung (Người đi bộ, chó, ổ gà, chướng ngại vật).
  - Thuật toán Radar: Hệ thống **TỰ ĐỘNG** bật và liên tục tính khoảng cách giữa xe và vật cản. (Bỏ nút Toggle thủ công của user).
  - Giao diện HUD AR (Visual): Khi khoảng cách < 50m, viền màn hình chớp đỏ mờ (Vignette), có lưới điện tử quét ngang/dọc, và hiển thị Tên vật thể ở giữa màn hình.
  - Cảnh báo âm thanh (Audio): Sử dụng `Web Speech API` đọc cảnh báo song ngữ (Ví dụ: "Chú ý, có người đi bộ phía trước. Warning, pedestrian ahead").
  - Ghi Audit Log: Bắn event `TERRAIN_HAZARD_DETECTED` vào Offline Store.
  
## Non-scope
- Không sử dụng Camera thật hay nhúng Model AI nhận diện hình ảnh thật.

## Tech stack
- `Window.speechSynthesis` API.
- CSS Animations (`box-shadow: inset`, `@keyframes` quét lưới).
- Thuật toán tính khoảng cách (Distance calculation).

## Output expected
- Xe chạy đến gần vật cản -> Màn hình chớp đỏ, giọng nói AI phát lên liên tục -> Xe đi qua -> Màn hình bình thường, ngắt giọng nói.

## Commit message
```bash
feat: add auto ar hud scanner, omni-detection mock, and bilingual voice
```
