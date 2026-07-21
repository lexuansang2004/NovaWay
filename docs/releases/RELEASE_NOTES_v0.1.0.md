# NovaWay — Release Notes v0.1.0 (MVP Baseline)

> Tag: `v0.1.0-mvp-baseline` trên `main`. Đóng mốc sau khi hoàn tất `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` step `0.2` → `9.2`, trừ step `8.1` (AR terrain prototype) đang **hoãn** — xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`.

## 1. Phạm vi MVP đã hoàn tất

### Backend (`apps/backend`, NestJS + TypeScript + PostgreSQL/PostGIS)

| Step | Tính năng |
|---|---|
| `1.1` | Health check, env validation (`@nestjs/config` + Joi) |
| `1.2` | Migration `users`, `vehicles` |
| `1.3` | Auth: register/login/me, JWT guard |
| `1.4` | Vehicle CRUD + active vehicle, ownership guard |
| `1.5` | Vehicle Authorization (chủ xe uỷ quyền người mượn có thời hạn) |
| `1.6` | Biometric Verification API (mock provider, không lưu ảnh thô) |
| `3.1` | Realtime WebSocket Gateway (`/realtime`) — nhận, validate, ghi, broadcast vị trí GPS; idempotency qua `gps_event_dedup` |
| `5.1` | Routing mock theo loại phương tiện (motorbike/car khác tốc độ giả lập) |
| `5.2` | Tích hợp routing engine thật (OSRM public demo, dev/test only) với fallback tự động về mock |
| `6.1` | Vehicle Mismatch Detection — rule tốc độ bất thường sinh cảnh báo, không tự khoá tài khoản |
| `7.1` | Trip Logs API — start/end/list/detail, tính distance/duration/warning-count thật từ GPS |
| `9.1` | Observability baseline — `GET /health` (kèm kiểm tra Postgres), `GET /metrics` (Prometheus text format), structured logging |
| `9.2` | CI pipeline — GitHub Actions lint/test/build gate cho mọi PR vào `develop`/`main` |

### Web Dashboard (`apps/web`, React + Vite + Tailwind)

| Step | Tính năng |
|---|---|
| `2.1` | App shell, sidebar, auth UI (mock ban đầu) |
| `2.2` | Kết nối auth thật với backend (login/session/logout) |
| `2.3` | Quản lý phương tiện (CRUD + kích hoạt xe) |
| `3.2` | Live map — marker di chuyển realtime (mock GPS sender phía client) |
| `7.2` | Trip Analytics Dashboard — biểu đồ quãng đường/thời gian/cảnh báo, lọc theo loại xe |

### Mobile (`apps/mobile`, Flutter)

| Step | Tính năng |
|---|---|
| `4.1` | App shell, navigation, màn hình login/register |
| `4.2` | Auth thật + chọn phương tiện (chủ xe hoặc xe được uỷ quyền) |
| `4.3` | Gửi GPS thật qua WebSocket (quyền vị trí, start/stop, xử lý mất kết nối) |

### Chia sẻ

- `packages/shared-types` — type dùng chung backend ↔ web (TypeScript). Mobile không dùng package này — hợp đồng là `docs/API_CONTRACT.md`.

## 2. Đã hoãn (không thuộc phạm vi v0.1.0)

- **Step `8.1` — AR Terrain Mesh Prototype (Unity/AR Foundation).** Cần Unity + thiết bị AR thật để đo test gate (FPS/nhiệt/pin/ánh sáng yếu) — môi trường phát triển không có. Đây là nhánh R&D tách biệt hoàn toàn khỏi `apps/mobile` theo thiết kế gốc (`docs/ARCHITECTURE.md` TDR-003), không chặn phần còn lại của MVP. Chi tiết: `docs/REVIEW_NOTES.md` §15, `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`.
- **E2E-on-staging test gate** (`docs/TEST_STRATEGY.md` §3, yêu cầu cho merge vào `main`). Chưa có E2E suite nào (Playwright/Cypress/Flutter integration test) và chưa chốt môi trường staging. CI hiện tại (`9.2`) chỉ gồm lint + unit test + build.

Chi tiết đầy đủ và các mục còn mở khác (tile provider, biometric provider thật, rate limiting, hosting): xem `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md`.

## 3. Cách chạy local

```bash
# Backend + web + shared-types
pnpm install
docker compose up -d          # Postgres/PostGIS, xem docker-compose.yml
pnpm --filter @novaway/backend migration:run
pnpm --filter @novaway/backend start:dev   # hoặc: build rồi node dist/main.js
pnpm --filter @novaway/web dev

# Mobile
cd apps/mobile && flutter pub get && flutter run -d windows
```

Biến môi trường: xem `apps/backend/.env.example`, `apps/web/.env.example`.

## 4. Test gate

- `pnpm -r lint` / `pnpm -r test` / `pnpm -r build` — tất cả pass (93 unit test backend).
- `flutter analyze` / `flutter test` — tất cả pass (16 test).
- CI (`GitHub Actions`) chạy trên mọi PR vào `develop`/`main` — xem `.github/workflows/ci.yml`.
- Mỗi micro-step đã được verify thật (không chỉ unit test) trong quá trình phát triển: curl/socket.io session thật với backend + Postgres thật, browser automation cho web, `flutter run -d windows` cho mobile. Chi tiết từng bước nằm trong lịch sử commit và `docs/REVIEW_NOTES.md`.

## 5. Tài liệu tham khảo

- `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` — roadmap micro-step đầy đủ.
- `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/API_CONTRACT.md` — kiến trúc & hợp đồng API.
- `docs/architecture/TDR-routing-engine.md` — quyết định routing engine (OSRM dev/test + fallback mock).
- `docs/OBSERVABILITY.md` — health/metrics/logging, checklist debug.
- `docs/REVIEW_NOTES.md` — lịch sử tự rà soát và các quyết định sửa lỗi trong quá trình phát triển.
- `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` — việc còn lại sau MVP.
