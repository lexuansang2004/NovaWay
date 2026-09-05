# NovaWay - Requirement Delta v0.5

## 1. Mục tiêu

Tài liệu này ghi lại các yêu cầu mới được bổ sung sau vòng review NotebookLM và phản hồi của người dùng ở Step D0.1.

Phiên bản v0.3 bổ sung thêm 5 cải tiến quan trọng:

1. Offline sync dùng REST Batch Upload thay vì WebSocket replay.
2. MVP có Developer Mode/Simulator để test GPS/network/thermal.
3. Raw GPS events có TTL 30 ngày và cần partitioning.
4. Tile provider strategy rõ: Protomaps hoặc Mapbox Free Tier cho MVP/dev; self-host post-MVP.
5. Abuse prevention post-MVP: App Attestation / DeviceCheck / Play Integrity.

Phiên bản v0.4 bổ sung thêm 4 edge cases kỹ thuật để tăng độ bền cho mobile/realtime:

6. Background Location Service cho mobile tracking khi khóa màn hình/chạy nền.
7. Exponential Backoff with Jitter cho WebSocket reconnect để tránh thundering herd.
8. Batch size limit + chunking cho `POST /api/trips/sync`, mặc định MVP tối đa 500 events/payload.
9. Driver-friendly warning UI cho Vehicle Mismatch Detection: overlay rõ, 1 chạm, auto-dismiss sau 10 giây.

## 2. Quyết định cập nhật từ người dùng

### 2.1. AR trong MVP

Người dùng muốn MVP có AR trong màn hình sử dụng phương tiện, nhưng không làm kính ảo hoặc VR.

Quyết định:

- MVP có AR ở mức **AR Lite / cảnh báo trực quan trên màn hình sử dụng phương tiện**.
- AR gắn với Map/vehicle-use screen.
- Không làm VR headset.
- Không làm kính ảo.
- Không làm AR Mesh Grid nặng trong core MVP nếu chưa test hiệu năng.
- Unity AR Mesh Grid được giữ ở nhóm R&D.

### 2.2. Backend

Người dùng nghiêng về NestJS. Quyết định: chọn NestJS cho MVP.

### 2.3. Map

Ưu tiên hệ sinh thái OpenStreetMap để giảm chi phí. Tuy nhiên cần phân biệt:

- OpenStreetMap là nguồn dữ liệu bản đồ mở.
- Tile server public của OSM không nên dùng cho heavy production.
- MVP/dev nên dùng tile provider rõ ràng: Protomaps hoặc Mapbox Free Tier.
- Production/post-MVP có thể chuyển sang self-host tiles/vector tiles nếu có tải lớn hoặc cần kiểm soát chi phí.

## 3. Yêu cầu bắt buộc cho MVP

### 3.1. Location Privacy & Consent

Yêu cầu:

- Người dùng phải đồng ý chia sẻ vị trí trước khi bắt đầu chuyến đi.
- App phải giải thích mục đích thu thập GPS.
- Không tracking khi chưa bấm bắt đầu chuyến đi.
- Người dùng có thể dừng tracking bất kỳ lúc nào.
- Dữ liệu dùng cho cộng đồng phải giảm định danh.

Acceptance Criteria:

- Nếu chưa cấp quyền location, không thể bắt đầu chuyến đi.
- Nếu chưa đồng ý consent, app không gửi GPS.
- Có màn hình giải thích quyền vị trí trước khi tracking.

---

### 3.2. Background Location Service

Mobile tracking có thể bị ngắt khi người dùng khóa màn hình hoặc chuyển app sang nền. MVP cần thiết kế rõ cơ chế tracking khi chuyến đi đang active.

Yêu cầu:

- Chỉ tracking nền khi người dùng đã bắt đầu chuyến đi và đã đồng ý consent.
- Android cần Foreground Service cho active trip tracking, kèm notification liên tục để người dùng biết app đang dùng vị trí.
- iOS cần luồng xin quyền phù hợp cho background/always location nếu MVP cần tiếp tục tracking khi khóa màn hình.
- Nếu người dùng không cấp quyền background/always, app phải thông báo giới hạn: tracking có thể dừng khi app chạy nền/khóa màn hình.
- Người dùng luôn có nút dừng chuyến đi/dừng tracking.

Acceptance Criteria:

- Khóa màn hình trong lúc active trip không làm app mất trạng thái chuyến đi ngay lập tức.
- Android hiển thị notification khi foreground service tracking đang chạy.
- Nếu quyền background chưa được cấp, app hiển thị hướng dẫn/giới hạn rõ ràng.
- Stop trip phải dừng foreground/background tracking.

---

### 3.3. Offline Queue & REST Sync-on-Reconnect

Khi người dùng mất mạng, mobile app lưu tạm GPS/trip events vào local queue. Khi có mạng lại, app gửi bù bằng REST Batch Upload, không replay lượng lớn bằng WebSocket.

Yêu cầu:

- Mobile app lưu tạm GPS events khi mất mạng.
- Mỗi event có `client_event_id` duy nhất.
- Khi mạng khôi phục, app gọi `POST /api/trips/sync` để gửi batch.
- Server xử lý idempotency để không lưu trùng event.
- WebSocket chỉ dùng cho live location khi online.
- Queue cần giới hạn dung lượng và retry policy.
- `POST /api/trips/sync` trong MVP nhận tối đa **500 events/payload**.
- Nếu local queue vượt 500 events, mobile phải chia thành nhiều chunk và gửi tuần tự.
- Server trả lỗi rõ ràng nếu payload vượt batch limit.
- API nên hỗ trợ partial success để nhận event hợp lệ và trả danh sách event lỗi nếu cần.
- MVP ưu tiên response `200 OK` kèm `{ status, accepted, duplicate_count, failed_count, failed_events[] }`; `207 Multi-Status` có thể dùng như option nếu team muốn semantic HTTP rõ hơn.

API draft:

```http
POST /api/trips/sync
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "trip_id": "uuid",
  "events": [
    {
      "client_event_id": "uuid",
      "vehicle_id": "uuid",
      "timestamp": "2026-06-28T13:00:00.000Z",
      "latitude": 10.762622,
      "longitude": 106.660172,
      "speed_kmh": 35.5,
      "accuracy_m": 12.0,
      "source": "gps"
    }
  ]
}
```

Acceptance Criteria:

- Tắt mạng khi đang gửi GPS, app không crash.
- Bật mạng lại, app gửi batch qua REST.
- Một `client_event_id` gửi lại nhiều lần không tạo bản ghi trùng.
- Batch quá lớn được chia nhỏ hoặc bị reject có lỗi rõ ràng.
- Local queue 1.500 events phải được chia thành ít nhất 3 request, mỗi request không quá 500 events.

---

### 3.4. Realtime Connection Resilience

Realtime tracking không được giả định mạng luôn ổn định.

Yêu cầu:

- WebSocket cần reconnect.
- Mobile cần hiển thị trạng thái connected/disconnected.
- Server cần validate payload GPS.
- GPS event cần rate limit để tránh spam hoặc quá tải.
- Khi WebSocket mất kết nối, app chuyển sang local queue.
- WebSocket reconnect phải dùng **Exponential Backoff with Jitter**.
- Không cho phép tất cả client reconnect tức thì cùng lúc sau khi có mạng lại.
- Sau reconnect, live stream tiếp tục qua WebSocket; offline queue vẫn sync qua REST batch.

Acceptance Criteria:

- Ngắt WebSocket, app chuyển trạng thái disconnected.
- Kết nối lại, app tiếp tục gửi live events.
- Khi giả lập nhiều client reconnect cùng lúc, mỗi client có retry delay khác nhau nhờ jitter.
- Payload sai bị server reject.

---

### 3.5. Data Retention & Raw GPS TTL

GPS realtime từ nhiều xe có thể làm phình database nhanh. Vì vậy data retention phải rõ từ MVP.

Yêu cầu:

- `trip_logs` / trip summary lưu dài hạn.
- Raw GPS events chỉ lưu 30 ngày ở MVP.
- Raw GPS events cần có cơ chế TTL cleanup.
- Bảng raw GPS events cần thiết kế theo hướng partitioning theo ngày/tháng.
- Public/community warnings chỉ dùng dữ liệu đã giảm định danh hoặc aggregate.

Acceptance Criteria:

- SRS có mô tả retention policy.
- Data model có bảng raw GPS events riêng với field timestamp.
- Database plan có partitioning/time-based cleanup.

---

### 3.6. Developer Mode / Simulator Requirements

MVP cần test được mà không phải phụ thuộc hoàn toàn vào chạy xe thật.

Yêu cầu:

- Có Developer Mode ẩn cho môi trường dev/test.
- Có thể nạp file mock GPS route.
- Có thể giả lập mất mạng ngắt quãng.
- Có thể giả lập thermal state / low-light state để test AR fallback.
- Developer Mode không bật mặc định cho user production.

Acceptance Criteria:

- Dev có thể chạy mock route và thấy marker di chuyển trên web map.
- Dev có thể bật/tắt mô phỏng offline để kiểm tra local queue.
- Dev có thể giả lập thermal/low-light để kiểm tra warning/fallback.

---

### 3.7. Vehicle Mismatch Detection

NovaWay cần phát hiện sai lệch giữa phương tiện người dùng chọn và hành vi di chuyển thực tế, nhưng không dùng ngôn ngữ tiêu cực như “gian lận”.

Yêu cầu:

- Nếu người dùng chọn xe máy nhưng tốc độ/lộ trình giống ô tô, hệ thống tạo warning mềm.
- Không khóa tài khoản người dùng ở MVP.
- Không tự kết luận vi phạm.
- Chỉ gợi ý người dùng xác nhận lại loại phương tiện.

Acceptance Criteria:

- Khi tốc độ vượt ngưỡng trong một khoảng thời gian đủ dài, hệ thống tạo warning.
- Warning có nội dung trung lập.
- Người dùng có thể đổi phương tiện đang active.

---

### 3.8. Driver-friendly Warning UI

Cảnh báo sai lệch phương tiện hoặc cảnh báo an toàn không được gây mất tập trung khi người dùng đang lái xe.

Yêu cầu:

- Warning quan trọng phải hiển thị dạng overlay lớn, rõ ràng trên màn hình sử dụng phương tiện.
- Không phụ thuộc vào push notification nhỏ làm UI chính khi người dùng đang lái.
- Cho phép xác nhận bằng 1 chạm.
- Auto-dismiss sau 10 giây nếu người dùng không phản hồi.
- Overlay không được che khuất bản đồ quá lâu hoặc yêu cầu nhập liệu phức tạp.

Acceptance Criteria:

- Vehicle mismatch warning hiển thị bằng overlay rõ.
- Người dùng có thể chọn xác nhận/đổi phương tiện bằng 1 chạm.
- Nếu không phản hồi, overlay tự ẩn sau 10 giây.
- Sau khi ẩn, cảnh báo còn lưu ở trạng thái trip/warning log để người dùng xem lại sau.

---

### 3.9. AR Lite / Warning Overlay Fallback

Yêu cầu:

- AR Lite trong MVP chỉ là cảnh báo/overlay trên màn hình sử dụng phương tiện.
- Không chạy camera/AR liên tục nếu chưa có test hiệu năng.
- Có fallback khi thiết bị nóng, pin yếu hoặc ánh sáng yếu.
- Nếu fallback, app vẫn hiển thị cảnh báo trên map.

Acceptance Criteria:

- App không crash khi AR/camera không khả dụng.
- Khi thermal/low-light state được giả lập, app hiển thị fallback.
- Map/warning overlay vẫn hoạt động.

## 4. Nhóm yêu cầu nên có sau MVP

### 4.1. Crowdsourced Trust Verification

Để tránh báo cáo sai ổ gà hoặc vật cản, NovaWay không nên ghim cảnh báo công khai chỉ từ một báo cáo đơn lẻ.

Yêu cầu sau MVP:

- Một cảnh báo địa hình cần được xác thực bởi nhiều nguồn khác nhau.
- Hệ thống gom các báo cáo gần nhau theo tọa độ và thời gian.
- Khi đủ độ tin cậy, cảnh báo mới được hiển thị rộng rãi.
- Có điểm tin cậy cho người dùng hoặc thiết bị.

---

### 4.2. Gamification

Gamification giúp khuyến khích người dùng đóng góp dữ liệu bản đồ, nhưng không thuộc core MVP.

Yêu cầu sau MVP:

- Điểm đóng góp khi phát hiện cảnh báo hợp lệ.
- Huy hiệu cho người dùng di chuyển an toàn.
- Dashboard điểm đóng góp.
- Không thưởng cho dữ liệu chưa được xác thực.

---

### 4.3. Real-time Scalability

MVP có thể bắt đầu với một backend realtime đơn giản. Khi có nhiều người dùng, cần scale realtime layer.

Định hướng:

- MVP: Socket.io server.
- Scale bước 1: Socket.io Redis Adapter.
- Scale bước 2: tách event processing bằng queue.
- Scale lớn: Kafka/NATS cho event streaming.

Không dùng Kafka ngay từ đầu nếu chưa có tải thực tế.

---

### 4.4. Abuse Prevention / App Attestation

Mobile app có thể bị mod/hack để gửi GPS giả. MVP chưa cần làm quá nặng, nhưng cần đưa vào security roadmap.

Yêu cầu sau MVP:

- Android: Play Integrity API hoặc giải pháp tương đương.
- iOS: DeviceCheck hoặc App Attest.
- Thiết bị/app có điểm tin cậy.
- GPS API có thể yêu cầu attestation token với các endpoint nhạy cảm.
- Kết hợp với crowdsourced trust verification để giảm cảnh báo giả.

## 5. Nhóm R&D / không đưa vào MVP sớm

### 5.1. AR Terrain Mesh

AR Terrain Mesh là hướng R&D quan trọng nhưng rủi ro cao về pin, nhiệt độ, camera, ánh sáng và hiệu năng thiết bị.

Yêu cầu R&D:

- Làm Unity AR prototype độc lập trước.
- Đo FPS, nhiệt độ, pin, độ ổn định.
- Kiểm tra điều kiện ánh sáng yếu.
- Có fallback khi thiết bị nóng hoặc camera không đủ ánh sáng.
- Không nhúng vào mobile app chính khi chưa đạt test gate.

> **Cập nhật (08/2026 — step `8.0` APPROVED 2026-08-24):** phạm vi/thiết bị/lịch trình cụ thể cho R&D track này (không phải mở rộng yêu cầu MVP) đã được tài liệu hoá thành một **baseline chính thức riêng cho prototype nghiên cứu phục vụ báo cáo hội đồng** — xem `docs/research/AR_TERRAIN_THESIS_BASELINE.md`. Tóm tắt: Unity + ARKit Scene Reconstruction (LiDAR) trên iPhone 15 Pro Max, khu vực 10×10 m, georeference bằng 5 control point + 3 checkpoint RTK độc lập, export `mesh_ar_local.ply` (AR-local) rồi `mesh_enu.ply` georeferenced (bắt buộc), `mesh_enu.glb` là stretch goal, Accuracy KPI mục tiêu RMSE 3D ≤10cm (tách biệt khỏi Measurement Gate — xem baseline §8). Đứng ngoài `apps/mobile`, tại `research/ar-terrain-unity/`. Micro-step tương ứng: `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` nhóm `8.0`–`8.7` (thay cho `8.1` gộp cũ).
>
> **Đính chính kiểm kê thiết bị (08/2026, lịch sử ở §19):** iPhone 15 Pro Max ở ghi nhận ban đầu là lỗi kiểm kê; thiết bị LiDAR dự kiến đúng là **iPhone 16 Pro**, chưa kiểm chứng vật lý. iPhone 11 Pro không có LiDAR, chỉ dùng smoke iOS/compatibility.

> **Cập nhật vận hành được chủ dự án đồng ý (2026-09-04):** Lenovo + iPhone 11 Pro hiện sẵn có, Mac chưa sẵn có; `8.1a` được tạo/chạy project Unity không-AR trên Windows, `8.1b` build/ký/cài/chạy iOS sau khi người dùng báo có Mac. Student subscription ACTIVE theo người dùng ngày 03/09; activation tại máy kiểm tra riêng. Không đổi FR/NFR của MVP, không thay LiDAR/RTK thật bằng fixture; xem baseline §4/§11, `docs/REVIEW_NOTES.md` §20.

## 6. Các thay đổi thuật ngữ

Không dùng:

- NovaPay
- Gian lận
- Phạt nguội
- Camera phạt nguội

Dùng thay thế:

- NovaWay
- Sai lệch phương tiện
- Vehicle Mismatch Detection
- Xác nhận lại phương tiện
- Cảnh báo an toàn
- Cảnh báo địa hình

## 7. Quyết định tạm thời

Các yêu cầu được đưa vào MVP:

- Location consent
- Offline queue
- REST Batch Upload `/api/trips/sync`
- Sync-on-reconnect
- WebSocket reconnect
- Vehicle mismatch warning cơ bản
- GPS payload validation
- GPS event rate limit
- Raw GPS TTL 30 ngày
- Partitioning plan cho raw GPS events
- Developer Mode/Simulator
- AR Lite fallback
- Privacy baseline
- Background Location Service baseline
- Exponential backoff with jitter for reconnect
- Batch sync limit 500 events/payload + chunking
- Driver-friendly warning overlay

Các yêu cầu đưa vào post-MVP:

- Crowdsourced trust verification production-grade
- Gamification
- Redis/Kafka scale nâng cao
- App Attestation / DeviceCheck / Play Integrity
- AR tích hợp sâu vào mobile app chính

Các yêu cầu R&D:

- Unity AR terrain mesh prototype
- Obstacle detection bằng mesh
- Performance test cho AR
