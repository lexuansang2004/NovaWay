# NovaWay — Vercel Web Dashboard Checklist (R1-2/R1-3 follow-up)

> Thao tác thủ công trên Vercel Dashboard — không dùng Vercel CLI. Host `apps/web` (staging) tách khỏi Railway (chỉ dùng cho backend + PostgreSQL/PostGIS), theo đúng quyết định đã chốt ở [`RAILWAY_STAGING_PLAN.md`](./RAILWAY_STAGING_PLAN.md) §3.
>
> **Trạng thái:** Đã deploy thành công và verify đầy đủ. Domain thật: `https://nova-way-web.vercel.app`.

## 0. Điều kiện tiên quyết

- [x] `apps/web/vercel.json` tồn tại — rewrite toàn bộ path về `/index.html` để React Router (client-side routing) hoạt động đúng khi truy cập trực tiếp/refresh vào route con (vd. `/dashboard`, `/vehicles`), tránh 404.
- [x] Backend đã deploy thật trên Railway: `https://novawaybackend-production.up.railway.app`.

## 1. Tạo project trên Vercel

- [x] Import repo `lexuansang2004/NovaWay` từ GitHub.
- [x] **Root Directory:** chọn `apps/web` — qua UI chọn file-tree (bấm **Edit** cạnh Root Directory → duyệt `apps → web` → **Continue**). Vercel phiên bản hiện tại **không có** checkbox "Include source files outside Root Directory" riêng như bản cũ hơn — việc thấy được `packages/shared-types`/`pnpm-workspace.yaml` được xử lý tự động khi chọn Root Directory qua file-tree picker này (đã verify: build thành công, resolve đúng `@novaway/shared-types`).
- [x] **Branch:** `develop` (mặc định ban đầu hiện `main` — đã đổi lại đúng `develop` trước khi Deploy, xác nhận qua dòng "Importing from GitHub... develop").
- [x] Project Name: `nova-way-web`.
- [x] Application Preset: `Vite` (tự nhận diện).

## 2. Build & Output Settings

- [x] **Build Command:** bật override, đã nhập:
  ```
  pnpm --filter @novaway/shared-types build && pnpm --filter @novaway/web build
  ```
- [x] **Output Directory:** bật override, `dist`.
- [x] **Install Command:** để mặc định (tắt override) — Vercel tự nhận `packageManager: pnpm@11.14.0`.

## 3. Environment Variables

- [x] `VITE_API_BASE_URL` = `https://novawaybackend-production.up.railway.app/api` — set cho **Production and Preview**.
- [ ] `VITE_WS_BASE_URL` = `https://novawaybackend-production.up.railway.app` (không có `/api`) — thêm ở R2-1 (07/2026, `LiveMapPage` nối `/realtime` WebSocket thật), **chưa set trên Vercel** — cần làm trước khi deploy `develop` mới nhất lên production thật.
- [ ] `VITE_PROTOMAPS_API_KEY` — thêm ở R2-3 (07/2026, migrate `TripMap` sang MapLibre + Protomaps), lấy key miễn phí tại [protomaps.com/account](https://protomaps.com/account). **Chưa set trên Vercel** — cần làm trước khi deploy, nếu không bản đồ sẽ không hiển thị tile (marker/UI vẫn hoạt động, chỉ tile nền lỗi 401/403). Lưu ý: key có thể bị giới hạn theo origin — xác nhận domain Vercel thật (`nova-way-web.vercel.app`) được phép khi tạo/kiểm tra key.

## 4. Deploy

- [x] Deploy lần đầu **thành công** — build pass, trang login render đúng nội dung thật ngay trong preview thumbnail của Vercel.
- [x] **Lưu ý đã gặp:** trang "Congratulations" sau deploy có gợi ý "Deploy another project — `/apps/backend` — Nest.JS project" (Vercel tự phát hiện thêm 1 app deploy được trong repo) — **đã bỏ qua**, không bấm Deploy ở đó vì backend đã chạy trên Railway, không cần bản backend thứ 2 trên Vercel.
- [x] Domain thật: **`https://nova-way-web.vercel.app`**, deploy từ commit `bb2f868` (PR #12) trên `develop`, status Ready.

## 5. Verify sau khi deploy (URL thật) — ĐÃ THỰC HIỆN

- [x] Trang `/login` load được, không lỗi console.
- [x] Đăng nhập thật (tài khoản test tạo lúc verify Railway) → vào được `/dashboard`, hiển thị đúng email user.
- [x] Điều hướng trực tiếp vào `/trip-history` (qua trình duyệt thật, không phải chỉ curl status) → không bị 404, session giữ nguyên — xác nhận `vercel.json` rewrite hoạt động đúng.
- [x] Gọi API thật tới backend Railway — **lần đầu bị lỗi `Failed to fetch`** (CORS, vì `WEB_ORIGIN` trên backend chưa cập nhật) → sau khi làm bước 6, verify lại thành công.

## 6. Cập nhật CORS trên backend (Railway) — ĐÃ XONG

Đã điền trên Railway → `@novaway/backend` → Variables:

```
WEB_ORIGIN = https://nova-way-web.vercel.app
```

Service tự redeploy, verify lại đăng nhập qua trình duyệt thật → thành công, hết lỗi CORS.

## 7. Chạy E2E nhắm vào staging thật — ĐÃ CHẠY PASS

Đã chạy thật với:

```
E2E_WEB_BASE_URL=https://nova-way-web.vercel.app
E2E_API_BASE_URL=https://novawaybackend-production.up.railway.app/api
E2E_WS_BASE_URL=https://novawaybackend-production.up.railway.app
```

```
E2E_WEB_BASE_URL=... E2E_API_BASE_URL=... E2E_WS_BASE_URL=... npx playwright test --project=chromium
```

**Kết quả: pass (13.4s)** — đúng luồng vàng đầy đủ (đăng nhập → chọn/kích hoạt xe → start trip → gửi GPS qua WebSocket thật → end trip → thấy trên Analytics), tất cả nhắm vào staging thật (Vercel + Railway), không phải local. Đây chính là yêu cầu gốc "E2E suite pass trên môi trường staging" của `docs/TEST_STRATEGY.md` §3.

**Chưa làm:** tự động hoá bước này trong CI (job `e2e` hiện tại chỉ chạy nhắm Postgres/backend dựng trong runner, không nhắm staging) — xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §2.
