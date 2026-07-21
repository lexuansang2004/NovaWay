# NovaWay — Technical Decision Record: Routing Engine (step `5.2`)

> Bổ sung 07/2026. `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` dòng `5.2` ghi "Tích hợp OSRM/GraphHopper/Map provider **theo quyết định**" — chưa từng chốt ở `docs/04_TECH_DECISION_RECORD.md` hay bất kỳ đâu khác. Doc này chốt quyết định cho step `5.2`, tách khỏi `04_TECH_DECISION_RECORD.md` vì đây là quyết định hạ tầng có thể còn thay đổi khi lên production (không giống các TDR khác đã ổn định từ D0.1).

## Decision

Step `5.2` **không** tự host OSRM/GraphHopper và **không** chọn nhà cung cấp production. Thay vào đó:

1. Giữ `MockRoutingProvider` (step `5.1`) làm **fallback bắt buộc** — không đổi.
2. `RoutingProvider` interface (đã có từ `5.1`, `apps/backend/src/routing/routing-provider.interface.ts`) giữ nguyên, không đổi contract HTTP `POST /api/routes/preview` (`API_CONTRACT.md` §10).
3. Thêm `OsrmRoutingProvider` — gọi OSRM **public demo server** (`https://router.project-osrm.org` theo mặc định) **chỉ cho dev/test**, base URL đọc từ env (`ROUTING_ENGINE_BASE_URL`), không hardcode trong provider.
4. `OsrmRoutingProvider` có timeout ngắn (mặc định 3s, cấu hình qua env), tối đa 1 lần retry, và fallback về `MockRoutingProvider` khi timeout/lỗi/response không hợp lệ — không bao giờ để request của user thất bại vì engine ngoài không phản hồi.
5. Provider nào được dùng (`mock` hay `osrm`) chọn qua env `ROUTING_PROVIDER` (mặc định `mock` nếu không set) — production vẫn mặc định dùng mock cho tới khi có TDR hạ tầng riêng.
6. **Không** tự host OSRM/GraphHopper ở step này — cần ADR/TDR hạ tầng riêng (chi phí server, nguồn dữ liệu OSM Việt Nam, quy trình cập nhật extract) trước khi làm, ghi ở mục "Chưa quyết định" bên dưới.

## Context

`ARCHITECTURE.md` §3.2/§7 và `docs/00_SOURCE_SUMMARY.md` đều ghi "Routing mock trước, OSRM/GraphHopper sau" nhưng chưa từng so sánh cụ thể 2 lựa chọn đó, và cũng chưa xét khả năng dùng public demo server làm cầu nối trước khi tự host. Môi trường dev hiện tại không có API key nào được cấp sẵn (Mapbox, GraphHopper Cloud, v.v.), và tự host OSRM cần tải OSM extract (Việt Nam ~vài trăm MB) + chạy `osrm-extract`/`osrm-contract` — không phù hợp làm trong một micro-step khi chưa có quyết định hạ tầng.

## Options

| Option | Ưu điểm | Nhược điểm | Quyết định |
|---|---|---|---|
| OSRM public demo server | Miễn phí, không cần signup/API key, route bám đường thật | Server công cộng, không SLA, chỉ có profile `driving` chung (không tách motorbike/car ở tầng engine) | **Chọn cho dev/test ở step `5.2`** |
| Tự host OSRM (Docker + OSM Việt Nam) | Chủ động hoàn toàn, không phụ thuộc bên thứ ba | Cần tải OSM extract, chạy `osrm-extract`/`osrm-contract`, thêm service vào `docker-compose.yml`, tốn thời gian/dung lượng đáng kể | Hoãn — cần ADR/TDR hạ tầng riêng |
| GraphHopper Cloud API | Có profile theo phương tiện rõ hơn OSRM | Cần signup + API key, có giới hạn free tier | Hoãn — cần quyết định ngân sách/API key |
| Map provider (Mapbox Directions, v.v.) | Chất lượng cao, SLA thương mại | Cần API key + chi phí, trùng lựa chọn tile provider (`04_TECH_DECISION_RECORD.md` TDR-002) chưa chốt | Hoãn — chốt cùng lúc với tile provider |

## Rationale

Public demo server cho phép step `5.2` thực sự tích hợp một routing engine thật (đúng tinh thần "Routing engine thật" của plan) mà không phải đưa ra quyết định hạ tầng/ngân sách chưa chín muồi. Vì đây là *dev/test only* và luôn có fallback về mock, rủi ro server công cộng không ổn định không ảnh hưởng tới việc `route motorcycle/car, timeout fallback, build pass` (tiêu chí test của `5.2`) — timeout/fallback path còn được test kỹ hơn nhờ chính sự không ổn định đó.

## Consequence

- `apps/backend/src/routing/providers/osrm-routing.provider.ts` — gọi OSRM `driving` profile, parse `distance`/`duration`/`geometry`, timeout+retry, throw lỗi nội bộ khi fail (không phải HTTP error trả cho client) để `RoutingService`/factory fallback về mock.
- `ROUTING_PROVIDER`, `ROUTING_ENGINE_BASE_URL`, `ROUTING_ENGINE_TIMEOUT_MS` thêm vào `env.validation.ts` + `.env.example`.
- Không sửa `API_CONTRACT.md` §10 — contract HTTP với web/mobile không đổi (đúng nguyên tắc adapter đã ghi ở `ARCHITECTURE.md` §3.2).

## Chưa quyết định (cần TDR/ADR riêng trước khi làm production)

- Tự host OSRM/GraphHopper: chi phí server, nguồn OSM extract Việt Nam, quy trình cập nhật dữ liệu định kỳ.
- Ngân sách cho Map provider thương mại (Mapbox/GraphHopper Cloud) — nên chốt cùng lúc với tile provider (`04_TECH_DECISION_RECORD.md` TDR-002, hiện vẫn "candidate").
- Phân biệt route theo `vehicleType` ở tầng engine thật (OSRM/GraphHopper self-host có thể cấu hình profile riêng cho xe máy; public demo server và hầu hết Map provider thương mại không có).
