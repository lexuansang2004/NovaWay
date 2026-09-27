# NovaWay — Acceptance Criteria v0.1

> Step D0.2. Định dạng Given/When/Then, gắn mã theo `SRS.md`. Đây là điều kiện để coi một tính năng MVP "đạt", dùng làm input trực tiếp cho `TEST_STRATEGY.md`.

## 1. Authentication (FR-AUTH)

**AC-AUTH-01** — Đăng ký/đăng nhập hợp lệ
- Given người dùng chưa có tài khoản
- When họ đăng ký với email/password hợp lệ
- Then hệ thống tạo tài khoản và cho phép đăng nhập ngay sau đó

**AC-AUTH-02** — Chặn truy cập không token
- Given một request tới endpoint được bảo vệ không kèm token hoặc token sai/hết hạn
- When request được gửi
- Then server trả về 401, không lộ dữ liệu

## 2. Vehicle Management (FR-VEHICLE)

**AC-VEHICLE-01** — Cô lập dữ liệu theo chủ sở hữu
- Given User A và User B mỗi người có ít nhất một xe
- When User B cố sửa/xoá xe của User A
- Then hệ thống từ chối thao tác (403/404 tuỳ thiết kế), không có gì thay đổi ở phía User A

**AC-VEHICLE-02** — Bắt buộc có xe trước khi đi
- Given người dùng chưa chọn phương tiện đang hoạt động
- When họ cố bắt đầu chuyến đi
- Then hệ thống chặn hành động và yêu cầu chọn xe trước

## 3. Trip Lifecycle & Consent (FR-TRIP)

**AC-TRIP-01** — Không tracking trước khi có consent
- Given người dùng chưa đồng ý chia sẻ vị trí
- When họ mở app hoặc ở màn hình chờ
- Then không có GPS event nào được gửi hoặc ghi nhận

**AC-TRIP-02** — Bắt đầu chuyến đi hợp lệ
- Given người dùng đã có xe đang hoạt động, đã đồng ý consent, và đã xác thực khuôn mặt thành công cho xe đó (AC-BIOMETRIC-01)
- When họ bấm "Bắt đầu chuyến đi"
- Then hệ thống tạo một trip mới, bắt đầu nhận GPS event gắn với `trip_id` đó

**AC-TRIP-03** — Kết thúc chuyến đi dừng toàn bộ tracking
- Given một chuyến đi đang active (kể cả đang tracking nền)
- When người dùng bấm "Kết thúc chuyến đi"
- Then foreground và background tracking đều dừng, trip được đánh dấu kết thúc và lưu log

## 3.1. Vehicle Authorization (FR-AUTHZ)

**AC-AUTHZ-01** — Cấp quyền có thời hạn
- Given chủ xe muốn cho người khác mượn xe
- When họ tạo một uỷ quyền với `expires_at` cụ thể cho một borrower
- Then borrower đó có thể chọn xe này và xác thực trong thời hạn đã cấp, không sớm/muộn hơn

**AC-AUTHZ-02** — Hết hạn uỷ quyền chặn chuyến đi mới
- Given uỷ quyền của một borrower đã hết hạn (`expires_at` đã qua)
- When borrower cố chọn xe đó và bắt đầu chuyến đi mới
- Then hệ thống từ chối, thông báo rõ uỷ quyền đã hết hạn

**AC-AUTHZ-03** — Thu hồi tức thời
- Given borrower đang có uỷ quyền hiệu lực nhưng CHƯA bắt đầu chuyến đi
- When chủ xe thu hồi uỷ quyền
- Then borrower không thể bắt đầu chuyến đi mới với xe đó ngay sau khi thu hồi

**AC-AUTHZ-04** — Chủ xe không cần uỷ quyền
- Given người dùng là chủ sở hữu của một xe
- When họ chọn xe đó và bắt đầu chuyến đi
- Then hệ thống cho phép ngay, không yêu cầu bản ghi uỷ quyền

## 3.2. Biometric Vehicle Binding (FR-BIOMETRIC)

**AC-BIOMETRIC-01** — Xác thực thành công mở khoá bắt đầu chuyến đi
- Given người dùng đã chọn phương tiện hợp lệ (chủ xe hoặc borrower còn hiệu lực)
- When họ hoàn tất xác thực khuôn mặt thành công
- Then hệ thống cho phép tiến tới bước bắt đầu chuyến đi

**AC-BIOMETRIC-02** — Không xác thực cho người không có quyền
- Given người dùng chọn một xe mà họ không phải chủ sở hữu và không có uỷ quyền hiệu lực
- When họ cố xác thực khuôn mặt
- Then hệ thống chặn ngay ở bước kiểm tra quyền, không tiến hành quét khuôn mặt (AC-AUTHZ-02 áp dụng trước)

**AC-BIOMETRIC-03** — Thất bại không cho bắt đầu chuyến đi
- Given xác thực khuôn mặt thất bại
- When người dùng cố bắt đầu chuyến đi
- Then hệ thống chặn hành động, cho phép thử lại trong giới hạn số lần cho phép

**AC-BIOMETRIC-04** — Không lưu ảnh thô
- Given một lần xác thực khuôn mặt đã hoàn tất (thành công hoặc thất bại)
- When kiểm tra dữ liệu đã lưu trong hệ thống
- Then chỉ có kết quả xác thực (trạng thái, thời điểm, phương tiện liên quan) được lưu — không có file ảnh khuôn mặt thô nào tồn tại sau khi xử lý xong

## 4. Realtime Location (FR-REALTIME)

**AC-REALTIME-01** — Marker cập nhật realtime
- Given mobile đang gửi GPS qua WebSocket khi online
- When một GPS event hợp lệ tới server
- Then web dashboard cập nhật marker vị trí trong thời gian ngắn (mục tiêu ≤ 5 giây)

**AC-REALTIME-02** — Từ chối payload không hợp lệ
- Given một GPS event có toạ độ ngoài phạm vi hợp lệ hoặc thiếu field bắt buộc
- When server nhận event
- Then server từ chối event đó, không broadcast, không lưu

**AC-REALTIME-03** — Chuyển trạng thái khi mất kết nối
- Given mobile đang kết nối WebSocket
- When kết nối bị ngắt
- Then mobile hiển thị trạng thái "disconnected" và bắt đầu lưu event vào local queue

**AC-REALTIME-04** — Reconnect có kiểm soát
- Given nhiều thiết bị cùng mất mạng rồi có mạng trở lại gần như đồng thời
- When các thiết bị reconnect
- Then mỗi thiết bị có độ trễ retry khác nhau (jitter), không có làn sóng reconnect đồng loạt tức thì gây quá tải server

## 5. Offline Queue & Batch Sync (FR-SYNC)

**AC-SYNC-01** — Không mất dữ liệu khi mất mạng
- Given mobile đang gửi GPS và mất mạng đột ngột
- When mất mạng xảy ra
- Then app không crash; các event từ thời điểm đó được lưu vào local queue

**AC-SYNC-02** — Đồng bộ khi có mạng lại
- Given local queue có event tồn đọng
- When mạng khôi phục
- Then mobile tự động gọi `POST /api/trips/sync` để gửi batch, không cần thao tác thủ công

**AC-SYNC-03** — Chống trùng lặp
- Given một `client_event_id` đã được server chấp nhận trước đó
- When cùng `client_event_id` đó được gửi lại (do retry)
- Then server không tạo bản ghi trùng; event được tính vào `duplicate_count`

**AC-SYNC-04** — Chunking khi vượt giới hạn batch
- Given local queue có 1.500 events tồn đọng
- When mobile đồng bộ lại
- Then queue được chia thành ít nhất 3 request, mỗi request không vượt quá 500 events

**AC-SYNC-05** — Phản hồi partial success rõ ràng
- Given một batch có một số event hợp lệ và một số event lỗi (vd. toạ độ sai)
- When server xử lý xong batch
- Then response trả về đủ `accepted`, `duplicate_count`, `failed_count`, `failed_events[]` kèm `error_code` cho từng event lỗi

## 6. Vehicle Mismatch Detection (FR-MISMATCH)

**AC-MISMATCH-01** — Sinh cảnh báo khi vượt ngưỡng
- Given người dùng đã chọn "xe máy" làm phương tiện đang hoạt động
- When tốc độ di chuyển vượt ngưỡng hợp lý cho xe máy liên tục trong một khoảng thời gian đủ dài (ví dụ 3 phút, theo mock ở micro-step 6.1)
- Then hệ thống tạo một cảnh báo Vehicle Mismatch, không tự khoá tài khoản

**AC-MISMATCH-02** — Ngôn ngữ trung lập
- Given một cảnh báo Vehicle Mismatch được tạo
- When nội dung cảnh báo hiển thị cho người dùng
- Then nội dung không chứa các từ bị cấm ("gian lận", "phạt nguội"...)

**AC-MISMATCH-03** — Cho phép xác nhận lại phương tiện
- Given cảnh báo Vehicle Mismatch đang hiển thị
- When người dùng chọn xác nhận hoặc đổi phương tiện
- Then hệ thống cập nhật trạng thái theo lựa chọn, không chặn tiếp tục chuyến đi

## 7. Driver-friendly Warning UI (FR-WARNUI)

**AC-WARNUI-01** — Overlay one-tap
- Given một cảnh báo cần hiển thị trong lúc lái xe
- When cảnh báo xuất hiện
- Then nó hiển thị dạng overlay lớn, có thể xác nhận bằng đúng một lần chạm

**AC-WARNUI-02** — Tự ẩn sau 10 giây
- Given overlay cảnh báo đang hiển thị và người dùng không phản hồi
- When 10 giây trôi qua
- Then overlay tự ẩn, không chặn thao tác khác trên app

**AC-WARNUI-03** — Lưu lại để xem sau
- Given một cảnh báo đã tự ẩn hoặc đã được xác nhận
- When người dùng mở nhật ký chuyến đi sau đó
- Then cảnh báo đó vẫn xuất hiện trong lịch sử

## 8. AR Lite / Terrain Warning (FR-AR)

**AC-AR-01** — Fallback khi thiết bị không đủ điều kiện
- Given Developer Mode giả lập thiết bị quá nóng hoặc ánh sáng quá yếu
- When màn hình sử dụng phương tiện được mở
- Then hệ thống chuyển sang chế độ chỉ hiển thị cảnh báo trên bản đồ (không bật camera/AR), không crash

> **R&D note (08/2026):** "AR Terrain Mesh" (Unity/ARKit, prototype nghiên cứu độc lập cho báo cáo hội đồng) không có `FR-*` tương ứng trong `SRS.md` vì đây không phải tính năng MVP — Definition of Done riêng của track này (mesh LiDAR thật, PLY export, RMSE 3D ≤10cm...) nằm ở `docs/research/AR_TERRAIN_THESIS_BASELINE.md` §15, không trộn vào các `AC-AR-*` ở trên (vốn chỉ nói về AR Lite/fallback trong MVP).

## 9. Mobile Background Location (FR-BGLOC)

**AC-BGLOC-01** — Notification khi tracking nền (Android)
- Given chuyến đi đang active và app chuyển xuống nền trên Android
- When tracking nền đang chạy
- Then hệ thống hiển thị notification liên tục cho biết vị trí đang được theo dõi

**AC-BGLOC-02** — Không mất trạng thái khi khoá màn hình
- Given chuyến đi đang active
- When người dùng khoá màn hình điện thoại
- Then trạng thái chuyến đi không bị mất ngay lập tức; tracking tiếp tục theo quyền đã cấp

**AC-BGLOC-03** — Giới hạn rõ khi thiếu quyền nền
- Given người dùng chưa cấp quyền vị trí nền/always
- When họ bắt đầu chuyến đi
- Then app vẫn cho tracking foreground nhưng hiển thị rõ giới hạn (có thể mất tracking khi app xuống nền)

## 10. Data Retention (FR-RETENTION)

**AC-RETENTION-01** — TTL raw GPS
- Given raw GPS events cũ hơn 30 ngày
- When cơ chế dọn dẹp chạy
- Then các event đó bị xoá khỏi bảng raw GPS, trong khi trip logs/summary liên quan vẫn còn nguyên

## 11. Developer Mode / Simulator (FR-DEVMODE)

**AC-DEVMODE-01** — Mock route chạy được
- Given Developer Mode đang bật trên build dev/test
- When dev nạp một file mock GPS route
- Then marker trên web map di chuyển theo đúng route đó mà không cần thiết bị GPS thật

**AC-DEVMODE-02** — Giả lập mất mạng/thermal/low-light
- Given Developer Mode đang bật
- When dev bật mô phỏng mất mạng ngắt quãng, hoặc thermal/low-light state
- Then hệ thống phản ứng đúng như khi tình huống đó xảy ra thật (queue offline, fallback AR)

**AC-DEVMODE-03** — Ẩn trên production
- Given một build production thông thường
- When người dùng cuối sử dụng app
- Then Developer Mode không hiển thị và không thể kích hoạt qua UI thường
