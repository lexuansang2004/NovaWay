# NovaWay — Railway Dashboard Checklist (R1-2)

> Thao tác thủ công trên Railway Dashboard — không dùng Railway CLI. Đi kèm [`RAILWAY_STAGING_PLAN.md`](./RAILWAY_STAGING_PLAN.md) (quyết định + kiến trúc tổng thể). Tài liệu này là checklist thao tác cụ thể, cập nhật theo cấu hình thật đã thấy trên Dashboard khi thực hiện R1-2.
>
> **Trạng thái:** Backend đã deploy thành công lên staging và verify đầy đủ (xem §8). Domain thật: `https://novawaybackend-production.up.railway.app`.

## 0. Điều kiện tiên quyết

- [x] `apps/backend/Dockerfile` tồn tại, đã verify build + boot local bằng `docker build`/`docker run` thật (xem log verify trong PR `chore/railway-dockerfile`).
- [x] `.dockerignore` loại trừ `node_modules`, `**/dist`, `**/*.tsbuildinfo`, `apps/mobile/build`, `demo-app`, `.git`, secrets.
- [x] Project Railway đã tạo, service `@novaway/backend` đã kết nối tới repo `lexuansang2004/NovaWay`.

## 1. Service backend — Source

- [x] **Root Directory:** để **trống** (không set) — bắt buộc, vì Dockerfile cần build context là repo root để thấy `packages/shared-types`.
- [x] **Branch connected to production:** `develop`.
- [x] **Wait for CI:** **BẬT** — chỉ deploy sau khi GitHub Actions pass, tránh staging chạy code chưa qua CI. **⚠️ Lưu ý quan trọng (phát hiện thật ở R2-7):** cài đặt này chờ **TẤT CẢ** GitHub Actions chạy trên commit đó (Railway UI ghi "Trigger deployments after all GitHub actions have completed successfully") — không cho chọn check cụ thể. Vì vậy **bất kỳ workflow nào trigger trên `push` tới `develop` đều trở thành một phần gate này**. `.github/workflows/e2e-staging.yml` (R2-5) ban đầu trigger trên `push` đã gây deadlock thật: job đó luôn chạy trước khi Railway deploy xong nên luôn fail, khiến Railway skip deploy vĩnh viễn ("CI check suite failed") — staging bị kẹt ở code cũ qua nhiều lần merge liên tiếp mà không ai biết. Đã sửa bằng cách đổi `e2e-staging.yml` sang trigger theo lịch (cron) thay vì `push` — xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §2/§6. **Bài học:** không thêm workflow mới trigger trên `push: branches: [develop]` nếu chưa xác nhận nó luôn pass ngay tức thời sau push, nếu không sẽ lặp lại deadlock này.

## 2. Service backend — Build

- [x] **Builder:** `Dockerfile`.
- [x] **Dockerfile Path:** `apps/backend/Dockerfile` (relative to repo root, vì Root Directory để trống).
- [x] **Custom Build Command:** để **trống** — build đã nằm trong chính Dockerfile (`RUN pnpm --filter @novaway/shared-types build` rồi `RUN pnpm --filter @novaway/backend build`).
- [x] **Custom Start Command:** để **trống** — Dockerfile đã có `CMD ["node", "dist/main.js"]`. **Quan trọng:** runtime stage của Dockerfile không cài `pnpm` (chỉ build stage có `corepack enable`) — nếu điền command dùng `pnpm` ở đây, container sẽ crash `pnpm: not found`.
- [x] **Watch Paths:** cả 2 pattern đã thêm:
  - `/apps/backend/**`
  - `/packages/shared-types/**`

## 3. Service backend — Deploy

- [x] **Healthcheck Path:** `/health` (không có prefix `/api`).
- [x] **Pre-deploy Command:** `node ./node_modules/typeorm/cli-ts-node-commonjs.js -d src/database/data-source.ts migration:run` — chạy trực tiếp qua `node`, **không dùng `pnpm`** (cùng lý do runtime không có pnpm). Đã verify chạy thành công (migration pass trước khi app start).
- [x] **Restart Policy:** giữ mặc định `On Failure`, 10 retries.
- [x] **Serverless:** tắt.
- [x] **Teardown:** tắt (mặc định).

## 4. PostgreSQL/PostGIS service

- [x] Thử tạo **Database → PostgreSQL** (template mặc định) trước — **kết quả: KHÔNG có PostGIS** (`CREATE EXTENSION postgis` báo lỗi `extension "postgis" is not available`). Đã xoá service này.
- [x] Tạo lại bằng **Empty Service → Docker Image** với image `postgis/postgis:16-3.4-alpine` — verify PostGIS thành công (`extversion: 3.4.3`).
- [x] Gắn Volume, mount path `/var/lib/postgresql/data`.
- [x] Set biến `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — **bắt buộc điền tay**, service Docker Image tự do (không phải plugin Postgres chính thức của Railway) **không tự có** các biến này, khác với template mặc định.
- [x] Gắn `DATABASE_URL` cho backend bằng **variable reference**, dạng: `postgres://${{<service>.POSTGRES_USER}}:${{<service>.POSTGRES_PASSWORD}}@${{<service>.RAILWAY_PRIVATE_DOMAIN}}:5432/${{<service>.POSTGRES_DB}}`.

**Lưu ý tên service thật:** Railway tự đặt tên ngẫu nhiên cho Empty Service (không dùng tên image) — trong lần triển khai này service PostGIS thật sự tên là **`pretty-insight`** (không phải `postgis`). Luôn dùng đúng tên hiển thị trên tab của service đó khi viết reference `${{ServiceName.VAR}}`, không giả định theo tên image.

- [x] **Dọn dẹp:** service `postgis` đầu tiên (tạo nhầm ở project `supportive-quietude`, xem sự cố #2 ở §10) đã **xoá hẳn** — không còn được `@novaway/backend` tham chiếu tới, không có dữ liệu cần giữ.

## 5. Environment Variables — Backend service

Chỉ nhập trực tiếp trên Dashboard, không gửi giá trị thật vào chat/commit vào repo:

- [x] `DATABASE_URL` — variable reference tới service PostGIS (xem §4).
- [x] `NODE_ENV=production`
- [x] `PORT` — không set tay, Railway tự inject.
- [x] `JWT_SECRET` — random string ≥16 ký tự.
- [x] `JWT_EXPIRES_IN=7d`
- [x] `WEB_ORIGIN=https://nova-way-web.vercel.app` — đã điền sau khi web deploy xong (§7), CORS xác nhận hoạt động qua trình duyệt thật.
- [x] `ROUTING_PROVIDER=mock`
- [ ] `ROUTING_ENGINE_BASE_URL`, `ROUTING_ENGINE_TIMEOUT_MS` — không cần, `ROUTING_PROVIDER=mock`.
- [x] `VERIFICATION_VALIDITY_MINUTES=5`

**Cảnh báo quan trọng:** nếu 1 biến bắt buộc theo `.uri()` (như `WEB_ORIGIN`) **tồn tại nhưng để giá trị rỗng** (`""`), Joi validate sẽ **fail** vì `default(...)` chỉ áp dụng khi biến hoàn toàn không tồn tại, không áp dụng khi biến có mặt nhưng rỗng. Muốn dùng default, phải **xoá hẳn** biến đó, không để rỗng.

## 6. Generate domain

- [x] Service backend → Settings → Networking → **Generate Domain**.
- [x] Domain thật: **`https://novawaybackend-production.up.railway.app`** (domain chỉ thật sự active sau lần deploy thành công đầu tiên — trước đó chỉ hiện placeholder "Public domain will be generated").

## 7. Web staging (ngoài Railway)

Theo quyết định đã chốt: **không** deploy `apps/web` trên Railway — host trên Vercel/Netlify/Cloudflare Pages, tách riêng khỏi backend.

- [x] Chọn provider tĩnh — đã chọn **Vercel**. Chi tiết: `docs/deployment/VERCEL_WEB_CHECKLIST.md`.
- [x] Set biến `VITE_API_BASE_URL=https://novawaybackend-production.up.railway.app/api` trên Vercel.
- [x] Sau khi có domain web thật, quay lại điền `WEB_ORIGIN` trên backend (§5) cho đúng CORS.
- [x] **Dọn dẹp:** service `@novaway/web` từng bị tạo nhầm trên Railway lúc đầu (leftover, cấu hình `Builder: DOCKERFILE` dù không có Dockerfile, `Start Command` dùng `dev` — sai hoàn toàn cho production) — đã bị loại khỏi lô deploy đầu tiên bằng "Discard", và đã **xoá hẳn** khỏi project `patient-stillness`.
- [x] **Lưu ý:** repo hiện **không có** biến `VITE_WS_URL` hay bất kỳ kết nối `socket.io-client` nào trong `apps/web` — dashboard web (`LiveMapPage`) hiện dùng mock GPS sender phía client (`useMockGpsSender.ts`), chưa thật sự kết nối tới `/realtime` gateway của backend. Đây là gap đã ghi ở `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §9. Không thêm biến `VITE_WS_URL` vì code chưa đọc biến đó.
- [x] **Domain web thật:** `https://nova-way-web.vercel.app` — deploy xong, verify CORS + SPA routing + E2E suite pass thật. Chi tiết: `docs/deployment/VERCEL_WEB_CHECKLIST.md`.

## 8. Verify sau khi deploy — ĐÃ THỰC HIỆN (trên URL thật)

- [x] `GET https://novawaybackend-production.up.railway.app/health` → `200`, `{"status":"ok","database":{"status":"ok"}}`.
- [x] Migration đã chạy đủ (Pre-deploy Command pass, không lỗi).
- [x] PostGIS extension active trên DB thật (`extversion: 3.4.3`, verify qua `pg_extension`).
- [x] Auth thật: `POST /api/auth/register` → `201`, `POST /api/auth/login` → JWT thật, đều chạy qua Postgres thật.
- [x] WebSocket `wss://novawaybackend-production.up.railway.app/realtime` — connect thành công bằng `socket.io-client` thật với JWT thật từ login.
- [x] `GET /metrics` → `200`, đúng format Prometheus.
- [x] Logs không crash-loop sau khi sửa xong các lỗi (xem §10), không thấy secret plaintext trong log (Railway tự redact).
- [x] CORS từ domain web staging thật (`nova-way-web.vercel.app`) — đã test qua trình duyệt thật (login), thành công. E2E suite cũng đã chạy pass nhắm thẳng vào domain này.
- [ ] PostGIS ở mức "1 trip có GPS thật" (route_geometry qua `ST_MakeLine`) — mới verify extension active, chưa tạo trip thật qua API để test geometry function cụ thể. Nên làm khi bắt đầu R1-3 (E2E suite).

## 9. Risk & Rollback (tham chiếu nhanh)

Chi tiết đầy đủ ở `RAILWAY_STAGING_PLAN.md` §"Risk & Rollback". Tóm tắt:

- Deploy fail → Railway giữ deployment trước, dùng nút Rollback trong tab Deployments.
- Migration fail → kiểm tra bảng `migrations` trong Postgres, sửa nguyên nhân, chạy lại — không tự `synchronize`.
- WebSocket fail → kiểm tra `wss://` (không phải `ws://`), kiểm tra Railway không cắt idle connection sớm hơn dự kiến.
- CORS fail → `WEB_ORIGIN` phải khớp chính xác domain web (kể cả scheme, không dấu `/` cuối, không để rỗng — xem cảnh báo ở §5).
- Healthcheck fail → kiểm tra `DATABASE_URL` reference đúng service Postgres, đúng project (xem §10).

## 10. Sự cố thực tế đã gặp trong lần triển khai đầu — rút kinh nghiệm

Ghi lại để không lặp lại khi tạo staging mới hoặc mở rộng sang môi trường khác:

1. **Volume mount root gây lỗi `initdb`:** gắn Volume thẳng vào `/var/lib/postgresql/data` khiến Postgres thấy thư mục `lost+found` do cơ chế mount tạo sẵn, từ chối init (`directory exists but is not empty`). **Fix:** thêm biến `PGDATA=/var/lib/postgresql/data/pgdata` (thư mục con bên trong volume), giữ nguyên mount path.
2. **Reference variable khác PROJECT resolve ra rỗng, không báo lỗi rõ:** `${{ServiceName.VAR}}` chỉ hoạt động giữa các service **cùng một Railway project**. Nếu backend và Postgres nằm ở 2 project khác nhau, Railway âm thầm trả về chuỗi rỗng cho mỗi reference (không throw lỗi lúc nhập), khiến `DATABASE_URL` cuối cùng chỉ còn khung rỗng (`postgres://:@:5432/`) — lỗi xuất hiện muộn, dạng `Invalid URL` hoặc Joi `must be a valid uri`, dễ nhầm là lỗi cú pháp/ký tự đặc biệt trong password. **Cách chẩn đoán nhanh:** in `DATABASE_URL.length` + kiểm tra còn chứa `${{` hay không qua 1 lệnh Node an toàn (không lộ secret) trước khi đoán các nguyên nhân khác. **Fix:** đảm bảo mọi service cần tham chiếu lẫn nhau nằm chung 1 project.
3. **Empty Service (Docker Image tự do) không tự có biến như plugin chính thức:** service Postgres tạo qua "Empty Service → Docker Image" **không tự sinh** `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`/`DATABASE_URL` như plugin Postgres chính thức của Railway — phải tự set tay, và nếu để trống (không xoá hẳn, chỉ để rỗng) sẽ gây lỗi khó hiểu tương tự mục 2.
4. **Biến bắt buộc để giá trị rỗng thay vì xoá hẳn:** `WEB_ORIGIN` (có `.default()` trong Joi schema) từng để `<empty string>` thay vì xoá — Joi validate giá trị hiện có (rỗng) thay vì áp dụng default, gây crash bootstrap ngay lập tức. Bài học: muốn dùng giá trị default của app, phải xoá hẳn biến, không để rỗng.
5. **`Custom Build/Start Command` xung đột với Dockerfile builder:** để sẵn `pnpm --filter ... build`/`pnpm --filter ... dev` trong 2 field này (leftover từ lúc mới tạo service) trong khi Builder đã chọn Dockerfile — runtime stage của Dockerfile không có `pnpm`, nên nếu field Start Command ghi đè `CMD` gốc sẽ crash `pnpm: not found`. Bài học: khi dùng Dockerfile builder, để trống cả 2 field này, để Dockerfile tự quyết định build/start.
