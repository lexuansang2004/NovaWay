# NovaWay — Railway Dashboard Checklist (R1-2)

> Thao tác thủ công trên Railway Dashboard — không dùng Railway CLI. Đi kèm [`RAILWAY_STAGING_PLAN.md`](./RAILWAY_STAGING_PLAN.md) (quyết định + kiến trúc tổng thể). Tài liệu này là checklist thao tác cụ thể, cập nhật theo cấu hình thật đã thấy trên Dashboard khi thực hiện R1-2.

## 0. Điều kiện tiên quyết

- [x] `apps/backend/Dockerfile` tồn tại, đã verify build + boot local bằng `docker build`/`docker run` thật (xem log verify trong PR `chore/railway-dockerfile`).
- [x] `.dockerignore` loại trừ `node_modules`, `**/dist`, `**/*.tsbuildinfo`, `apps/mobile/build`, `demo-app`, `.git`, secrets.
- [ ] Project Railway đã tạo, service `@novaway/backend` đã kết nối tới repo `lexuansang2004/NovaWay`.

## 1. Service backend — Source

- [ ] **Root Directory:** để **trống** (không set) — bắt buộc, vì Dockerfile cần build context là repo root để thấy `packages/shared-types`.
- [ ] **Branch connected to production:** `develop`.
- [ ] **Wait for CI:** **BẬT** — chỉ deploy sau khi GitHub Actions (`.github/workflows/ci.yml`) pass, tránh staging chạy code chưa qua CI.

## 2. Service backend — Build

- [ ] **Builder:** `Dockerfile`.
- [ ] **Dockerfile Path:** `apps/backend/Dockerfile` (relative to repo root, vì Root Directory để trống).
- [ ] **Custom Build Command:** để **trống** — build đã nằm trong chính Dockerfile (`RUN pnpm --filter @novaway/shared-types build` rồi `RUN pnpm --filter @novaway/backend build`); điền command ở đây có thể xung đột hoặc bị bỏ qua tuỳ builder, không cần thiết.
- [ ] **Custom Start Command:** để **trống** — Dockerfile đã có `CMD ["node", "dist/main.js"]`.
- [ ] **Watch Paths:** thêm CẢ HAI pattern:
  - `/apps/backend/**`
  - `/packages/shared-types/**` — **bắt buộc**, backend import trực tiếp package này; thiếu pattern này thì sửa `shared-types` mà không đụng `apps/backend` sẽ không trigger redeploy dù code đã đổi thật.

## 3. Service backend — Deploy

- [ ] **Healthcheck Path:** `/health` (không có prefix `/api` — xem `apps/backend/src/main.ts` loại trừ `health` khỏi global prefix).
- [ ] **Restart Policy:** giữ mặc định `On Failure`, số lần retry mặc định là đủ cho staging.
- [ ] **Serverless:** để tắt — realtime WebSocket cần service chạy liên tục, không phù hợp scale-to-zero.
- [ ] **Teardown:** để tắt (mặc định) trừ khi có lý do cụ thể.

## 4. PostgreSQL/PostGIS service

- [ ] Thử tạo **Database → PostgreSQL** trước.
- [ ] Verify PostGIS: chạy `SELECT * FROM pg_extension WHERE extname = 'postgis';` qua query console của Railway. Nếu rỗng → template không có PostGIS.
- [ ] Nếu không có PostGIS: xoá service đó, tạo **Empty Service → Docker Image** với image `postgis/postgis:16-3.4-alpine` (đúng image dùng ở `docker-compose.yml` local), gắn volume để giữ data.
- [ ] Gắn `DATABASE_URL` cho backend bằng **variable reference** tới service Postgres (không gõ tay connection string).

## 5. Environment Variables — Backend service

Chỉ nhập trực tiếp trên Dashboard, không gửi giá trị thật vào chat/commit vào repo:

- [ ] `DATABASE_URL` — variable reference tới service Postgres/PostGIS
- [ ] `NODE_ENV=production`
- [ ] `PORT` — **không cần set tay**, Railway tự inject, `main.ts` đã đọc qua `configService.get<number>('PORT', 3000)`
- [ ] `JWT_SECRET` — random string ≥16 ký tự
- [ ] `JWT_EXPIRES_IN` — vd. `7d`
- [ ] `WEB_ORIGIN` — điền sau khi có domain web staging thật (bước 7)
- [ ] `ROUTING_PROVIDER` — khuyến nghị giữ `mock` cho staging
- [ ] `ROUTING_ENGINE_BASE_URL`, `ROUTING_ENGINE_TIMEOUT_MS` — chỉ cần nếu `ROUTING_PROVIDER=osrm`
- [ ] `VERIFICATION_VALIDITY_MINUTES`

## 6. Generate domain

- [ ] Service backend → Settings → Networking → **Generate Domain**.
- [ ] Ghi lại domain (`*.up.railway.app`) — dùng để verify ở mục 8 và set biến frontend.

## 7. Web staging (ngoài Railway)

Theo quyết định đã chốt: **không** tạo/deploy service `@novaway/web` trên Railway — web host trên Vercel/Netlify/Cloudflare Pages, tách riêng khỏi backend.

- [ ] Chọn provider tĩnh (Vercel/Netlify/Cloudflare Pages) — **NEED_USER_DECISION**, chưa chọn cụ thể provider nào ở bước này.
- [ ] Set biến `VITE_API_BASE_URL=https://<backend-domain>/api` trên provider đó.
- [ ] **Lưu ý:** repo hiện **không có** biến `VITE_WS_URL` hay bất kỳ kết nối `socket.io-client` nào trong `apps/web` — dashboard web (`LiveMapPage`) hiện dùng mock GPS sender phía client (`useMockGpsSender.ts`), chưa thật sự kết nối tới `/realtime` gateway của backend. Đây là gap đã ghi ở `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §7 (mobile cockpit thiếu map — tương tự, web dashboard cũng chưa nối WebSocket thật). Không thêm biến `VITE_WS_URL` vào lúc này vì code chưa đọc biến đó — thêm sẽ là biến chết.

## 8. Verify sau khi deploy (URL thật)

Gửi domain backend thật cho tôi (Claude), tôi sẽ verify:

- [ ] `GET https://<backend-domain>/health` → `200`, `{"status":"ok","database":{"status":"ok"}}`.
- [ ] Migration đã chạy đủ 9 migration (`apps/backend/src/database/migrations/`).
- [ ] PostGIS thật hoạt động (test qua 1 trip có GPS thật, không chỉ `SELECT 1`).
- [ ] WebSocket `wss://<backend-domain>/realtime` — connect bằng `socket.io-client` với JWT thật từ `POST /api/auth/login`, gửi `location:update`, xác nhận broadcast.
- [ ] CORS đúng khi gọi từ domain web staging thật.
- [ ] `GET /metrics` trả đúng Prometheus format.
- [ ] Logs không crash-loop, không lộ secret plaintext.

## 9. Risk & Rollback (tham chiếu nhanh)

Chi tiết đầy đủ ở `RAILWAY_STAGING_PLAN.md` §"Risk & Rollback". Tóm tắt:

- Deploy fail → Railway giữ deployment trước, dùng nút Rollback trong tab Deployments.
- Migration fail → kiểm tra bảng `migrations` trong Postgres, sửa nguyên nhân, chạy lại — không tự `synchronize`.
- WebSocket fail → kiểm tra `wss://` (không phải `ws://`), kiểm tra Railway không cắt idle connection sớm hơn dự kiến.
- CORS fail → `WEB_ORIGIN` phải khớp chính xác domain web (kể cả scheme, không dấu `/` cuối).
- Healthcheck fail → kiểm tra `DATABASE_URL` reference đúng service Postgres, network cùng project thông nhau.
