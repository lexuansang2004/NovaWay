# NovaWay — Technical Decision Record: Tile Provider Spike (R1-7, đóng OQ-005)

> Bổ sung 07/2026. `docs/04_TECH_DECISION_RECORD.md` TDR-002 ghi "Protomaps hoặc Mapbox Free Tier làm tile provider candidate" nhưng chưa từng chốt — `docs/01_OPEN_QUESTIONS.md` OQ-005 ghi "Cao", D0.3 dự kiến kiểm quota/cost và chọn final nhưng chưa làm. Doc này là technical spike (R1-7, `docs/roadmap/SPRINT_R1_STABILIZATION.md`) đóng OQ-005. **Phạm vi: chỉ chốt quyết định qua nghiên cứu, không migrate code** — `apps/web`'s `TripMap.tsx` vẫn dùng Leaflet + public OSM tile cho tới khi có PR migration riêng.

## Decision

Chọn **Protomaps** làm tile provider cho NovaWay (thay thế public OSM tile hiện tại khi migrate sang MapLibre GL JS):

- **MVP/staging:** dùng hosted API của Protomaps (`api.protomaps.com`) — free, soft cap 1,000,000 tile request/tháng, không cần đăng ký thẻ tín dụng.
- **Production (khi cần):** self-host qua `PMTiles` (single-file format, serve trực tiếp từ object storage qua HTTP range request) trên Cloudflare R2 + Workers — chi phí ước tính cực thấp, không phụ thuộc uptime của bên thứ ba.
- **Mapbox Free Tier** ghi nhận là fallback candidate nếu Protomaps hosted API gặp sự cố kéo dài — không triển khai trừ khi cần.

## Context

`TDR-002` (Map Stack) đã chốt hướng dài hạn là MapLibre GL JS + vector tiles, nhưng chưa chọn nhà cung cấp tile cụ thể. Hiện tại `TripMap.tsx` (`apps/web/src/components/map/TripMap.tsx`) dùng Leaflet + `tile.openstreetmap.org` (public OSM tile server), có sẵn comment `TODO(production)` chờ quyết định này. Public OSM tile server không có SLA và không dành cho production/heavy traffic (`TDR-002` "Important Note") — cần chốt provider trước khi migrate sang MapLibre.

## Nghiên cứu (07/2026)

### Protomaps

| Hạng mục | Chi tiết |
|---|---|
| Hosted API free tier | Soft cap **1,000,000 tile request/tháng**, không yêu cầu thẻ tín dụng, dùng ngay để dev/staging |
| Commercial hosted | Từ $14/tháng (qua GitHub Sponsors) nếu vượt free tier hoặc cần commercial support |
| Self-host | `PMTiles` — file bản đồ tĩnh (extract theo vùng, vd. chỉ Việt Nam) serve qua HTTP range request từ object storage bất kỳ (S3, Cloudflare R2, v.v.), không cần server riêng |
| Ước tính chi phí self-host (theo cost calculator chính thức, `docs.protomaps.com/deploy/cost`) | ~10 triệu request/tháng: **$11.45/tháng** (Cloudflare Workers + R2) hoặc $119.56/tháng (AWS CloudFront + Lambda + S3) — quy mô NovaWay staging hiện tại (vài chục user nội bộ) sẽ thấp hơn nhiều |
| License | BSD (code) + ODbL (dữ liệu OSM) |
| API key | Không bắt buộc cho self-host; hosted API dùng domain-based free tier |
| Tương thích MapLibre GL JS | Native — Protomaps là vector tile (PMTiles), đúng định dạng MapLibre GL JS đọc trực tiếp qua plugin chính thức (`protomaps-leaflet` cho Leaflet, hoặc PMTiles protocol handler cho MapLibre) |

### Mapbox Free Tier

| Hạng mục | Chi tiết |
|---|---|
| Map loads (Mapbox GL JS) | 50,000/tháng free |
| Vector Tiles API | 200,000 request/tháng free |
| Static Tiles API | 200,000 request/tháng free |
| Raster Tiles API | 750,000 request/tháng free |
| Giá sau free tier | Usage-based, vd. Vector Tiles ~$0.25/1,000 request ở bậc 200,001–2,000,000 |
| Thẻ tín dụng | **Bắt buộc ngay từ khi đăng ký**, kể cả chỉ dùng free tier |
| License/hệ sinh thái | Đóng hơn — Mapbox GL JS (v2+) chuyển sang license riêng (không phải open-source thuần); dùng tile API với MapLibre GL JS (thay vì Mapbox GL JS) về mặt kỹ thuật khả thi nhưng nằm ngoài use-case chính thức được Mapbox tối ưu/hỗ trợ |

## Options

| Option | Ưu điểm | Nhược điểm | Quyết định |
|---|---|---|---|
| Protomaps hosted API | Free tier rộng (1M req/tháng), không cần thẻ tín dụng, tương thích native với MapLibre GL JS (hướng đã chốt ở TDR-002) | Soft cap có thể cần nâng cấp commercial nếu traffic tăng mạnh | **Chọn cho MVP/staging** |
| Protomaps self-host (PMTiles + Cloudflare R2) | Không phụ thuộc uptime bên thứ ba, chi phí cực thấp khi scale, kiểm soát hoàn toàn | Cần thêm bước build/publish PMTiles extract (vùng Việt Nam), thêm hạ tầng (R2 bucket) | **Chọn cho production**, khi cần |
| Mapbox Free Tier | Hệ sinh thái trưởng thành, SLA thương mại rõ ràng | Bắt buộc thẻ tín dụng ngay, quota map-load thấp hơn (50k/tháng), rủi ro phát sinh phí nếu vượt ngưỡng, ràng buộc hệ sinh thái đóng hơn | Fallback — chỉ dùng nếu Protomaps gặp sự cố kéo dài |
| Tiếp tục public OSM tile | Không cần đổi gì | Không có SLA, vi phạm chính "Important Note" của TDR-002, không phù hợp production | Loại — đây là lý do OQ-005 cần đóng |

## Rationale

Protomaps thắng ở 3 điểm quyết định cho giai đoạn hiện tại của NovaWay (staging nội bộ, chưa có traffic sản xuất thật, ngân sách hạn chế):

1. **Không cần thẻ tín dụng / cam kết chi phí** để bắt đầu dùng ngay cho staging — khớp với cách R1-1/R1-2 đã chọn Railway/Vercel (ưu tiên free tier không ràng buộc thanh toán khi chưa cần).
2. **Tương thích native với MapLibre GL JS** — hướng dài hạn đã chốt ở TDR-002, tránh phải đổi provider lần nữa khi migrate khỏi Leaflet.
3. **Đường nâng cấp production rõ ràng và rẻ** (self-host PMTiles) — không giống Mapbox nơi chi phí tăng theo usage ngay cả ở quy mô vừa, Protomaps self-host cho phép NovaWay kiểm soát chi phí chủ động khi có traffic thật.

## Consequence

- **Không có thay đổi code trong PR này** — quyết định này chỉ đóng OQ-005 bằng nghiên cứu/tài liệu, đúng phạm vi "technical spike" P2 của R1-7.
- Khi có PR migrate `TripMap.tsx` từ Leaflet sang MapLibre GL JS (việc riêng, chưa lên lịch): dùng Protomaps hosted API (`api.protomaps.com`) làm tile source cho dev/staging, giữ nguyên `TileLayer`-equivalent interface hiện có (comment `TODO(production)` ở `TripMap.tsx:7` sẽ được giải quyết ở PR đó).
- `apps/mobile`'s `flutter_map` (đã chốt OQ-006, R1-5) hiện dùng OSM public tile để khớp trạng thái web hiện tại — khi web migrate sang Protomaps, mobile nên đổi theo song song (đã ghi ở `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §7) để tránh 2 tile source khác nhau giữa web/mobile.

## Chưa quyết định (cần làm ở PR migration riêng)

- Thời điểm thực hiện migrate Leaflet → MapLibre GL JS (không khẩn cấp — Leaflet + OSM public tile vẫn hoạt động cho dev/demo, chỉ không phù hợp production thật).
- Vùng địa lý cụ thể để extract PMTiles khi self-host production (dự kiến chỉ Việt Nam để giảm dung lượng, cần xác nhận khi NovaWay có phạm vi hoạt động địa lý rõ ràng hơn).
- Ngân sách chính thức cho Cloudflare R2/Workers khi chuyển sang self-host production.
