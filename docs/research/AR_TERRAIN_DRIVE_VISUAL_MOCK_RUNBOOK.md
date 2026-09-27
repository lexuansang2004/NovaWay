# AR Terrain — Drive Visual Mock Runbook

> Micro-step `8.1c`, branch `feat/ar-terrain-drive-visual-mock`. Đây là mô phỏng local/offline trên Lenovo bằng dữ liệu `SYNTHETIC/FIXTURE`; không phải AR, LiDAR, GPS thật, RTK hay kết quả thực địa.

## Mục tiêu

- Cho thấy xe di chuyển trên một hành lang mô phỏng và nhận cảnh báo trước khi đi qua ba vùng địa hình fixture.
- TPP (Third-Person Perspective — góc nhìn thứ ba/bản đồ tổng quan) là mặc định.
- FPP (First-Person Perspective — góc nhìn thứ nhất) chỉ là mô phỏng bản đồ phía trước, không giả camera hoặc thực tế tăng cường (AR).
- Hiển thị khoảng cách, thời gian cảnh báo trước và mức độ nghiêm trọng của cảnh báo đang hoạt động.
- Không có Second-Person runtime.

## Chạy thủ công trên Lenovo

1. Mở project `research/ar-terrain-unity/` bằng đúng Unity `6000.3.23f1`.
2. Mở scene `Assets/Scenes/DriveVisualMock.unity`.
3. Bấm Play.
4. Quan sát ít nhất 60 giây:
   - màn hình luôn có nhãn `SYNTHETIC / FIXTURE`;
   - xe tự chạy, cảnh báo xuất hiện trước vùng màu tương ứng;
   - nút `Đổi góc nhìn TPP / FPP` chuyển được hai view và giữ nguyên cảnh báo;
   - nút `Tạm dừng` và `Chạy lại tuyến` hoạt động;
   - Console không có error.

## Test tự động

EditMode tests bao phủ:

- parse catalog hợp lệ;
- từ chối schema không hỗ trợ và hazard ID trùng;
- chọn hazard gần nhất trong warning horizon;
- tính thời gian cảnh báo trước;
- cooldown không phát lặp liên tục nhưng vẫn giữ warning trên UI;
- chuyển sang hazard kế tiếp sau khi đã đi qua hazard trước;
- clamp khoảng cảnh báo tối thiểu/tối đa.

PlayMode smoke test tự động mở scene, xác nhận controller khởi động không lỗi, xe di chuyển, cảnh báo fixture xuất hiện, TPP chuyển được sang FPP và trạng thái tạm dừng giữ nguyên vị trí xe.

## Giới hạn bằng chứng

Kết quả PASS ở micro-step này chỉ chứng minh logic và giao diện mô phỏng trên Windows. Nó không chứng minh:

- build/ký/cài/chạy iOS (`8.1b`);
- ARKit Scene Reconstruction;
- quét LiDAR thật (`8.2`);
- georeference hoặc độ chính xác RTK;
- hiệu năng/pin/nhiệt trên iPhone.
