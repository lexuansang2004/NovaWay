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

## 12. Web Account & Responsive (bổ sung `WEB-00`, review độc lập PASS; Review Manager phê duyệt 2026-10-10; chờ PR checks và merge tài liệu)

> Bổ sung 10/2026 sau Baseline v1.0, trace tới `SRS.md` §1.15/§2.1; sửa sau review độc lập vòng 1 (`docs/REVIEW_NOTES.md` §36). Đây là tiêu chí cho các micro-step `WEB-01`…`WEB-13` sắp tới, **không** phải biên bản nghiệm thu: mọi kết quả thực tế hiện là **NOT_RUN**, trừ AC-WEBSESSION-01→09 đã có kết quả local của người triển khai `WEB-01` (chờ review độc lập — `docs/REVIEW_NOTES.md` §40). Với AC-RWD, phạm vi nghiệm thu chia hai: gate merge Windows và gate công bố hỗ trợ thiết bị thật (spec §4.7). Ma trận viewport/trạng thái (`WEB-V*`, `WEB-T*`) và traceability AC → test → micro-step: `docs/web/WEB_ACCOUNT_RWD_SPEC.md` §5–§8.

### 12.1. Kiểm tra phiên web (FR-WEBSESSION) — micro-step `WEB-01`

**AC-WEBSESSION-01** — Không token hoặc 401
- Given không có token, hoặc `GET /api/auth/me` trả `401`
- When mở bất kỳ route bảo vệ nào (gồm bốn route tài khoản)
- Then không hiển thị nội dung tài khoản, phiên cục bộ bị xoá theo contract hiện có và người dùng về `/login`

**AC-WEBSESSION-02** — Lỗi khác 401 không đăng xuất
- Given `/me` lỗi mạng, `500`, `403` hoặc `429`
- When kiểm tra phiên
- Then màn hình thoát trạng thái chờ sang thông báo phù hợp với từng loại lỗi, token vẫn còn, có nút "Thử lại" và "Đăng nhập lại"; `403`/`429` không bị hiển thị như "sai mật khẩu"; hệ thống không tự xoá token

**AC-WEBSESSION-03** — Timeout và request muộn
- Given `/me` chưa kết thúc sau 15 giây
- When hết thời gian
- Then request bị huỷ, giao diện sang trạng thái lỗi có thử lại, không treo vô hạn; response muộn của request cũ hoặc request về sau khi component unmount không thay đổi state và không ghi đè kết quả của lần thử lại mới

**AC-WEBSESSION-04** — Thử lại
- Given đang ở trạng thái lỗi
- When bấm "Thử lại" (kể cả bấm nhiều lần liên tiếp)
- Then có trạng thái đang thử, chỉ một lần thử còn hiệu lực; nếu thành công thì vào đúng route đã yêu cầu

**AC-WEBSESSION-05** — Trang đăng nhập không lỗi ngầm
- Given kiểm tra phiên ở `/login` gặp lỗi khác `401`
- When trang mount
- Then không có unhandled rejection, form đăng nhập vẫn dùng được và có thông báo phù hợp

**AC-WEBSESSION-06** — Regression logout/login
- Given chuỗi đăng nhập → điều hướng tài khoản → đăng xuất → đăng nhập tài khoản khác, và Browser Back
- When chuyển route
- Then auth guard vẫn áp dụng, token nằm đúng storage hiện hành, contract `/me` không đổi, và không có nội dung nào tuyên bố đăng xuất web đã thu hồi phiên trên mọi thiết bị

**AC-WEBSESSION-07** — "Đăng nhập lại" chủ động (thêm sau review vòng 1, R01)
- Given đang ở trạng thái lỗi kiểm tra phiên, xét từng trường hợp: token thực ra còn hợp lệ, token không hợp lệ, hoặc mạng phục hồi ngay sau khi bấm
- When người dùng bấm "Đăng nhập lại"
- Then token trong `sessionStorage` và user trong AuthContext bị xoá; lần kiểm tra phiên đang chờ (nếu có) bị vô hiệu hoá và kết quả của nó không có tác dụng; người dùng tới `/login` với form dùng được ngay; trang không tự chuyển về `/dashboard` kể cả khi token cũ còn hợp lệ hoặc mạng đã phục hồi
- And không có request revoke tới server, không ảnh hưởng chuyến đang chạy trên mobile, preference giảm chuyển động vẫn còn
- When sau đó bấm Browser Back về route bảo vệ
- Then không hiển thị nội dung tài khoản trước; auth guard đưa về `/login` vì không còn token

**AC-WEBSESSION-08** — Kết quả kiểm tra của phiên cũ sau khi đăng nhập tài khoản khác (thêm sau review vòng 1, R02)
- Given trên `/login` còn token cũ của A và `GET /api/auth/me` cho token A đang chờ
- When người dùng đăng nhập B thành công, rồi request của A trả `401`
- Then token B trong `sessionStorage`, user B trong AuthContext và route hiện tại giữ nguyên; không bị đưa về `/login`
- When thay vào đó request của A trả `200`
- Then user trong AuthContext vẫn là B, không có điều hướng do kết quả của A, không có email/dữ liệu A trên UI
- And kiểm tra bằng assertion trên service/storage/context, không chỉ trên DOM

**AC-WEBSESSION-09** — Vô hiệu hoá khi logout/unmount/timeout/retry (thêm sau review vòng 1, R02)
- Given một lần kiểm tra phiên đang chờ
- When xảy ra một trong các sự kiện: logout, rời trang (unmount), timeout 15 giây, hoặc bắt đầu retry mới; và sau đó response cũ mới về (`200`, `401` hoặc lỗi)
- Then response cũ không ghi/xoá token, không đặt/xoá user, không điều hướng, không đổi UI; chỉ kết quả của lần kiểm tra còn hiệu lực mới có tác dụng
- And kiểm tra bằng assertion trên service/storage/context, không chỉ trên DOM

### 12.2. Hồ sơ cá nhân (FR-WEBPROFILE) — micro-step `WEB-09`

**AC-WEBPROFILE-01** — Đúng email
- Given `/me` trả `200` cho tài khoản A
- When mở `/account/profile`
- Then hiển thị đúng email của A, không có dữ liệu của tài khoản khác hay dữ liệu fixture

**AC-WEBPROFILE-02** — Email dài
- Given email rất dài
- When xem ở 320 CSS px và text 200%
- Then đọc được toàn bộ email nhờ reflow (không chỉ qua tooltip), không đẩy action khỏi màn hình

**AC-WEBPROFILE-03** — Chỉ đọc, không dữ liệu bịa
- Given dữ liệu `/me` chỉ có `id`/`email`
- When kiểm tra UI và network
- Then không render `password_hash`, không tạo tên/ngày tham gia/avatar/số điện thoại, không có request ghi hồ sơ

**AC-WEBPROFILE-04** — Không lộ dữ liệu khi đổi tài khoản
- Given đã xem hồ sơ A rồi đăng xuất và đăng nhập B
- When mở lại hồ sơ hoặc dùng Browser Back
- Then không hiển thị email A; route vẫn qua auth guard

### 12.3. Quyền riêng tư (FR-WEBPRIVACY) — micro-step `WEB-11` + Privacy Content Gate

**AC-WEBPRIVACY-01** — Cam kết có nguồn
- Given nội dung đã qua Privacy Content Gate cho bản phát hành
- When người dùng đọc trang
- Then mỗi cam kết dữ liệu có bảng trace nội bộ tới requirement + implementation có bằng chứng, hoặc quyết định vận hành đã xác nhận

**AC-WEBPRIVACY-02** — Không khẳng định TTL chưa có bằng chứng
- Given cleanup TTL raw GPS chưa có bằng chứng vận hành
- When duyệt nội dung trước phát hành
- Then câu "dữ liệu tự xoá sau 30 ngày" bị chặn; phải viết đúng thực tế hoặc hoàn thành dependency retention trước

**AC-WEBPRIVACY-03** — Không tác dụng phụ
- Given người dùng mở trang quyền riêng tư trên web
- When tải trang, bấm link trợ giúp hoặc đổi layout
- Then không xin quyền camera/geolocation, không bắt đầu/kết thúc chuyến, không ghi consent, không gửi ảnh

**AC-WEBPRIVACY-04** — Đúng ngữ nghĩa dừng tracking
- Given phần hướng dẫn dừng theo dõi vị trí
- When đọc
- Then nói rõ thao tác là kết thúc chuyến trên mobile đang có chuyến; đăng xuất web không được coi là dừng chuyến; không có công tắc giả thu hồi quyền OS của thiết bị khác

**AC-WEBPRIVACY-05** — Tách chính sách nhà cung cấp
- Given phần xác thực khuôn mặt
- When duyệt nội dung
- Then giới hạn xử lý tại NovaWay được tách khỏi chính sách nhà cung cấp; không hứa "không có bên thứ ba xử lý"

**AC-WEBPRIVACY-06** — Đọc được trang dài
- Given trang dài
- When dùng 320 CSS px, text 200% hoặc chỉ bàn phím
- Then heading, nội dung và link theo đúng thứ tự đọc, đọc hết và quay về được

### 12.4. Cài đặt ứng dụng (FR-WEBSETTINGS) — micro-step `WEB-12`

**AC-WEBSETTINGS-01** — Mặc định
- Given chưa có preference
- When mở `/settings`
- Then chọn sẵn "Theo hệ thống" và mô tả rõ phạm vi: tài khoản này trên trình duyệt này

**AC-WEBSETTINGS-02** — Tôn trọng hệ điều hành
- Given OS bật giảm chuyển động
- When chọn bất kỳ lựa chọn nào
- Then chuyển động không thiết yếu vẫn được giảm
- Given OS không bật giảm chuyển động
- When chọn "Giảm chuyển động"
- Then hiệu ứng trang trí giảm ngay trên các route thuộc phạm vi

**AC-WEBSETTINGS-03** — Lưu và cô lập
- Given tài khoản A đổi lựa chọn
- When reload hoặc A đăng nhập lại trên cùng trình duyệt
- Then giữ lựa chọn của A
- When B đăng nhập trên cùng trình duyệt, hoặc A mở trình duyệt khác
- Then B không nhận lựa chọn riêng của A; trình duyệt khác không được giả định đã đồng bộ

**AC-WEBSETTINGS-04** — Đọc storage lỗi khi khởi tạo (thu hẹp sau review vòng 1, R03)
- Given storage bị chặn hoặc ném lỗi khi đọc, nên không có giá trị đọc hợp lệ
- When mở app sau khi phiên đã xác thực
- Then áp dụng "Theo hệ thống" (vẫn tôn trọng OS), thông báo không đọc/lưu được lựa chọn trên trình duyệt này, không crash, không đụng token

**AC-WEBSETTINGS-05** — Không ảnh hưởng nghiệp vụ
- Given đã chọn "Giảm chuyển động"
- When kiểm tra request và state nghiệp vụ
- Then không đổi tần suất GPS, consent, vòng đời chuyến, âm thanh/cảnh báo an toàn hay API payload; dữ liệu bản đồ vẫn cập nhật (có thể cập nhật tức thì thay vì animate)

**AC-WEBSETTINGS-06** — Truy cập được
- Given dùng bàn phím hoặc trình đọc màn hình
- When đổi lựa chọn
- Then control có nhãn, trạng thái được đọc ra, focus nhìn thấy và không nhảy

**AC-WEBSETTINGS-07** — Ghi storage lỗi sau khi người dùng đã chọn (thêm sau review vòng 1, R03)
- Given người dùng chọn "Giảm chuyển động" và việc ghi thất bại (hết quota hoặc storage bị chặn khi ghi)
- When lỗi ghi xảy ra
- Then lựa chọn "Giảm chuyển động" vẫn được giữ và áp dụng trong phiên trang đang mở, animation không bật lại, có thông báo không lưu được (sẽ mất khi reload), không crash, không đụng token

**AC-WEBSETTINGS-08** — Giá trị đã lưu hỏng (thêm sau review vòng 1, R03)
- Given giá trị đã lưu sai định dạng, enum lạ hoặc `version` không hỗ trợ
- When đọc preference
- Then áp dụng "Theo hệ thống" (vẫn tôn trọng OS), thông báo lựa chọn đã lưu không đọc được, lần lưu hợp lệ kế tiếp ghi đè, không crash, không đụng token

### 12.5. Trợ giúp (FR-WEBHELP) — micro-step `WEB-10`

**AC-WEBHELP-01** — Đúng vai trò web/mobile
- Given người đọc muốn bắt đầu chuyến
- When đọc trợ giúp
- Then nội dung phân biệt web xem vị trí với mobile bắt đầu/kết thúc chuyến; không hướng dẫn bấm "Bắt đầu" trên web

**AC-WEBHELP-02** — Link quản lý xe
- Given chưa có xe hoặc muốn sửa xe
- When bấm hướng dẫn quản lý xe
- Then tới `/vehicles`; nội dung khớp thêm/sửa/xoá/chọn xe hoạt động hiện có

**AC-WEBHELP-03** — Xử lý lỗi an toàn
- Given mất mạng, phiên hết hạn hoặc bản đồ chưa có vị trí
- When đọc hướng dẫn
- Then các bước không yêu cầu gửi mật khẩu/JWT/ảnh khuôn mặt, không hứa cấp quyền hay khôi phục dữ liệu khi không có cơ chế

**AC-WEBHELP-04** — Không kênh hỗ trợ giả
- Given người dùng cần hỗ trợ
- When duyệt trang
- Then chỉ có kênh liên hệ đã được chủ dự án xác nhận; nếu chưa có, chỉ có hướng dẫn tự xử lý và điều hướng, không có form "gửi thành công" giả

**AC-WEBHELP-05** — Điều hướng bằng bàn phím
- Given điều hướng bằng bàn phím
- When đi qua mục lục/link
- Then nhãn rõ, thứ tự hợp lý, link tới đúng route/section

### 12.6. Responsive/adaptive (NFR-RWD) — micro-step `WEB-02`…`WEB-08`, tổng hợp `WEB-13`

**AC-RWD-01** — Không cắt/che nội dung
- Given các viewport chính trong ma trận
- When mở các route trong ma trận
- Then text, form, navigation không bị cắt/che, không cần cuộn ngang để đọc nội dung thông thường; kiểm cả phần bị `overflow-hidden` giấu; bản đồ được pan riêng nhưng nhãn/control vẫn đọc được

**AC-RWD-02** — Drawer dưới 1024
- Given bề rộng dưới 1024 CSS px
- When mở menu
- Then drawer có tên truy cập được, quản lý focus, đóng được bằng Escape/nút/bấm ngoài, trả focus đúng; chọn route thì drawer đóng; menu ẩn không nhận Tab

**AC-RWD-03** — Resize/xoay màn hình
- Given bề rộng thay đổi qua 1024 hoặc xoay màn hình
- When resize
- Then không mất route/form đang nhập, không kẹt scroll lock/backdrop, không nhân đôi tab stop

**AC-RWD-04** — Text 200% và reflow 320
- Given text 200% và reflow tương đương 320 CSS px
- When đọc, nhập, chọn action
- Then giữ đủ nội dung và chức năng; browser zoom được kiểm riêng với viewport nhỏ và với tăng riêng text

**AC-RWD-05** — Danh sách xe
- Given danh sách có tên dài, xe active và hộp xác nhận xoá
- When xem hoặc đổi orientation
- Then tên và thao tác đều tiếp cận được, không tràn/cắt; nút icon có accessible name gồm hành động và xe liên quan

**AC-RWD-06** — Form với bàn phím ảo *(gate merge Windows: emulation + text zoom; phần bàn phím ảo thật thuộc gate công bố hỗ trợ thiết bị)*
- Given form tạo/sửa xe
- When bàn phím ảo bật và có lỗi dài
- Then label/input/lỗi/Lưu/Huỷ vẫn tiếp cận được, form không mất dữ liệu do layout, lỗi gắn với field hoặc summary phù hợp

**AC-RWD-07** — Bản đồ trực tiếp
- Given bản đồ đang có chuyến ở trạng thái connected và disconnected
- When bề rộng hẹp, chiều cao thấp hoặc resize
- Then nhãn tốc độ và kết nối không đè nhau, attribution không bị che, canvas vừa container, menu không chặn thao tác sau khi đóng

**AC-RWD-08** — Analytics
- Given analytics có dữ liệu
- When xem nhỏ, zoom hoặc cảm ứng
- Then filter wrap, tổng số đọc được, chart/legend không bị cắt, có cách đọc số liệu không chỉ dựa vào hover; không biến summary thành số liệu fixture trên production

**AC-RWD-09** — Vùng chạm
- Given thao tác cảm ứng
- When dùng nút/icon/menu
- Then control chính đạt mục tiêu 44×44 CSS px; WCAG 2.5.8 được đánh giá riêng với ngưỡng và ngoại lệ của nó

**AC-RWD-10** — Bàn phím
- Given chỉ dùng bàn phím
- When đi qua trang
- Then thứ tự focus hợp lý, focus nhìn thấy và không bị che, hành động không chỉ phân biệt bằng màu; tên control được spot-check bằng trình đọc màn hình

**AC-RWD-11** — Thiết bị thật *(chỉ thuộc gate công bố hỗ trợ thiết bị, spec §4.7)*
- Given safe area, thanh trình duyệt co giãn hoặc đổi orientation
- When dùng trên thiết bị thật
- Then header/footer/action không bị notch/home indicator che; kết quả emulator không đủ để đánh PASS cho thiết bị
- And khi chưa có thiết bị: ghi NOT_RUN riêng cho từng thiết bị (`WEB-VH1`, `WEB-VH2`), không tính PASS, không chặn gate merge Windows của step, nhưng chặn việc công bố hỗ trợ thiết bị đó

**AC-RWD-12** — Regression nghiệp vụ
- Given thay đổi layout
- When chạy regression nghiệp vụ
- Then auth, CRUD xe, quan sát chuyến và analytics dùng contract/cách tính hiện hành; không wire metric mới, không thêm start/end trip trên web
