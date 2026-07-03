# NovaWay Demo - Micro-step Template

## Step ID

`DEMO-XX`

## Step Name

Tên step ngắn gọn.

Ví dụ:

`Face ID Simulation`

---

## 1. Mục tiêu của step

Mô tả step này cần đạt được điều gì sau khi hoàn thành.

Ví dụ:

Step này tạo chức năng giả lập quét khuôn mặt để demo đăng nhập nhanh cho NovaWay. Đây chỉ là mô phỏng UI, không dùng camera thật và không xử lý sinh trắc học thật.

---

## 2. Phạm vi thực hiện

### Làm trong step này

* Việc 1
* Việc 2
* Việc 3

### Không làm trong step này

* Không làm tính năng ngoài phạm vi.
* Không sửa module không liên quan.
* Không thêm backend nếu step chỉ yêu cầu frontend.
* Không tích hợp công nghệ thật nếu đang là demo mock.

---

## 3. AI phụ trách

* AI lập kế hoạch: ChatGPT 5.5
* AI code chính: Claude Code / Claude Sonnet 4.6
* AI kiểm tra/fix: Codex
* AI review nếu cần: Claude Opus 4.8

---

## 4. Skills áp dụng

* `02-mvp-scope-skill`
* `08-sprint-prompt-writer-skill`
* `14-test-regression-skill`
* `29-ux-flow-review-skill`

---

## 5. Công nghệ sử dụng

* Frontend:
* Backend:
* Map:
* Storage:
* Mock/Simulator:
* Library:

Ví dụ:

* React + Vite + TypeScript
* localStorage
* CSS animation
* Không dùng camera thật

---

## 6. Giao diện cần có

Liệt kê rõ màn hình/component/field/button.

### Screen / Component

Tên màn hình hoặc component.

### Fields

* Field 1
* Field 2
* Field 3

### Buttons

* Button 1
* Button 2

### UI States

* Loading
* Success
* Error
* Empty state
* Disabled state

---

## 7. Dữ liệu cần có

Mô tả object/state/localStorage cần dùng.

Ví dụ:

```ts
type DemoAuthState = {
  isAuthenticated: boolean;
  loginMethod: "password" | "face_id_simulation";
  rememberMe: boolean;
};
```

---

## 8. Hành vi cần có

Mô tả flow người dùng.

1. Người dùng làm gì.
2. UI phản hồi ra sao.
3. Dữ liệu được lưu ở đâu.
4. Khi thành công chuyển sang màn hình nào.
5. Khi lỗi thì hiển thị gì.

---

## 9. Test gate

Step chỉ được xem là hoàn thành khi pass tất cả điều kiện này.

* Test 1
* Test 2
* Test 3
* Không có lỗi console nghiêm trọng.
* `npm run build` pass.
* Không làm phát sinh lỗi ở step trước.

---

## 10. Commit message

```bash
git commit -m "feat: add ..."
```

---

## 11. Điều kiện qua step tiếp theo

Chỉ được qua step tiếp theo khi:

* Step hiện tại chạy ổn.
* Test gate pass.
* UI không crash.
* Không làm lẫn tính năng của step sau.
* Commit đã đúng convention.

---

## 12. Prompt giao cho AI code

Bạn là AI coding assistant cho dự án NovaWay Demo.

Hãy thực hiện đúng micro-step sau:

* Step ID:
* Step Name:
* Mục tiêu:
* Phạm vi làm:
* Phạm vi không làm:
* Công nghệ:
* UI cần có:
* Dữ liệu cần có:
* Hành vi cần có:
* Test gate:
* Commit message đề xuất:

Yêu cầu bắt buộc:

1. Chỉ code đúng phạm vi step này.
2. Không tự ý thêm tính năng ngoài mô tả.
3. Không phá code step trước.
4. Nếu cần giả lập dữ liệu, dùng mock/localStorage.
5. Sau khi code xong, hướng dẫn tôi chạy test/build.
6. Nếu có lỗi, sửa trong phạm vi step này.
