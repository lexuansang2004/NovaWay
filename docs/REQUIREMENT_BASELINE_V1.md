# NovaWay — Requirement Baseline v1.0

> Step D0.7. Tài liệu này là **điểm chốt**: xác nhận toàn bộ D0.1 → D0.6 đã đồng bộ, đóng các Open Questions bắt buộc, và tuyên bố Baseline v1.0 — mốc duy nhất cho phép bắt đầu code ở step `0.2 chore/repo-foundation` theo `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`.

## 1. Bộ tài liệu cấu thành Baseline v1.0

| Tài liệu | Vai trò |
|---|---|
| `docs/00_SOURCE_SUMMARY.md` → `docs/10_D0_1_CHANGELOG_V0_5.md` | D0.1 — nguồn gốc, feedback, quyết định kỹ thuật ban đầu (lịch sử, không chỉnh sửa thêm) |
| `docs/PRD.md` | D0.2 — vision, vấn đề, target user, MVP scope, out-of-scope, success metrics |
| `docs/SRS.md` | D0.2 — functional/non-functional requirements (`FR-*`/`NFR-*`) |
| `docs/USER_STORIES.md` | D0.2 — user stories theo vai trò, trace tới `FR-*` |
| `docs/ACCEPTANCE_CRITERIA.md` | D0.2 — điều kiện "xong" cho từng tính năng MVP |
| `docs/EDGE_CASES.md` | D0.2/D0.5 — tình huống biên, hành vi kỳ vọng |
| `docs/RISK_REGISTER.md` | D0.2/D0.5 — rủi ro kỹ thuật/sản phẩm/quy trình kèm mitigation |
| `docs/DATA_REQUIREMENTS.md` | D0.2 — yêu cầu dữ liệu mức khái niệm |
| `docs/API_REQUIREMENTS.md` | D0.2 — yêu cầu API mức khái niệm |
| `docs/TEST_STRATEGY.md` | D0.2 — chiến lược test theo level và theo feature |
| `docs/REVIEW_NOTES.md` | D0.5 — review vòng 1, gồm cả phát hiện lớn (biometric/authorization) và fix kỹ thuật (idempotency) |
| `docs/ARCHITECTURE.md` | D0.4 — kiến trúc monorepo, module backend, adapter pattern, luồng nghiệp vụ đầu-cuối |
| `docs/DATA_MODEL.md` | D0.4 — schema Postgres/PostGIS gần DDL thật |
| `docs/API_CONTRACT.md` | D0.4 — request/response contract cụ thể theo endpoint |
| `AGENTS.md` (repo root) | D0.4 — quy tắc bắt buộc cho AI agent khi code |
| `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` | Roadmap/phases — đã cập nhật step `1.5`/`1.6` theo quyết định D0.6 |

## 2. D0.6 — Quyết định của người dùng (đã áp dụng)

Người dùng đã duyệt và bổ sung một quyết định phạm vi quan trọng: đưa **Biometric Vehicle Binding** và **Vehicle Authorization** (tính năng đầu tàu của bản demo) chính thức vào MVP, với thứ tự triển khai ưu tiên nền tảng lõi (Auth/Vehicle/Trip/Realtime/Sync) trước. Quyết định này đã được áp dụng xuyên suốt `PRD.md`, `SRS.md`, `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md`, `EDGE_CASES.md`, `RISK_REGISTER.md`, `DATA_REQUIREMENTS.md`/`DATA_MODEL.md`, `API_REQUIREMENTS.md`/`API_CONTRACT.md`, `TEST_STRATEGY.md`, và micro-step plan (step `1.5`/`1.6`) — không còn tài liệu nào thiếu nhánh tính năng này.

## 3. Đóng Open Questions bắt buộc (theo `docs/01_OPEN_QUESTIONS.md` §4)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Mobile stack | ✅ Chốt: **Flutter** | OQ-001 đóng — không có lý do kỹ thuật mới để đổi hướng qua D0.2–D0.4 |
| Web dashboard MVP scope | ✅ Chốt | `PRD.md` §5, `MVP_SCOPE_DRAFT.md` §2.2 |
| Backend stack | ✅ Chốt: **NestJS + TypeScript** | TDR-001 |
| Map stack + tile provider candidate | ✅ Chốt ở mức candidate | MapLibre GL JS + Protomaps/Mapbox Free Tier (2 candidate) — lựa chọn cuối cùng giữa 2 candidate là quyết định **implementation-time** (technical spike trước khi code `apps/web`), đúng như TDR-002 đã định từ đầu, không phải khoảng trống requirement |
| Offline queue scope + sync protocol | ✅ Chốt | REST batch `/api/trips/sync`, max 500/payload, TDR-005 |
| Privacy/consent baseline | ✅ Chốt | FR-TRIP-01/02, NFR-PRIVACY-01/02/03 (đã mở rộng cho dữ liệu sinh trắc) |
| Raw GPS retention policy | ✅ Chốt | TTL 30 ngày, partitioning, TDR-006 |
| AR Lite scope | ✅ Chốt | TDR-003, không VR/kính, có fallback |
| Routing MVP scope | ✅ Chốt | Mock theo loại xe, TDR/step `5.1` |
| Simulator/developer mode scope | ✅ Chốt | FR-DEVMODE-01→04 |
| Background location behavior | ✅ Chốt | FR-BGLOC-01→06, kèm mitigation rủi ro App Store (R-16) |
| Batch sync size/chunking rule | ✅ Chốt | 500 events/payload, FR-SYNC-05 |
| Driver-friendly warning UI | ✅ Chốt | FR-WARNUI-01→05 |

**Toàn bộ 13 hạng mục bắt buộc đã đóng.** Baseline v1.0 không bị chặn bởi Open Question requirement-level nào.

## 4. Implementation-time Open Items (không chặn Baseline, resolve trong đúng micro-step)

Các mục này là quyết định kỹ thuật cụ thể cần một technical spike/benchmark thực tế — không thể (và không nên) chốt trên giấy ở giai đoạn tài liệu. Baseline v1.0 xác nhận: các step liên quan **không được bắt đầu code** cho tới khi mục tương ứng được giải quyết.

| Mục | Chặn step nào | Nguồn |
|---|---|---|
| Tile provider final (Protomaps vs Mapbox Free Tier) | `2.1`/`3.2` (web map) | `ARCHITECTURE.md` §9, `04_TECH_DECISION_RECORD.md` TDR-002 |
| Biometric provider/SDK cụ thể | `1.6` (Biometric Verification API) | `SRS.md` FR-BIOMETRIC-05, `RISK_REGISTER.md` R-17 |
| `verification_id` ngưỡng thời gian hợp lệ | `1.6`, `1.3`-liên-quan (Trip start) | `API_CONTRACT.md` §10 |
| Rate limit cụ thể (GPS event, login) | `1.1`, `3.1` | `SRS.md` NFR-PERF-01, `API_REQUIREMENTS.md` §9 |
| ~~`403` vs `404` cho resource không sở hữu~~ — Đã chốt: `403` + error_code cụ thể (07/2026, trước `1.4`) | — | `API_CONTRACT.md` §10 |
| Benchmark `gps_event_dedup` (chi phí ghi phụ mỗi GPS event) | `1.2`, `3.1` | `DATA_MODEL.md` §5 |
| Hosting/CI-CD provider | `9.2` | `ARCHITECTURE.md` §9 |
| `packages/shared-types` workspace tooling | `0.2` | `ARCHITECTURE.md` §9 |
| Exclusion constraint `btree_gist` khả dụng trên hosting đã chọn | `1.2`/`1.5` | `DATA_MODEL.md` §5 |
| Đổi xe giữa chuyến đi (`PATCH /api/trips/:id/vehicle`) | `1.3`/`4.x` nếu cần | `EDGE_CASES.md` §2 — mặc định KHÔNG cho phép ở MVP trừ khi có quyết định khác |

## 5. Terminology & Compliance — xác nhận cuối

- Toàn bộ 15 tài liệu D0.2–D0.4 đã grep xác nhận: không còn "NovaPay", "gian lận", "phạt nguội" ngoài các câu ví dụ "không được dùng từ này" trong chính các quy tắc thuật ngữ.
- Không lưu ảnh khuôn mặt thô ở bất kỳ đâu trong `DATA_MODEL.md` — xác nhận qua thiết kế bảng `biometric_verifications` (chỉ `result`/`provider`/timestamp).
- Vehicle Mismatch Detection giữ đúng nguyên tắc không tự kết luận vi phạm, không khoá tài khoản — nhất quán với `docs/future/TRUSTED_MOBILITY_VERIFICATION_LAYER.md`.

## 6. Test Gate cho D0.7 (theo `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`)

```text
- Goal rõ: PRD.md §1-2 ✅
- MVP rõ: PRD.md §5, MVP_SCOPE_DRAFT.md ✅
- API rõ: API_REQUIREMENTS.md + API_CONTRACT.md ✅
- Data rõ: DATA_REQUIREMENTS.md + DATA_MODEL.md ✅
- Test rõ: TEST_STRATEGY.md ✅
- AI rules rõ: AGENTS.md ✅
```

Tất cả đạt. **Docs pass checklist.**

## 7. Tuyên bố Baseline

> **NovaWay Requirement Baseline v1.0 — ĐẠT.**
>
> Từ thời điểm commit tài liệu này, mọi công việc tiếp theo chuyển sang giai đoạn code theo đúng `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`, bắt đầu từ step `0.2 chore/repo-foundation`. Mọi thay đổi requirement sau mốc này phải đi qua quy trình cập nhật tài liệu tương ứng trước (không sửa "ngầm" trong code), theo đúng `AGENTS.md`.
>
> Các mục ở §4 (Implementation-time Open Items) vẫn phải được giải quyết đúng lúc, đúng step — không phải lý do trì hoãn Baseline, nhưng cũng không được bỏ qua khi tới step liên quan.

## 8. Next Step

Step `0.2 chore/repo-foundation` — khởi tạo monorepo (`apps/backend`, `apps/web`, `apps/mobile`, `packages/shared-types`) theo `ARCHITECTURE.md` §2. Trước khi bắt đầu, xác nhận công cụ workspace (npm/pnpm/yarn workspaces hay Nx/Turborepo — §4 ở trên).
