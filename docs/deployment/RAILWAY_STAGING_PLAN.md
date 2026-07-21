# NovaWay — Railway Staging Deployment Plan (R1-1)

> Kế hoạch, **chưa triển khai**. Đóng góp cho Sprint R1 (`docs/roadmap/SPRINT_R1_STABILIZATION.md`, mục R1-1/R1-2). Không có bước nào trong tài liệu này đã được thực hiện trên Railway thật — cần thực hiện tuần tự và verify từng bước trước khi coi staging là "sẵn sàng".

## 1. Quyết định

Chọn **Railway** làm nền tảng hosting cho môi trường **staging/pilot** của NovaWay.

**Lý do:**
- Ưu tiên tốc độ triển khai và vận hành đơn giản — chỉ có một người maintain dự án ở giai đoạn này.
- Backend cần chạy liên tục và giữ kết nối WebSocket bền (`/realtime` namespace) — Railway hỗ trợ tốt, không phải serverless/lambda thuần.
- Hỗ trợ deploy trực tiếp từ Docker image hoặc GitHub — khớp với cách backend đã đóng gói (`apps/backend` build ra `dist/` + `node dist/main.js`, xem `docker-compose.yml` cho pattern Postgres/PostGIS tương tự).
- Chi phí tăng dần theo usage (chấp nhận Hobby/Pro nếu cần) — phù hợp quy mô pilot, không cam kết hạ tầng lớn trước khi có tải thật (đúng tinh thần TDR-004).

**Không phải quyết định cuối cùng cho production.** Khi NovaWay cần scale thật (multi-region, nhiều instance, SLA cao hơn), Fly.io là ứng viên hàng đầu để đánh giá lại — xem mục 7.

## 2. Nguyên tắc thiết kế: tránh lock-in vào Railway

Đây là yêu cầu bắt buộc của kế hoạch này, không phải tuỳ chọn:

- **Không có logic đặc thù Railway trong application code.** `apps/backend`, `apps/web` chỉ đọc cấu hình qua biến môi trường chuẩn (đã có sẵn qua `@nestjs/config` + Joi validation, `import.meta.env` phía Vite) — không gọi Railway API/SDK, không phụ thuộc biến môi trường riêng của Railway (`RAILWAY_*`) trong logic nghiệp vụ.
- **Đóng gói bằng Docker chuẩn**, không dùng tính năng build đặc thù của Railway (Nixpacks tự động cũng được, nhưng ưu tiên viết `Dockerfile` tường minh cho `apps/backend` để bất kỳ nền tảng nào hỗ trợ Docker — Fly.io, Render, VPS — đều chạy được không sửa gì).
- **Postgres/PostGIS dùng image chuẩn** (`postgis/postgis:16-3.4-alpine`, đúng image đã dùng ở `docker-compose.yml` local) — không phụ thuộc vào "Railway Postgres template" nếu template đó không cho enable PostGIS; nếu Railway's managed Postgres không hỗ trợ PostGIS trực tiếp, deploy `postgis/postgis` như một service riêng từ Docker image thay vì dùng template mặc định.
- **Migration chạy qua TypeORM CLI có sẵn** (`pnpm --filter @novaway/backend migration:run`), không dùng cơ chế migration riêng của Railway.
- Kết quả: nếu cần chuyển sang Fly.io/VPS sau này, việc cần làm chỉ là point lại `DATABASE_URL`/`WEB_ORIGIN` và re-deploy cùng Docker image — không sửa code.

## 3. Kiến trúc trên Railway

Ánh xạ trực tiếp từ `docker-compose.yml` + cấu trúc monorepo hiện có, không thiết kế lại:

| Thành phần local (`docker-compose.yml` / `pnpm dev`) | Trên Railway |
|---|---|
| `postgres` service (`postgis/postgis:16-3.4-alpine`) | 1 Railway service, deploy từ cùng Docker image, volume riêng cho data |
| `apps/backend` (`node dist/main.js`) | 1 Railway service, build từ `Dockerfile` (mới, xem mục 5), expose port qua biến `PORT` |
| `apps/web` (`vite build` → static `dist/`) | Host tĩnh — **không nhất thiết trên Railway**; có thể dùng Vercel/Netlify/Cloudflare Pages (free tier, tách khỏi backend vì không cần WebSocket/state) |
| `apps/mobile` | Không host — build client, trỏ `API_BASE_URL`/`SOCKET_BASE_URL` (`--dart-define`, xem `apps/mobile/lib/config/api_config.dart`) tới URL backend staging |

## 4. Environment variables cần thiết (chỉ tên biến — điền giá trị thật trực tiếp trên Railway dashboard, không ghi vào bất kỳ file nào trong repo)

Danh sách lấy từ `apps/backend/.env.example` + `apps/web/.env.example` hiện có — không thêm biến mới ngoài kế hoạch:

**Backend service:**
- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `WEB_ORIGIN` — set thành URL thật của web staging (bước 3)
- `ROUTING_PROVIDER`
- `ROUTING_ENGINE_BASE_URL`
- `ROUTING_ENGINE_TIMEOUT_MS`
- `VERIFICATION_VALIDITY_MINUTES`

**Web (nếu build tại nơi host tĩnh, hoặc build trước rồi upload):**
- `VITE_API_BASE_URL` — set thành URL thật của backend staging + `/api`

**Không** commit bất kỳ giá trị thật nào của các biến trên vào repo dưới bất kỳ hình thức nào (kể cả trong tài liệu này) — chỉ set trực tiếp trên Railway/host tĩnh.

## 5. Các bước triển khai (checklist — chưa thực hiện)

- [ ] Viết `apps/backend/Dockerfile` (multi-stage: build `tsc`, copy `dist/` + `node_modules` production, `CMD ["node", "dist/main.js"]`) — dùng chung được cho Railway/Fly.io/VPS.
- [ ] Tạo project mới trên Railway, thêm service Postgres từ Docker image `postgis/postgis:16-3.4-alpine` (không dùng template Postgres mặc định nếu template không hỗ trợ enable PostGIS — xác nhận lại khi thao tác thật).
- [ ] Thêm service backend, deploy từ `Dockerfile` ở trên, set đủ biến môi trường (mục 4).
- [ ] Chạy migration (`migration:run`) nhắm vào `DATABASE_URL` của Railway — **không** để backend tự `synchronize` (đã tắt sẵn trong `app.module.ts`, giữ nguyên).
- [ ] Build `apps/web`, deploy static output lên Vercel/Netlify/Cloudflare Pages (hoặc Railway static nếu muốn gộp 1 nền tảng), set `VITE_API_BASE_URL` trỏ về backend staging.
- [ ] Set CORS: `WEB_ORIGIN` trên backend khớp đúng domain thật của web staging.

## 6. Xác minh sau khi deploy (bắt buộc trước khi coi staging "sẵn sàng")

Không coi bước nào ở mục 5 là xong nếu chưa verify được ở đây:

1. **Postgres/PostGIS healthcheck:**
   - `GET https://<backend-staging>/health` phải trả `{"status":"ok","database":{"status":"ok"}}` (xem `apps/backend/src/health/health.controller.ts` — đã tự kiểm tra Postgres qua `SELECT 1`).
   - Chạy thử một truy vấn dùng PostGIS thật (vd. qua `raw_gps_events`/`ST_MakeLine` như `TripsService.buildTripLog` đã dùng) để xác nhận extension PostGIS thật sự hoạt động, không chỉ Postgres thường.
   - Migration đã chạy đủ — đối chiếu số migration đã áp dụng khớp với `apps/backend/src/database/migrations/`.

2. **WebSocket trên URL staging thật:**
   - Dùng script `socket.io-client` (như đã dùng để verify `RealtimeGateway` ở step `3.1`/`4.3`/`6.1`/`7.1` trong quá trình phát triển) kết nối thẳng tới `wss://<backend-staging>/realtime` (qua domain thật Railway cấp, không phải localhost) với JWT thật lấy từ `POST /api/auth/login` trên staging.
   - Xác nhận: connect thành công, `location:update` được accept/broadcast đúng, và **quan trọng** — xác nhận kết nối WebSocket không bị hạ tầng phía trước (proxy/load balancer của Railway) cắt ngang hoặc timeout sớm hơn dự kiến.

3. **`GET /metrics`** trả về đúng định dạng Prometheus, số liệu tăng đúng sau khi có traffic thật (đối chiếu cách đã verify ở step `9.1`).

Chỉ sau khi cả 3 mục trên pass mới coi R1-2 (deploy `develop` lên staging) là hoàn tất, mở khoá cho R1-3 (viết E2E suite chạy trên staging).

## 7. Lộ trình sau pilot: đánh giá lại bằng Fly.io (không phải bây giờ)

Khi NovaWay cần scale ra khỏi giai đoạn pilot (nhiều instance, yêu cầu latency/uptime cao hơn, hoặc chi phí Railway usage-based bắt đầu không còn tối ưu), **Fly.io** là ứng viên hàng đầu để đánh giá lại — nhờ WebSocket/global edge tốt nhất trong các lựa chọn đã so sánh và khả năng chạy Docker container (bao gồm `postgis/postgis`) trực tiếp.

Quyết định đổi sang Fly.io (hoặc nhà cung cấp khác) cho production **phải đi qua một TDR riêng** (theo đúng convention `docs/04_TECH_DECISION_RECORD.md`/`docs/architecture/TDR-routing-engine.md` đã dùng cho các quyết định hạ tầng khác) — không quyết định ở tài liệu này. Nhờ nguyên tắc "không lock-in" ở mục 2, việc chuyển đổi chỉ là re-deploy cùng Docker image + trỏ lại env var, không cần sửa code backend/web.

## 8. Ngoài phạm vi tài liệu này

- Không tự động hoá CD (auto-deploy khi merge vào `develop`/`main`) — làm thủ công trước, tự động hoá là việc riêng sau khi pilot ổn định.
- Không viết E2E suite (đó là R1-3, phụ thuộc staging đã xong ở đây).
- Không đụng tới step `8.1` (AR) hay bất kỳ tính năng sản phẩm mới nào.
