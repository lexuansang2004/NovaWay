# NovaWay — Edge Cases v0.1

> Step D0.2. Mở rộng từ `docs/06_NEXT_STEP_D0_2_INPUT.md` §7. Mỗi case ghi rõ hành vi kỳ vọng để `TEST_STRATEGY.md` và `ACCEPTANCE_CRITERIA.md` có thể trace. Case nào chưa có hành vi kỳ vọng rõ ràng được đánh dấu **[OPEN]** — cần chốt ở D0.3.

## 1. Permission & Consent

| Case | Hành vi kỳ vọng |
|---|---|
| Người dùng từ chối quyền vị trí | Không thể bắt đầu chuyến đi; hiển thị màn hình giải thích + nút mở lại cài đặt quyền |
| Người dùng từ chối quyền vị trí nền/always (iOS) | Vẫn cho tracking foreground; hiển thị cảnh báo rõ về giới hạn khi app xuống nền |
| Người dùng thu hồi quyền vị trí giữa chuyến đi | **[OPEN]** — cần chốt: dừng trip ngay hay cảnh báo trước rồi mới dừng |

## 2. Vehicle & Trip State

| Case | Hành vi kỳ vọng |
|---|---|
| Người dùng bắt đầu chuyến đi khi chưa có xe active | Bị chặn, yêu cầu chọn xe trước (AC-VEHICLE-02) |
| Người dùng đổi phương tiện đang hoạt động giữa chuyến đi | **[OPEN]** — MVP có cho đổi xe giữa chuyến hay bắt buộc kết thúc chuyến trước? Đề xuất: không cho đổi giữa chuyến ở MVP, chỉ đổi được lúc idle |
| Người dùng mở hai phiên (hai thiết bị) cùng một tài khoản và cùng bắt đầu chuyến đi | **[OPEN]** — cần quyết định: chặn phiên thứ hai, hay cho phép và coi là hai trip độc lập |

## 3. Network & Realtime

| Case | Hành vi kỳ vọng |
|---|---|
| Mobile mất mạng giữa chuyến đi | Không crash; chuyển sang lưu local queue (AC-SYNC-01) |
| Mobile app bị đưa xuống nền hoặc khoá màn hình khi đang active trip | Tracking tiếp tục theo quyền đã cấp; không mất trạng thái chuyến đi ngay lập tức (AC-BGLOC-02) |
| Mobile reconnect với local queue lớn (>500 events) | Queue được chia thành nhiều chunk, gửi tuần tự (AC-SYNC-04) |
| Nhiều thiết bị cùng mất sóng trong cùng khu vực rồi có mạng lại đồng thời | Mỗi thiết bị reconnect với delay khác nhau nhờ jitter, tránh thundering herd (AC-REALTIME-04) |
| WebSocket bị ngắt kết nối bất ngờ | Mobile chuyển trạng thái "disconnected", chuyển sang lưu queue (AC-REALTIME-03) |
| GPS payload không hợp lệ (toạ độ ngoài phạm vi, thiếu field) | Server từ chối, không lưu, không broadcast (AC-REALTIME-02) |
| GPS event gửi quá dày (spam) | Bị rate limit ở cả client và server (NFR-PERF-01) |

## 4. Offline Sync

| Case | Hành vi kỳ vọng |
|---|---|
| Cùng một `client_event_id` được gửi lại nhiều lần | Không tạo bản ghi trùng; tính vào `duplicate_count` (AC-SYNC-03) |
| Batch sync thất bại một phần (một số event lỗi, một số hợp lệ) | Server xử lý phần hợp lệ, trả rõ danh sách event lỗi kèm `error_code` (AC-SYNC-05) |
| Response partial success không rõ ràng | Không được chấp nhận — bắt buộc theo đúng format ở TDR-005, tránh client phải đoán |
| Local queue vượt quá dung lượng lưu trữ cho phép trên thiết bị | **[OPEN]** — cần chốt chính sách: xoá event cũ nhất trước (FIFO) hay chặn tracking mới |

## 5. Device Condition (AR Lite)

| Case | Hành vi kỳ vọng |
|---|---|
| Thiết bị quá nóng (thermal state cao) | Chuyển sang fallback: chỉ hiển thị cảnh báo trên bản đồ, tắt camera/AR (AC-AR-01) |
| Ánh sáng quá yếu (ban đêm/trời mưa) khiến AR không đáng tin cậy | Chuyển sang fallback tương tự thermal (AC-AR-01) |
| Pin yếu | **[OPEN]** — cần chốt ngưỡng % pin để tự tắt AR/camera phòng ngừa |
| Camera không khả dụng (bị chiếm bởi app khác, lỗi phần cứng) | App không crash, chuyển fallback bản đồ (FR-AR-04) |

## 6. Vehicle Mismatch Detection

| Case | Hành vi kỳ vọng |
|---|---|
| Tốc độ vượt ngưỡng chỉ trong thời gian ngắn (vd. vài giây, do xuống dốc) | Không tạo cảnh báo — chỉ kích hoạt khi vượt ngưỡng liên tục "đủ dài" (AC-MISMATCH-01); ngưỡng thời gian chính xác **[OPEN]**, cần chốt ở D0.3 |
| Người dùng nhận cảnh báo Vehicle Mismatch trong lúc đang lái ở tốc độ cao | Cảnh báo hiển thị dạng driver-friendly overlay, không yêu cầu thao tác phức tạp (AC-WARNUI-01) |
| Người dùng báo cáo sai vật cản/địa hình (false positive) | Ngoài phạm vi MVP theo mô tả hiện tại — xử lý qua Crowdsourced Trust Verification ở Post-MVP |

## 7. Data & Storage

| Case | Hành vi kỳ vọng |
|---|---|
| Bảng raw GPS events phát triển quá nhanh | Cần partitioning theo thời gian + TTL cleanup job 30 ngày (AC-RETENTION-01) |
| Tile provider (Protomaps/Mapbox Free Tier) vượt quota | **[OPEN]** — cần chốt phương án dự phòng (fallback provider hoặc giới hạn tính năng bản đồ) trước khi chọn final ở D0.3 |
| Developer Mode vô tình bị bật trên bản production | Phải được ngăn bằng build flag/env, không expose qua UI thường (AC-DEVMODE-03) |

## 8. Terminology & Compliance

| Case | Hành vi kỳ vọng |
|---|---|
| Nội dung cảnh báo/UI vô tình dùng từ bị cấm ("gian lận", "phạt nguội", "NovaPay") | Phải được bắt ở review nội dung trước khi release — xem Terminology Rules trong `PRD.md`/`SRS.md` |
