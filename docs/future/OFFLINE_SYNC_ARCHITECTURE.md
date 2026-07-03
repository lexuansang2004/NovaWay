# NovaWay - Offline Sync & Resilience Architecture

Tài liệu này mô tả kiến trúc xử lý sự cố mất kết nối mạng và quản lý dữ liệu ngoại tuyến (Offline Queue) của hệ thống NovaWay, nhằm đảm bảo tính toàn vẹn dữ liệu (Audit Log) và chống nghẽn mạng (Network Congestion).

## Vấn đề thực tiễn
Khi phương tiện di chuyển qua các khu vực đèo núi, vùng sâu vùng xa hoặc hầm ngầm, kết nối mạng (3G/4G/5G) sẽ bị ngắt quãng. Hệ thống cần tiếp tục ghi nhận các sự kiện cảnh báo (tốc độ, sai phương tiện, địa hình) mà không làm tràn bộ nhớ thiết bị, và sau đó phải đồng bộ lên máy chủ an toàn khi có mạng trở lại.

## 3 Cơ chế cốt lõi (Core Mechanisms)

### 1. Storage Engine (Công cụ lưu trữ cục bộ)
- **Vấn đề**: `localStorage` trên trình duyệt Web có giới hạn khoảng 5MB, dễ bị đầy nếu mất mạng quá lâu.
- **Giải pháp Production**: 
  - Sử dụng **IndexedDB** (trên Web/PWA) hoặc **SQLite** (trên Mobile App Native).
  - Khả năng lưu trữ lên đến hàng Gigabytes, cho phép người dùng lưu dữ liệu ngoại tuyến trong nhiều ngày/tháng mà không bị đầy.
- **Trong Demo**: Dùng `localStorage` để mô phỏng cơ bản.

### 2. Data Aggregation (Nén và Gộp dữ liệu ngầm)
- **Vấn đề**: Việc lưu mỗi giây 1 dòng log (VD: `10:00:01 - Speed 95km/h`, `10:00:02 - Speed 96km/h`) sẽ tạo ra lượng rác dữ liệu khổng lồ.
- **Giải pháp Production**:
  - Nhóm các sự kiện liên tiếp thành các "Khối" (Block/Session). 
  - Ví dụ: `[10:00:01 - 10:05:00]: Vi phạm tốc độ liên tục. Max speed: 105km/h. Tọa độ bắt đầu: [lat, lng]. Tọa độ kết thúc: [lat, lng]`.
  - Cơ chế này giảm dung lượng dữ liệu cần lưu/gửi đi hàng chục lần.

### 3. Batch Syncing (Đồng bộ theo lô)
- **Vấn đề**: Khi có mạng trở lại, nếu hàng ngàn phương tiện cùng gửi toàn bộ hàng chờ ngoại tuyến (chứa hàng vạn events) lên server cùng một lúc, máy chủ API sẽ bị sập (DDoS cục bộ).
- **Giải pháp Production**:
  - Gửi dữ liệu theo từng lô (Batch), ví dụ 50 events/lần gửi.
  - Sử dụng hàng đợi có thời gian trễ (Exponential Backoff) nếu server báo bận.
- **Trong Demo**: Thể hiện trực quan bằng cách đếm ngược số lượng queue giảm dần (bốc từng lô 5 events mỗi giây) cho đến khi về 0, thay vì biến mất toàn bộ ngay lập tức.
