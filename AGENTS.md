# AGENTS.md — NovaWay AI Agent Rules

> Step D0.4. Áp dụng cho mọi AI agent (Codex, Claude Code, hoặc agent khác) làm việc trên repo này từ sau khi Requirement Baseline v1.0 được chốt (D0.7). Đây là quy tắc bắt buộc, không phải gợi ý.

## Golden rule

**Không code trước khi Requirement Baseline v1.0 được duyệt.** Trạng thái hiện tại: đang ở D0.4 (Architecture) trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` — chưa tới D0.7.

## Tài liệu bắt buộc đọc trước khi code bất kỳ step nào

- `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` — xác định đúng step đang làm, branch, test gate, commit message.
- `docs/PRD.md`, `docs/SRS.md` — mục tiêu sản phẩm và yêu cầu functional/non-functional liên quan tới step.
- `docs/ARCHITECTURE.md` — vị trí module trong hệ thống, adapter pattern (mock ↔ real).
- `docs/DATA_MODEL.md` — schema chính xác, không tự đặt tên bảng/cột khác đi.
- `docs/API_CONTRACT.md` — request/response chính xác, không tự đổi field name hoặc status code.
- `docs/ACCEPTANCE_CRITERIA.md`, `docs/EDGE_CASES.md`, `docs/TEST_STRATEGY.md` — điều kiện "xong" của step.
- `docs/REVIEW_NOTES.md` — các quyết định/đánh đổi đã có, tránh làm lại hoặc mâu thuẫn.

Nếu một yêu cầu cần thiết mà không có trong các tài liệu trên: **dừng lại, cập nhật tài liệu trước, không tự suy đoán rồi code.**

## Branch rules

Không code trực tiếp trên `main` hoặc `develop`. Mỗi micro-step một branch, đúng prefix đã quy định trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`:

- `docs/...` — chỉ tài liệu.
- `chore/...` — hạ tầng/tooling, không phải business logic.
- `feat/...` — tính năng mới, đúng 1 nghiệp vụ nhỏ mỗi branch.
- `fix/...`, `style/...`, `refactor/...`, `test/...` — theo Conventional Commits.

## Commit rules

Conventional Commit, khớp đúng cột "Commit" trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` cho step đang làm — không tự đặt message khác đi.

## Scope rules

- Một branch = một nghiệp vụ nhỏ, đúng đúng 1 dòng trong micro-step plan.
- Không thêm tính năng ngoài phạm vi step hiện tại, kể cả khi "tiện làm luôn".
- Nếu phát hiện thiếu requirement giữa chừng: cập nhật `docs/*.md` liên quan trước, ghi rõ lý do, rồi mới code tiếp — không âm thầm tự quyết định.
- Nếu test gate của step chưa pass: không merge, không chuyển sang step tiếp theo.
- Sau khi `feat/*` merge vào `develop`, chạy lại test trên `develop` trước khi tạo PR sang `main`.

## Test gate bắt buộc trước khi báo hoàn thành 1 step

Backend/Web (Node):
```bash
npm run lint
npm run test
npm run build
```

Mobile (Flutter):
```bash
flutter analyze
flutter test
flutter run
```

Không báo "xong" nếu bất kỳ lệnh nào ở trên fail.

## Nguyên tắc riêng cho NovaWay (không phải quy tắc chung chung)

- **Mock ↔ Real qua adapter** (`docs/ARCHITECTURE.md` §3.2): routing, biometric provider, terrain warning data đều phải đi qua interface — không import thẳng implementation cụ thể vào business logic.
- **Realtime và Offline tách biệt tuyệt đối**: không dùng WebSocket để replay dữ liệu offline lớn (TDR-005). Idempotency (`client_event_id`) enforce ở tầng database, áp dụng cho cả 2 đường ghi dữ liệu.
- **Không lưu ảnh khuôn mặt thô** ở bất kỳ đâu trong hệ thống (FR-BIOMETRIC-04, NFR-PRIVACY-03) — nếu một thay đổi code vô tình thêm chỗ lưu ảnh/binary sinh trắc học, đó là lỗi nghiêm trọng, phải dừng lại hỏi trước khi tiếp tục.
- **Terminology rules bắt buộc** (`PRD.md` §11, `SRS.md` §5): luôn dùng "NovaWay" (không "NovaPay"); không dùng "gian lận", "phạt nguội", "camera phạt nguội" ở bất kỳ đâu — kể cả code comment, log message, tên biến. Dùng "sai lệch phương tiện" / "Vehicle Mismatch Detection" / "cảnh báo an toàn" / "cảnh báo địa hình".
- **AR/Computer Vision nặng không nhúng vào app chính**: Unity AR Terrain Mesh là prototype tách biệt (R&D), không merge vào `apps/mobile` trừ khi đã qua test gate riêng.
- **Demo Bridge**: khi làm step `2.1`–`2.3`, `3.2`, `7.2`, ưu tiên tái sử dụng có chọn lọc từ `feature/quick-demo` theo `docs/demo/DEMO_TO_PRODUCTION_BRIDGE.md` — không viết lại từ đầu phần đã có sẵn và còn dùng được.

## AI roles (tham khảo, không ràng buộc agent nào phải dùng công cụ nào)

| AI | Vai trò |
|---|---|
| NotebookLM | Gom nguồn, feedback ban đầu (đã hoàn tất ở D0.1) |
| ChatGPT 5.5 | Soạn thảo tài liệu chính (PRD/SRS/Architecture) |
| ChatPRD | Chuẩn hoá PRD, user stories, acceptance criteria |
| Claude Opus | Review logic sâu, risk, edge case |
| Gemini | Kiểm tra chéo, bảng biểu, flow |
| Codex | Coding agent chính sau khi tài liệu final |
| Claude Code / Sonnet | Code chi tiết, fix bug, review |

Dù công cụ nào thực hiện, kết quả phải tuân thủ đúng các tài liệu và nguyên tắc ở trên — tài liệu là nguồn sự thật duy nhất, không phải AI nào "nhớ" quyết định gì.
