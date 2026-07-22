# NovaWay — Vercel Web Dashboard Checklist (R1-2/R1-3 follow-up)

> Thao tác thủ công trên Vercel Dashboard — không dùng Vercel CLI. Host `apps/web` (staging) tách khỏi Railway (chỉ dùng cho backend + PostgreSQL/PostGIS), theo đúng quyết định đã chốt ở [`RAILWAY_STAGING_PLAN.md`](./RAILWAY_STAGING_PLAN.md) §3.

## 0. Điều kiện tiên quyết

- [x] `apps/web/vercel.json` tồn tại — rewrite toàn bộ path về `/index.html` để React Router (client-side routing) hoạt động đúng khi truy cập trực tiếp/refresh vào route con (vd. `/dashboard`, `/vehicles`), tránh 404.
- [x] Backend đã deploy thật trên Railway: `https://novawaybackend-production.up.railway.app`.

## 1. Tạo project trên Vercel

1. Vercel Dashboard → **Add New → Project**.
2. Import repo `lexuansang2004/NovaWay` (kết nối GitHub nếu chưa).
3. **Root Directory:** bấm **Edit** → chọn `apps/web` — bắt buộc, vì đây là monorepo.
4. Bấm **"Include source files outside of the Root Directory in the Build Step"** (checkbox này nằm ngay dưới Root Directory) → **BẬT**. **Bắt buộc**, thiếu bước này build sẽ fail vì không thấy được `packages/shared-types` hay `pnpm-workspace.yaml`/`pnpm-lock.yaml` ở repo root.

## 2. Build & Output Settings

- [ ] **Framework Preset:** chọn `Vite` (Vercel thường tự nhận diện qua `apps/web/package.json`).
- [ ] **Build Command:** bật override, nhập:
  ```
  pnpm --filter @novaway/shared-types build && pnpm --filter @novaway/web build
  ```
  (Build tường minh 2 bước, đúng thứ tự — `@novaway/web` import `@novaway/shared-types`, cần build trước. Không dùng `pnpm build` mặc định của Vite framework preset vì nó không biết build package phụ thuộc trước.)
- [ ] **Output Directory:** `dist` (tương đối theo Root Directory `apps/web` — khớp `vite build` mặc định).
- [ ] **Install Command:** để mặc định (Vercel tự nhận `packageManager: pnpm@11.14.0` trong `package.json` root và chạy `pnpm install`).

## 3. Environment Variables

Chỉ 1 biến cần thiết cho `apps/web` (xem `apps/web/.env.example`):

- [ ] `VITE_API_BASE_URL` = `https://novawaybackend-production.up.railway.app/api`

Set ở **Project Settings → Environment Variables**, áp dụng cho môi trường **Production** (và **Preview** nếu muốn preview deploy cũng gọi được backend thật).

## 4. Deploy

1. Bấm **Deploy**.
2. Theo dõi **Build Logs** — nếu fail ngay ở bước cài đặt/`pnpm-workspace.yaml not found`, kiểm tra lại bước 1.4 (Include source files outside Root Directory) đã bật chưa.
3. Sau khi deploy xong, Vercel cấp domain dạng `*.vercel.app` — ghi lại domain thật.

## 5. Verify sau khi deploy (URL thật)

Gửi domain web thật cho tôi (Claude), tôi sẽ verify:

- [ ] Trang `/login` load được, không lỗi console.
- [ ] Đăng nhập thật (tài khoản test) → vào được `/dashboard`.
- [ ] Refresh trực tiếp vào 1 route con (vd. `/vehicles`) → không bị 404 (xác nhận `vercel.json` rewrite hoạt động).
- [ ] Gọi API thật tới backend Railway thành công (không lỗi CORS) — **cần bước 6 dưới đây trước**.

## 6. Cập nhật CORS trên backend (Railway)

Sau khi có domain web thật, quay lại Railway → `@novaway/backend` → Variables → điền:

```
WEB_ORIGIN = https://<domain-web-thật>.vercel.app
```

(Không để dấu `/` cuối, đúng scheme `https://`.) Trigger redeploy backend để áp dụng. Đây là bước còn thiếu duy nhất từ `RAILWAY_DASHBOARD_CHECKLIST.md` §5 (`WEB_ORIGIN` trước đó đã xoá để dùng default `http://localhost:5173` tạm thời).

## 7. Chạy E2E nhắm vào staging thật (sau khi bước 6 xong)

`apps/web/e2e/golden-path.spec.ts` đã hỗ trợ sẵn 3 biến môi trường để trỏ vào staging thay vì local:

```
E2E_WEB_BASE_URL=https://<domain-web-thật>.vercel.app
E2E_API_BASE_URL=https://novawaybackend-production.up.railway.app/api
E2E_WS_BASE_URL=https://novawaybackend-production.up.railway.app
```

Chạy: `E2E_WEB_BASE_URL=... E2E_API_BASE_URL=... E2E_WS_BASE_URL=... pnpm --filter @novaway/web test:e2e`. Việc này chưa wire vào CI (CI hiện chạy E2E nhắm Postgres/backend dựng ngay trong runner, không phải staging thật) — chạy thủ công trước, wire vào CI là việc riêng sau nếu cần.
