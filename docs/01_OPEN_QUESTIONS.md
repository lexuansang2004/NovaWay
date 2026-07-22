# NovaWay - Open Questions v0.4

Tài liệu này ghi lại các câu hỏi còn cần chốt trước khi chuyển sang PRD/SRS final.

## 1. Câu hỏi đã có câu trả lời tạm thời / đã chốt trong D0.1

### Q1. MVP có AR không?

**Trả lời hiện tại:** Có, nhưng chỉ làm AR ở mức mobile screen/màn hình sử dụng phương tiện trên map. Không làm kính ảo, không làm VR, không làm AR Mesh Grid nặng trong MVP.

**Quyết định:**

- MVP: AR Lite / map-based warning overlay.
- R&D: Unity AR Mesh Grid để sau khi core ổn.

---

### Q2. Backend chọn Node/NestJS hay Go?

**Trả lời hiện tại:** Chọn NestJS cho MVP.

**Lý do:**

- Hợp với TypeScript.
- Dễ chia module.
- Hợp với Auth, API, WebSocket, Redis, testing.
- Phù hợp cho AI agent/Codex đọc code theo module.

**Quyết định:**

- MVP Backend: NestJS + TypeScript.
- Go chỉ cân nhắc sau này cho service hiệu năng cao như routing worker hoặc telemetry processing nếu thật sự cần.

---

### Q3. Dùng map nào miễn phí và đủ tốt?

**Trả lời hiện tại:** Dùng hệ sinh thái OpenStreetMap, nhưng cần tile provider rõ ràng.

**Quyết định kỹ thuật tạm thời:**

- Map data: OpenStreetMap ecosystem.
- Web dashboard: ưu tiên MapLibre GL JS.
- Tile provider MVP/dev: ưu tiên Protomaps nếu phù hợp với MapLibre và chi phí/quota; Mapbox Free Tier là phương án fallback thực dụng.
- Public OSM tile server chỉ dùng demo nhỏ, không dùng cho heavy production/offline prefetch.
- Self-host tile server/vector tiles chuyển sang Post-MVP.
- **Cập nhật (R1-7, 07/2026):** OQ-005 đã chốt final — xem `docs/architecture/TDR-tile-provider-spike.md`.

---

### Q4. Offline queue gửi lại bằng gì?

**Trả lời hiện tại:** Không dùng WebSocket để gửi bù dữ liệu lớn khi reconnect.

**Quyết định:**

- WebSocket/Socket.io chỉ dùng cho live stream khi mạng ổn định.
- Khi offline, mobile lưu local queue.
- Khi có mạng lại, mobile gọi REST Batch Upload: `POST /api/trips/sync`.
- Mỗi event phải có `client_event_id` để server chống trùng.

---

### Q5. Raw GPS data lưu bao lâu?

**Trả lời hiện tại:** Chốt nguyên tắc MVP.

**Quyết định:**

- `trip_logs` / trip summary: lưu dài hạn/vô thời hạn theo chính sách sản phẩm.
- Raw GPS events: TTL 30 ngày.
- Bảng raw GPS cần thiết kế theo hướng partitioning/time-based cleanup để tránh phình database.

---

### Q6. Có cần simulator/developer mode trong MVP không?

**Trả lời hiện tại:** Có, nhưng chỉ là Developer Mode ẩn cho dev/test.

**Quyết định:**

- Có màn hình/cơ chế Developer Mode ẩn.
- Dùng để test mock GPS route, mock mất mạng, mock thermal/low-light state.
- Không bật mặc định cho user production.

---

### Q7. Mobile có cần Background Location Service trong MVP không?

**Trả lời hiện tại:** Có, nhưng chỉ khi user đã bắt đầu chuyến đi và đã đồng ý tracking.

**Quyết định:**

- Mobile app cần thiết kế luồng foreground/background location rõ ràng.
- Android cần Foreground Service khi tracking chạy nền, có notification liên tục để người dùng biết đang được theo dõi vị trí.
- iOS cần flow xin quyền phù hợp cho tracking khi app chạy nền/khóa màn hình, ví dụ Always Allow nếu phạm vi MVP cần theo dõi liên tục trong chuyến đi.
- Nếu người dùng không cấp quyền background/always, app vẫn cho tracking foreground nhưng phải thông báo giới hạn.

---

### Q8. Offline batch sync giới hạn bao nhiêu event?

**Trả lời hiện tại:** Chốt MVP dùng giới hạn an toàn ban đầu 500 events/payload.

**Quyết định:**

- `POST /api/trips/sync` nhận tối đa 500 events mỗi request ở MVP.
- Nếu local queue vượt 500 events, mobile phải chia nhỏ thành nhiều chunk và gửi tuần tự.
- Server trả lỗi rõ nếu payload vượt giới hạn.

---

### Q9. WebSocket reconnect xử lý thế nào để tránh quá tải?

**Trả lời hiện tại:** Dùng exponential backoff with jitter.

**Quyết định:**

- Không reconnect đồng loạt tức thì.
- Mỗi lần retry tăng thời gian chờ và cộng thêm jitter ngẫu nhiên.
- Sau khi reconnect thành công mới resume live stream; offline queue vẫn sync qua REST batch.

---

### Q10. Warning sai lệch phương tiện hiển thị thế nào cho an toàn khi lái xe?

**Trả lời hiện tại:** Dùng driver-friendly overlay.

**Quyết định:**

- Cảnh báo phải là overlay lớn, rõ, không dùng push notification nhỏ làm UI chính khi người dùng đang lái.
- Cho phép xác nhận bằng 1 chạm.
- Tự ẩn sau 10 giây nếu người dùng không phản hồi.
- Không che khuất bản đồ quá lâu và không yêu cầu thao tác phức tạp.

## 2. Câu hỏi cần chốt tiếp trong D0.2

| ID | Câu hỏi | Mức độ quan trọng | Gợi ý quyết định |
|---|---|---:|---|
| OQ-001 | Mobile dùng Flutter chắc chắn chưa? | Cao | Nên dùng Flutter để đi iOS/Android, phù hợp mục tiêu mobile |
| OQ-002 | Web dashboard có nằm trong MVP không? | Cao | Có, nhưng chỉ dashboard cơ bản + live map |
| OQ-003 | Admin role có cần trong MVP không? | Trung bình | Chưa cần full admin; có thể chuẩn bị role field |
| OQ-004 | Offline queue lưu GPS hay cả obstacle event? | Cao | MVP lưu GPS/trip event trước; obstacle event sau hoặc chỉ warning mock |
| OQ-005 | ~~Tile provider MVP chọn Protomaps hay Mapbox Free Tier?~~ | Cao | **Đã chốt (R1-7, 07/2026):** Protomaps — hosted API (free, 1M request/tháng) cho MVP/staging, self-host PMTiles + Cloudflare R2 cho production. Xem `docs/architecture/TDR-tile-provider-spike.md`. |
| OQ-006 | ~~Mobile map plugin chọn gì?~~ | Cao | **Đã chốt (R1-5, 07/2026):** `flutter_map` + OSM public tile — khớp trạng thái hiện tại của web (Leaflet + OSM), tránh phụ thuộc OQ-005 lúc đó vẫn mở. Xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §7. |
| OQ-007 | GPS sampling frequency là bao nhiêu? | Cao | Đề xuất 1-5 giây/event khi active trip; cần test pin |
| OQ-008 | Dữ liệu public warning cần ẩn danh mức nào? | Cao | Chỉ lưu aggregate/crowdsourced event cho bản đồ chung |
| OQ-009 | Routing MVP dùng mock hay engine thật? | Cao | MVP dùng routing mock theo vehicle trước |
| OQ-010 | Có dùng push notification trong MVP không? | Trung bình | Chưa bắt buộc; dùng in-app warning trước |
| OQ-011 | App Attestation có vào MVP không? | Trung bình | Không; đưa Post-MVP security hardening |
| OQ-012 | AR Lite định nghĩa UI cụ thể là gì? | Cao | Cần thiết kế flow: Map view + warning overlay + optional camera later |
| OQ-013 | GPS background tracking UX chi tiết ra sao? | Cao | D0.2 cần mô tả foreground/background behavior và permission fallback |
| OQ-014 | Batch sync có partial success format thế nào? | Trung bình | D0.2 cần mô tả response cơ bản cho accepted/rejected events |

## 3. Câu hỏi không nên chốt quá sớm

Các phần này để sau MVP/core ổn định:

- Kafka hay NATS?
- Unity nhúng vào Flutter bằng package nào?
- Thuật toán AI camera phát hiện ổ gà chính xác ra sao?
- Gamification tính điểm chi tiết thế nào?
- Tự host tile server ở đâu?
- App Attestation triển khai bằng provider nào và mức strict ra sao?

## 4. Điều kiện đóng Open Questions trước PRD/SRS final

Trước khi chốt Requirement Baseline v1.0, phải trả lời tối thiểu:

```text
- Mobile stack
- Web dashboard MVP scope
- Backend stack
- Map stack + tile provider candidate
- Offline queue scope + sync protocol
- Privacy/consent baseline
- Raw GPS retention policy
- AR Lite scope
- Routing MVP scope
- Simulator/developer mode scope
- Background location behavior
- Batch sync size/chunking rule
- Driver-friendly warning UI
```
