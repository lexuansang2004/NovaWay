# NovaWay D0.1 Documentation Pack v0.5

Bộ tài liệu này là kết quả chỉnh sửa sau các vòng đánh giá NotebookLM và các quyết định ban đầu của người dùng ở Step D0.1.

Mục tiêu của D0.1: **gom nguồn, đánh giá feedback, tách MVP/Post-MVP/R&D, ghi lại quyết định kỹ thuật ban đầu, và chuẩn bị dữ liệu đầu vào cho Step D0.2 - PRD/SRS Draft**.

## Files

| File | Mục đích |
|---|---|
| `docs/00_SOURCE_SUMMARY.md` | Tổng hợp vision và ý tưởng nguồn của NovaWay |
| `docs/01_OPEN_QUESTIONS.md` | Các câu hỏi còn cần chốt trước PRD/SRS final |
| `docs/02_NOTEBOOKLM_FEEDBACK_REVIEW.md` | Đánh giá lại feedback NotebookLM, giữ gì, sửa gì, loại gì |
| `docs/03_REQUIREMENT_DELTA_V0_2.md` | Các yêu cầu bổ sung được chấp nhận sau feedback |
| `docs/04_TECH_DECISION_RECORD.md` | Quyết định kỹ thuật: backend, map, AR, sync, retention, simulator, security roadmap |
| `docs/05_MVP_SCOPE_DRAFT.md` | Bản tách MVP / Post-MVP / R&D |
| `docs/06_NEXT_STEP_D0_2_INPUT.md` | Input sạch để chuyển sang Step D0.2 viết PRD/SRS |
| `docs/07_MASTER_PROMPT_D0_2.md` | Prompt đưa cho ChatGPT/Claude/Gemini/ChatPRD ở bước tiếp theo |
| `docs/08_D0_1_CHANGELOG_V0_3.md` | Tổng hợp thay đổi ở bản v0.3 |
| `docs/09_D0_1_CHANGELOG_V0_4.md` | Tổng hợp thay đổi ở bản v0.4 |
| `docs/10_D0_1_CHANGELOG_V0_5.md` | Tổng hợp thay đổi ở bản v0.5 |

## Quyết định hiện tại

- Tên dự án: **NovaWay**.
- Backend ưu tiên: **NestJS + TypeScript**.
- Database: **PostgreSQL + PostGIS**.
- Realtime live stream: **Socket.io/WebSocket**.
- Offline replay/sync: **REST Batch Upload `/api/trips/sync`**.
- Map: **OpenStreetMap data/ecosystem**, client ưu tiên **MapLibre GL JS**.
- Tile strategy: MVP/dev dùng **Protomaps hoặc Mapbox Free Tier candidate**; production/post-MVP cân nhắc self-host vector tiles.
- Public OSM tile server chỉ dùng demo nhỏ đúng policy, không dùng cho heavy production/offline prefetch.
- AR: **AR trong màn hình sử dụng phương tiện trên mobile/map**, không làm kính ảo/VR. MVP chỉ làm **AR Lite / overlay cảnh báo**, AR Mesh Grid sâu để R&D.
- Offline: mobile local queue; khi reconnect sync qua REST batch, không replay bằng WebSocket.
- Data retention: `trip_logs` lưu dài hạn, raw GPS events TTL 30 ngày.
- Testability: MVP có hidden Developer Mode/Simulator để test GPS route, mất mạng, thermal state, low-light state.
- Mobile background location: MVP cần thiết kế rõ foreground/background tracking, foreground service notification trên Android và Always Allow/background permission flow trên iOS khi cần theo dõi chuyến đi lúc khóa màn hình.
- Reconnect resilience: WebSocket reconnect phải dùng exponential backoff with jitter để tránh thundering herd.
- Offline batch sync: `/api/trips/sync` giới hạn batch tối đa 500 events/payload; mobile phải chunk local queue nếu vượt giới hạn.
- Batch partial success response: MVP ưu tiên `200 OK` kèm payload `{ accepted, duplicate_count, failed_events[] }`; `207 Multi-Status` chỉ là option nếu team muốn semantic HTTP rõ hơn.
- Code steps reminder: Step 3.1 phải ghi rõ reconnect policy contract; Step 4.3 phải implement Foreground/Background Location Service và Exponential Backoff with Jitter.
- Driver-friendly warning UI: cảnh báo sai lệch phương tiện là overlay rõ, 1 chạm, auto-dismiss sau 10 giây.
- Security roadmap: MVP có auth/rate limit/validation/idempotency; App Attestation để Post-MVP.
- Chưa code ở D0.1.

## Git gợi ý

```bash
git checkout develop
git pull origin develop
git checkout -b docs/project-requirements

# copy bộ docs này vào repo

git add .
git commit -m "docs: update D0.1 requirements with mobile resilience edge cases"
git push -u origin docs/project-requirements
```
