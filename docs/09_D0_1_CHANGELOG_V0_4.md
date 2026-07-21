# NovaWay - D0.1 Changelog v0.4

## 1. Lý do cập nhật

Bản v0.4 cập nhật theo vòng feedback mới từ NotebookLM sau khi rà soát bộ `NovaWay_D0_1_Docs_v0_3`. Mục tiêu là bổ sung 4 edge cases kỹ thuật trước khi chuyển sang Step D0.2 viết PRD/SRS.

## 2. Thay đổi chính

### 2.1. Background Location Service

Bổ sung vào MVP mobile requirements:

- Active trip tracking cần có behavior rõ khi app chạy nền/khóa màn hình.
- Android cần Foreground Service kèm notification liên tục khi tracking chạy nền.
- iOS cần permission flow phù hợp cho background/always location nếu cần tracking khi khóa màn hình.
- Nếu user không cấp quyền background, app phải giải thích giới hạn và vẫn dừng tracking được bất kỳ lúc nào.

### 2.2. WebSocket Reconnect Resilience

Bổ sung yêu cầu:

- WebSocket reconnect phải dùng Exponential Backoff with Jitter.
- Không reconnect tức thì hàng loạt khi nhiều client có mạng lại cùng lúc.
- Live stream resume qua WebSocket; offline queue vẫn sync qua REST batch.

### 2.3. Batch Sync Size & Chunking

Bổ sung quyết định MVP:

- `POST /api/trips/sync` nhận tối đa 500 events/payload.
- Mobile phải chia local queue thành nhiều chunks nếu vượt 500 events.
- Server cần lỗi rõ khi vượt limit và có plan partial success/error response.

### 2.4. Driver-friendly Warning UI

Bổ sung acceptance criteria cho cảnh báo sai lệch phương tiện / cảnh báo an toàn:

- Overlay lớn, rõ, dễ đọc.
- One-tap action.
- Auto-dismiss sau 10 giây.
- Không dùng push notification nhỏ làm UI chính khi user đang lái.
- Không dùng wording tiêu cực như “gian lận” hoặc “phạt nguội”.

## 3. Files đã cập nhật

- `README.md`
- `TREE.md`
- `docs/01_OPEN_QUESTIONS.md`
- `docs/02_NOTEBOOKLM_FEEDBACK_REVIEW.md`
- `docs/03_REQUIREMENT_DELTA_V0_2.md`
- `docs/04_TECH_DECISION_RECORD.md`
- `docs/05_MVP_SCOPE_DRAFT.md`
- `docs/06_NEXT_STEP_D0_2_INPUT.md`
- `docs/07_MASTER_PROMPT_D0_2.md`

## 4. Commit message đề xuất

```bash
git commit -m "docs: update D0.1 requirements with mobile resilience edge cases"
```

## 5. Trạng thái

D0.1 v0.4 đã đủ sạch để chuyển sang Step D0.2 tạo PRD/SRS nháp. Chưa code.
