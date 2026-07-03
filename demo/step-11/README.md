# DEMO-11 - End Trip Summary & Trip Protection

## Mục tiêu
Xây dựng màn hình Tổng kết chuyến đi mang phong cách Tech/Audit Dashboard để định lượng độ tin cậy bằng "Safety Score". Đồng thời, thêm cơ chế Trip Protection (Mini-player) ngăn người dùng tắt nhầm hành trình đang chạy.

## Scope
- Làm trong step này:
  - Cơ chế Trip Protection (Mini-player): Nhờ `useTripStore` đã là global store từ DEMO-07, chỉ cần đảm bảo engine GPS không bị unmount theo route. Hiện thanh Floating Widget dưới góc màn hình báo hiệu chuyến đi đang chạy. Bấm vào sẽ mở lại Map.
  - Thuật toán Safety Score: Điểm gốc 100đ. Trừ 5đ mỗi lần Mismatch, trừ 2đ mỗi lần quét trúng vật cản địa hình (Hazard).
  - Giao diện Summary: Chuyển sang route `/start-trip/summary` sau khi bấm "Kết thúc chuyến đi". Có hình tròn Safety Score lớn ở giữa, các thông số Quãng đường/Thời gian, và bảng phân tích chi tiết.

## Non-scope
- Không làm share mxh.
- Không kết nối API bảo hiểm.

## Tech stack
- Zustand (`useTripStore` có sẵn từ DEMO-07) để giữ luồng chuyến đi khi navigate.
- SVG thuần/Tailwind để vẽ vòng tròn điểm số.
- Framer Motion (hiệu ứng Mini-player).

## Output expected
- Chuyến đi không bị hủy khi đổi tab/menu. Khi kết thúc, hiện đầy đủ điểm an toàn hợp lý dựa trên log.

## Commit message
```bash
feat: add tech summary dashboard, safety score and trip mini-player
```
