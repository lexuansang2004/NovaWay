# NovaWay - Source Summary v0.3

## 1. Vision sản phẩm

NovaWay là hệ thống định tuyến vị trí, quản lý phương tiện cá nhân hóa và cảnh báo địa hình thời gian thực cho người lái xe.

Sản phẩm hướng đến việc giúp người dùng:

- Quản lý phương tiện cá nhân.
- Chọn đúng phương tiện trước khi bắt đầu di chuyển.
- Theo dõi vị trí realtime trên bản đồ.
- Nhận cảnh báo địa hình/rủi ro trên tuyến đường.
- Ghi lại lịch sử chuyến đi.
- Hoạt động ổn định khi mạng yếu/mất mạng nhờ local queue.
- Về lâu dài, đóng góp dữ liệu địa hình cộng đồng bằng mobile/AR.

## 2. Thành phần hệ thống

NovaWay gồm các khối chính:

1. Backend Server
   - Auth.
   - Vehicle Management.
   - Trip Logs.
   - Realtime Location Gateway.
   - Offline Sync REST API.
   - Routing Service.
   - Warning/Event Processing.
   - Data retention / cleanup policy.

2. Web Dashboard
   - Login.
   - Quản lý xe.
   - Live map.
   - Theo dõi phương tiện realtime.
   - Thống kê chuyến đi.

3. Mobile App
   - Login.
   - Chọn phương tiện.
   - Bắt đầu/kết thúc chuyến đi.
   - Gửi GPS realtime khi mạng ổn định.
   - Local queue khi mất mạng.
   - Batch sync qua REST khi có mạng lại.
   - Màn hình sử dụng phương tiện có Map + AR Lite/cảnh báo.
   - Developer Mode ẩn để giả lập GPS/mất mạng/nhiệt độ khi test.

4. Map & Routing Layer
   - Dùng dữ liệu OpenStreetMap ecosystem.
   - Web ưu tiên MapLibre GL JS.
   - Leaflet chỉ dùng nếu muốn prototype cực nhanh.
   - Tile provider MVP/dev: Protomaps hoặc Mapbox Free Tier sau khi kiểm tra quota/cost hiện hành.
   - Không dùng public OSM tile server cho heavy production.
   - Routing mock trước, OSRM/GraphHopper sau.

5. AR / Terrain Warning Layer
   - Không làm kính ảo/VR.
   - Tập trung vào mobile screen trong lúc sử dụng phương tiện.
   - MVP: AR Lite / map-based warning overlay.
   - R&D: AR Mesh Grid bằng Unity/AR Foundation nếu cần.
   - Có fallback cho pin/nhiệt/ánh sáng yếu.

## 3. Nguyên tắc phát triển

NovaWay đi theo quy trình:

```text
Tài liệu trước
→ người dùng kiểm tra/bổ sung
→ Requirement Baseline v1.0
→ code từng micro-step
→ test từng step
→ PR vào develop
→ test develop
→ merge main
```

Không code khi tài liệu chưa rõ.

## 4. AI Workflow áp dụng

| AI | Vai trò |
|---|---|
| NotebookLM | Gom nguồn, hỏi đáp theo tài liệu gốc, feedback đầu tiên |
| ChatGPT 5.5 | Viết PRD/SRS/Architecture/Roadmap chính |
| ChatPRD | Chuẩn hóa PRD, user stories, acceptance criteria |
| Claude Opus 4.8 | Review logic sâu, risk, edge cases |
| Gemini 3.1 Pro / 3.5 Flash | Kiểm tra chéo, tạo bảng, flow, alternative solution |
| Codex | Code agent sau khi tài liệu final |
| Claude Code / Sonnet | Hỗ trợ code chi tiết, fix bug, review |

## 5. Quyết định đã chốt trong D0.1 v0.3

- Tên dự án: **NovaWay**.
- Backend MVP: **NestJS + TypeScript**.
- Database: **PostgreSQL + PostGIS**.
- Realtime live tracking: **WebSocket/Socket.io**.
- Offline sync: **REST Batch Upload `/api/trips/sync`**, không dùng WebSocket để gửi bù dữ liệu lớn.
- Raw GPS events: lưu tạm có TTL **30 ngày**, có `client_event_id` để idempotency.
- Trip logs summary: lưu dài hạn/vô thời hạn theo chính sách sản phẩm.
- Map: **OpenStreetMap ecosystem**, client ưu tiên **MapLibre GL JS**.
- Tile provider MVP/dev: **Protomaps hoặc Mapbox Free Tier**; tự host tile server để post-MVP.
- MVP có AR nhưng chỉ ở mức **AR Lite / cảnh báo trên màn hình sử dụng phương tiện**, không phải VR/kính ảo.
- Developer Mode ẩn được đưa vào MVP để giả lập GPS, mất mạng và thermal state khi test.
- Post-MVP security: cân nhắc App Attestation như Play Integrity/DeviceCheck để giảm lạm dụng GPS API.
