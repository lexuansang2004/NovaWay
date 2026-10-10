# NovaWay — Edge Cases v0.1

> Step D0.2. Mở rộng từ `docs/06_NEXT_STEP_D0_2_INPUT.md` §7. Mỗi case ghi rõ hành vi kỳ vọng để `TEST_STRATEGY.md` và `ACCEPTANCE_CRITERIA.md` có thể trace. Case nào chưa có hành vi kỳ vọng rõ ràng được đánh dấu **[OPEN]** — cần chốt ở D0.3.

## 1. Permission & Consent

| Case | Hành vi kỳ vọng |
|---|---|
| Người dùng từ chối quyền vị trí | Không thể bắt đầu chuyến đi; hiển thị màn hình giải thích + nút mở lại cài đặt quyền |
| Người dùng từ chối quyền vị trí nền/always (iOS) | Vẫn cho tracking foreground; hiển thị cảnh báo rõ về giới hạn khi app xuống nền |
| App xin quyền vị trí nền/always ngay lần đầu mở app, trước khi người dùng hiểu vì sao cần | Không làm — luồng xin quyền phải 2 bước: "While Using" trước, chỉ nâng cấp "Always" khi người dùng thực sự bắt đầu chuyến đi, kèm giải thích rõ (R-16, tránh rủi ro bị App Store/Play Store từ chối) |
| Người dùng thu hồi quyền vị trí giữa chuyến đi | **[OPEN]** — cần chốt: dừng trip ngay hay cảnh báo trước rồi mới dừng |

## 2. Vehicle & Trip State

| Case | Hành vi kỳ vọng |
|---|---|
| Người dùng bắt đầu chuyến đi khi chưa có xe active | Bị chặn, yêu cầu chọn xe trước (AC-VEHICLE-02) |
| Người dùng đổi phương tiện đang hoạt động giữa chuyến đi | **[OPEN]** — MVP có cho đổi xe giữa chuyến hay bắt buộc kết thúc chuyến trước? Đề xuất: không cho đổi giữa chuyến ở MVP, chỉ đổi được lúc idle |
| Người dùng mở hai phiên (hai thiết bị) cùng một tài khoản và cùng bắt đầu chuyến đi | **[OPEN]** — cần quyết định: chặn phiên thứ hai, hay cho phép và coi là hai trip độc lập |

## 2.1. Vehicle Authorization & Biometric (mới — theo quyết định D0.6)

| Case | Hành vi kỳ vọng |
|---|---|
| Chủ xe thu hồi uỷ quyền TRONG LÚC borrower đang có chuyến đi active | **[OPEN]** — MVP có dừng chuyến đi đang chạy ngay không, hay chỉ chặn chuyến đi *tiếp theo*? Đề xuất: không ngắt chuyến đang chạy đột ngột (rủi ro an toàn khi đang lái) — chỉ chặn `POST /api/trips/start` lần sau; cần chủ xe xác nhận hiểu rõ điều này khi thu hồi |
| Uỷ quyền hết hạn (`expires_at` đã qua) TRONG LÚC borrower đang có chuyến đi active | **[OPEN]** — tương tự trên: đề xuất không ngắt chuyến đang chạy, chỉ chặn chuyến tiếp theo |
| Xác thực khuôn mặt thất bại nhiều lần liên tiếp | Chặn thử lại theo giới hạn (AC-BIOMETRIC-03); **[OPEN]** — số lần cụ thể và có khoá tạm thời/yêu cầu hỗ trợ sau khi vượt giới hạn hay không, cần chốt ở D0.4 |
| Người dùng xác thực thành công nhưng trì hoãn rất lâu mới bấm "Bắt đầu chuyến đi" | Server từ chối nếu `verification_id` đã quá cũ so với ngưỡng thời gian cho phép (xem `API_REQUIREMENTS.md` §9); người dùng phải xác thực lại |
| Chủ xe cấp uỷ quyền cho chính bản thân mình (tự uỷ quyền) | **[OPEN]** — nên chặn ở validation (không cần thiết vì FR-AUTHZ-05 đã cho chủ xe toàn quyền), tránh dữ liệu vô nghĩa trong `vehicle_authorizations` |
| Hai uỷ quyền cùng xe, cùng khoảng thời gian, cho hai borrower khác nhau | Bị chặn ở tầng tạo uỷ quyền (AC-AUTHZ liên quan) — xem ràng buộc ở `DATA_REQUIREMENTS.md` §2.3a |
| Dịch vụ xác thực khuôn mặt bên thứ ba bị lỗi/timeout | **[OPEN]** — cần fallback rõ ràng: chặn hoàn toàn bắt đầu chuyến đi, hay cho phép fallback thủ công (vd. xác minh qua kênh khác)? Đề xuất mặc định chặn ở MVP, không làm fallback phức tạp |

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

> **R&D note (08/2026):** các edge case của AR Terrain Thesis Prototype (mất tracking ARKit giữa phiên quét, thiết bị không có LiDAR Scene Reconstruction, RTK FLOAT thay vì FIX, RMSE 3D vượt ngưỡng...) là edge case của một prototype nghiên cứu độc lập, không phải của tính năng AR Lite trong MVP ở bảng trên — xem `docs/research/AR_TERRAIN_THESIS_BASELINE.md` §4, §8, §13.

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

## 9. Web Account & Responsive (bổ sung `WEB-00`, review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu)

> Bổ sung 10/2026 sau Baseline v1.0; sửa sau review độc lập vòng 1 (`docs/REVIEW_NOTES.md` §36). Hành vi kỳ vọng dưới đây là đặc tả cho `WEB-01`…`WEB-13`, chưa triển khai. Hiện trạng có nguồn và ma trận kiểm thử: `docs/web/WEB_ACCOUNT_RWD_SPEC.md`.

| Case | Hành vi kỳ vọng |
|---|---|
| `/me` lỗi mạng hoặc `500` khi mở route bảo vệ | Trạng thái lỗi có thử lại, giữ token, không kẹt màn hình chờ (AC-WEBSESSION-02). Hiện trạng: suy luận tĩnh cho thấy có thể kẹt — chưa tái hiện runtime |
| `/me` trả `403` hoặc `429` | Trạng thái lỗi với thông báo riêng, giữ token, không hiển thị như sai mật khẩu, không tự retry dồn dập (AC-WEBSESSION-02) |
| `/me` treo quá 15 giây | Huỷ request, sang trạng thái lỗi có thử lại (AC-WEBSESSION-03); timeout không áp cho API khác |
| Response `/me` về muộn sau khi đã retry, timeout, logout hoặc sau khi rời trang | Bị bỏ qua ở mọi tầng (service/storage, context, component): không ghi/xoá token, không đổi user, không điều hướng (AC-WEBSESSION-03, AC-WEBSESSION-09) |
| Trên `/login` còn token cũ của A, `/me` của A đang chờ thì người dùng đăng nhập B; sau đó A trả `401` hoặc `200` | Token, user và route của B giữ nguyên; `401` của A không xoá token B; `200` của A không đặt user A, không điều hướng (AC-WEBSESSION-08) |
| Người dùng bấm "Đăng nhập lại" khi đang lỗi phiên, dù token thực ra còn hợp lệ hoặc mạng vừa phục hồi | Xoá token và user cục bộ, vô hiệu hoá kiểm tra đang chờ, về `/login` với form dùng được, không tự quay về dashboard; Browser Back không hiện nội dung cũ; không revoke server, không ảnh hưởng chuyến mobile (AC-WEBSESSION-07) |
| Người dùng bấm "Thử lại" liên tục | Chỉ một lần thử còn hiệu lực, có trạng thái đang thử (AC-WEBSESSION-04) |
| Đăng xuất rồi đăng nhập tài khoản khác, hoặc bấm Back sau khi đăng xuất | Không hiển thị dữ liệu tài khoản trước; route bảo vệ vẫn qua auth guard (AC-WEBSESSION-06, AC-WEBPROFILE-04) |
| Người dùng nghĩ đăng xuất web sẽ dừng theo dõi vị trí trên điện thoại | Nội dung quyền riêng tư/trợ giúp nói rõ: dừng bằng kết thúc chuyến trên mobile; đăng xuất web không dừng chuyến (AC-WEBPRIVACY-04) |
| Người dùng thu hồi quyền vị trí giữa chuyến (đã **[OPEN]** ở §1) | Trang web không quyết định thay; không có công tắc thu hồi từ xa. Vẫn **[OPEN]** |
| Nội dung quyền riêng tư muốn ghi "GPS tự xoá sau 30 ngày" khi cleanup chưa có bằng chứng | Bị chặn ở Privacy Content Gate (AC-WEBPRIVACY-02); FR-RETENTION-02 giữ nguyên |
| Chính sách lưu dữ liệu của nhà cung cấp sinh trắc chưa được xác nhận | **[OPEN]** — trang chỉ mô tả giới hạn tại NovaWay, không hứa thay nhà cung cấp (AC-WEBPRIVACY-05) |
| Chưa có kênh liên hệ hỗ trợ được xác nhận | **[OPEN]** — trợ giúp chỉ có hướng dẫn tự xử lý và điều hướng, không form/ticket giả (AC-WEBHELP-04) |
| Trợ giúp nhắc tới `/offline-sync` | Không mô tả là chức năng web đầy đủ khi route còn placeholder (FR-WEBHELP-02) |
| Bản đồ không có vị trí | Trợ giúp không khẳng định chắc chắn là không có chuyến — hiện trang gộp "không có chuyến" với "chưa nhận vị trí" |
| Email rất dài | Đọc được toàn bộ bằng reflow ở 320 CSS px/text 200% (AC-WEBPROFILE-02) |
| Storage bị chặn khi **đọc** lúc khởi tạo | Không có giá trị hợp lệ → "Theo hệ thống", thông báo, không crash, không đụng token (AC-WEBSETTINGS-04) |
| Người dùng đã chọn "Giảm chuyển động" nhưng **ghi** thất bại (hết quota/bị chặn) | Giữ và áp dụng lựa chọn trong phiên trang đang mở, không bật lại animation, thông báo không lưu được (AC-WEBSETTINGS-07) |
| Giá trị preference đã lưu hỏng, enum lạ hoặc `version` không hỗ trợ | "Theo hệ thống", thông báo, lần lưu hợp lệ kế tiếp ghi đè (AC-WEBSETTINGS-08) |
| Hai tài khoản dùng chung một trình duyệt | App chỉ áp dụng preference của tài khoản đang đăng nhập (AC-WEBSETTINGS-03). Namespace theo `user.id`, dù raw hay băm, **không** phải ranh giới quyền truy cập: ai dùng chung browser profile đều đọc được storage cùng origin. Vì vậy chỉ lưu giá trị không nhạy cảm; lựa chọn và định danh dùng làm key còn lại sau logout trên máy dùng chung |
| OS đã bật giảm chuyển động | Mọi lựa chọn trong app đều giữ chuyển động không thiết yếu ở mức giảm (AC-WEBSETTINGS-02) |
| Resize qua 1024 CSS px khi drawer đang mở, hoặc xoay màn hình khi đang nhập form | Không mất form/route, không kẹt scroll lock/backdrop, không nhân đôi tab stop (AC-RWD-03) |
| Chỉ có emulator, chưa có Safari iPhone/Android Chrome thật | Ghi NOT_RUN riêng cho từng thiết bị ở gate công bố hỗ trợ; không tính PASS; **không** chặn gate merge Windows của step; chặn việc tuyên bố hỗ trợ thiết bị đó (NFR-RWD-06, AC-RWD-11, spec §4.7) |
