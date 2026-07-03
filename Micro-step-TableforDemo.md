# NovaWay Demo - Micro-step Table

> ⚠️ **Source of truth**: Chi tiết từng step nằm tại `/demo/step-00` → `/demo/step-12` (mỗi step gồm README, BUILD_PROMPT, ACCEPTANCE_CRITERIA, TEST_CHECKLIST). Bảng này chỉ là index tổng quan, đã được đồng bộ với `/demo/` ngày 2026-07-03. Nếu có mâu thuẫn, tài liệu trong `/demo/` thắng.
>
> Nguyên tắc chung: **Clean Demo Foundation** — mock-only ở tính năng (GPS, Face ID, offline queue, cảnh báo địa hình) nhưng cấu trúc code tái sử dụng được cho project chính. Xem `docs/demo/DEMO_TO_PRODUCTION_BRIDGE.md`.

| Thứ tự | Step | AI đề xuất | Mục tiêu | Test gate chính | Commit |
| --- | --- | --- | --- | --- | --- |
| 0 | DEMO-00 Scope Lock | ChatGPT 5.5 / Claude | Chốt phạm vi demo + nguyên tắc Clean Demo Foundation | Có `/demo/DEMO_SCOPE_LOCK.md`, rõ mock/demo-only, rõ chiến lược git tái sử dụng | `docs: add NovaWay demo scope and git strategy` |
| 1 | DEMO-01 Web Setup | Codex / Sonnet 5 | React + Vite + TS + Tailwind + shadcn + Router theo IA cuối (`/dashboard`, `/start-trip`...) | dev + build pass; đủ `src/services|stores|mocks|config`; có `src/config/demo.ts` | `chore: add NovaWay web demo foundation with tailwind, shadcn, and router` |
| 2 | DEMO-02 Login Mock | Sonnet 5 | Login card + VRScannerLoading tái sử dụng | Login đúng -> loading 3.5s -> `/dashboard`; session giữ qua F5 | `feat: add premium login screen and global vr scanner loading` |
| 3 | DEMO-03 Face ID Simulation | Sonnet 5 (Opus 4.8 review contract) | Component `FaceScanner` 2 mode, giao tiếp bằng `onComplete` (KHÔNG tự navigate); wire mode `login_auth` vào Login | 2 mode chạy đúng; không có lệnh điều hướng trong component; login end-to-end tới `/dashboard` | `feat: add holographic face id simulator with context modes and vehicle auth logic` |
| 4 | DEMO-04 App Shell & Navigation | Sonnet 5 | Sidebar 6 menu + account dropdown + auth guard | Menu đổi route; logout về login; chặn truy cập khi chưa login | `feat: add app shell and navigation menu` |
| 5 | DEMO-05 Start Trip Flow | Sonnet 5 (Opus 4.8 review flow) | Orchestrator: chọn mode -> chọn xe -> FaceID (`vehicle_auth`) -> Cockpit placeholder, giữ nguyên URL `/start-trip` | 3 bước tuần tự mượt; FaceScanner qua `onComplete`; URL không đổi | `feat: add vertical accordion start trip flow` |
| 6 | DEMO-06 Driving Map Cockpit | Sonnet 5 | Map Leaflet bọc trong `TripMap`, HUD glassmorphism, `VrRadarOverlay` (prop `autoMode`) | Map full-screen không lỗi tiles; radar toggle chạy; nút kết thúc (đích tạm `/dashboard`) | `feat: add driving map cockpit with overlays and vr radar placeholder` |
| 7 | DEMO-07 Mock Realtime GPS | Sonnet 5 | `useTripStore` (Zustand, global) + engine nội suy 60fps + Demo Controls (Play/Pause/x1/x2/x5) | Xe trượt đúng polyline; speedometer đồng bộ; camera bám xe | `feat: add 60fps mock gps interpolation and demo playback controls` |
| 8 | DEMO-08 Offline Queue Mock | Sonnet 5 (Opus 4.8 review contract) | `useOfflineStore` + contract `addEvent()` (online->History, offline->Queue) + batch auto-sync 5 events/giây | Tắt mạng tạo event vào Queue; bật mạng tự sync theo lô; F5 không mất data | `feat: add background offline queue mock and batch auto-sync mechanism` |
| 9 | DEMO-09 Mobility Mismatch Warning | Sonnet 5 | Modal cam khi Xe máy >80km/h, auto-dismiss 10s, ghi audit log kèm tọa độ | Chỉ trigger cho xe máy, 1 lần; log xuất hiện ở `/offline-sync` | `feat: add mobility mismatch warning overlay and audit logging` |
| 10 | DEMO-10 AR Lite Terrain Scanner | Sonnet 5 | `VrRadarOverlay` autoMode luôn bật; hazards <50m -> HUD đỏ + giọng nói song ngữ + audit log | Qua 3-4 hazard đọc đúng tên, không kẹt giọng; log không spam | `feat: add auto ar hud scanner, omni-detection mock, and bilingual voice` |
| 11 | DEMO-11 Trip Summary & Protection | Sonnet 5 (Opus 4.8 review lifecycle) | Mini-player giữ chuyến đi khi navigate; Safety Score; màn hình Summary | Chuyến đi không reset khi đổi menu; điểm trừ khớp log; clear state khi về dashboard | `feat: add tech summary dashboard, safety score and trip mini-player` |
| 12 | DEMO-12 Polish & Pitching Prep | Sonnet 5 + ChatGPT 5.5 (script) | Polish 16:9, fix warnings, nút Reset Demo, gom magic numbers, chốt danh sách TODO(production) | Chạy 3 lần liên tục không crash; console sạch; build pass | `style: polish ui for 16-9 display, fix warnings and prepare for presentation` |

## Ghi chú flow quan trọng

- `FaceScanner` (DEMO-03) là component tái sử dụng, giao tiếp bằng props `mode` + callback `onComplete(result)`. Nó KHÔNG tự điều hướng route.
- DEMO-05 Start Trip Flow là orchestrator duy nhất của chuỗi: chọn mode -> chọn xe -> FaceID -> Cockpit. Toàn bộ diễn ra trong `/start-trip`, không đổi URL.
- Trạng thái chuyến đi nằm trong `useTripStore` (global từ DEMO-07) để DEMO-11 làm Trip Protection không phải refactor.
- Mọi event cảnh báo đi qua `addEvent()` của `useOfflineStore` (DEMO-08): online -> History, offline -> Queue.
