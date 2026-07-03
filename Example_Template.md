# DEMO-03 - Face ID Simulation

## Step ID

`DEMO-03`

## Step Name

`Face ID Simulation`

---

## 1. Mục tiêu của step

Tạo chức năng giả lập quét khuôn mặt trong màn hình đăng nhập NovaWay Demo.

Đây là tính năng demo UI, không dùng camera thật, không nhận diện khuôn mặt thật và không lưu dữ liệu sinh trắc học.

---

## 2. Phạm vi thực hiện

### Làm trong step này

* Thêm nút “Quét khuôn mặt”.
* Thêm overlay mô phỏng khung quét khuôn mặt.
* Thêm animation scanning trong khoảng 2 giây.
* Hiển thị trạng thái “Đang xác thực khuôn mặt...”.
* Hiển thị trạng thái “Xác thực khuôn mặt thành công”.
* Lưu trạng thái đăng nhập demo vào localStorage.
* Chuyển sang màn hình chọn phương tiện sau khi quét thành công.

### Không làm trong step này

* Không dùng camera thật.
* Không xin quyền camera.
* Không dùng AI face recognition thật.
* Không lưu dữ liệu sinh trắc học.
* Không làm backend auth thật.
* Không sửa các step map, vehicle, trip.

---

## 3. AI phụ trách

* AI lập kế hoạch: ChatGPT 5.5
* AI code chính: Claude Code / Claude Sonnet 4.6
* AI kiểm tra/fix: Codex

---

## 4. Skills áp dụng

* `08-sprint-prompt-writer-skill`
* `14-test-regression-skill`
* `29-ux-flow-review-skill`
* `30-location-privacy-compliance-skill`

---

## 5. Công nghệ sử dụng

* React + Vite + TypeScript
* localStorage
* CSS animation
* Không dùng camera API

---

## 6. Giao diện cần có

### Component

`FaceIdSimulationButton`

### UI elements

* Nút “Quét khuôn mặt”
* Overlay scan
* Khung khuôn mặt giả lập
* Thanh scan animation
* Text: “Đang xác thực khuôn mặt...”
* Text: “Xác thực khuôn mặt thành công”
* Badge nhỏ: “Demo Simulation”
* Nút đóng overlay nếu người dùng muốn hủy

---

## 7. Dữ liệu cần có

```ts
type DemoAuthState = {
  isAuthenticated: boolean;
  loginMethod: "password" | "face_id_simulation";
  rememberMe: boolean;
  authenticatedAt: string;
};
```

Lưu vào localStorage key:

```ts
"novaway_demo_auth"
```

---

## 8. Hành vi cần có

1. Người dùng ở màn hình đăng nhập.
2. Người dùng bấm “Quét khuôn mặt”.
3. Overlay scanning mở ra.
4. Animation chạy trong 2 giây.
5. UI hiện “Xác thực khuôn mặt thành công”.
6. App lưu auth state vào localStorage.
7. App chuyển sang màn hình chọn phương tiện.
8. Nếu người dùng bấm hủy, overlay đóng lại và vẫn ở màn hình đăng nhập.

---

## 9. Test gate

* Bấm “Quét khuôn mặt” thì overlay hiện.
* Animation scanning chạy mượt.
* Sau khoảng 2 giây hiển thị thành công.
* Sau khi thành công app chuyển sang Vehicle Selection.
* localStorage có key `novaway_demo_auth`.
* Reload app vẫn giữ đăng nhập nếu rememberMe đang bật.
* Không xuất hiện request quyền camera.
* Không có lỗi console nghiêm trọng.
* `npm run build` pass.

---

## 10. Commit message

```bash
git commit -m "feat: add demo face id simulation"
```

---

## 11. Điều kiện qua step tiếp theo

Chỉ qua `DEMO-04 Vehicle Selection` khi:

* Face ID Simulation chạy ổn.
* Login thường vẫn hoạt động.
* Không phát sinh lỗi UI trên màn hình login.
* Build pass.
