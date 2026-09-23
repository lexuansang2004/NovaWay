# AR Terrain — Mac/Xcode/iPhone Toolchain Smoke Runbook

> Micro-step `8.1b`, branch `chore/ar-terrain-ios-toolchain`. Mục tiêu duy nhất là chứng minh project Unity không-AR có thể xuất project Xcode, ký, cài và chạy trên iPhone 11 Pro. Kết quả này không chứng minh LiDAR, ARKit Scene Reconstruction, GPS hay RTK.

## 1. Thiết bị và phiên bản đã xác nhận

| Thành phần | Phiên bản/trạng thái |
|---|---|
| Mac | MacBook Air, chip Apple M3 |
| macOS | Sequoia 15.3.1 |
| Xcode | 16.4 stable, build `16F6`; `xcode-select` và `xcodebuild` đã xác minh ngày 2026-09-23 |
| iPhone smoke | iPhone 11 Pro, iOS 18.3.1; không có LiDAR |
| Unity yêu cầu | Unity 6.3 LTS `6000.3.23f1` + iOS Build Support |

`xcode-select -p` đã trả về `/Applications/Xcode.app/Contents/Developer`; `xcodebuild -version` đã trả về Xcode `16.4`, build `16F6`; `sw_vers -productVersion` đã trả về `15.3.1`. `df -h /System/Volumes/Data` ngày 2026-09-23 báo chỉ còn `15Gi` khả dụng và phân vùng đã dùng 92%, khác với kiểm kê ban đầu hơn 50 GB. Vì đây là Mac mượn, không tự xoá dữ liệu của chủ máy; phải giải phóng dung lượng có sự đồng ý và kiểm tra lại trước khi cài Unity. Step chỉ PASS sau khi hoàn thành toàn bộ §3–§6.

## 2. Kiểm tra Xcode trước khi mở Unity

Mở Terminal trên Mac và chạy từng lệnh:

```bash
xcodebuild -version
xcode-select -p
sw_vers -productVersion
df -h /
```

Kết quả mong đợi:

- `xcodebuild -version` báo Xcode `16.4`;
- `xcode-select -p` trỏ tới `/Applications/Xcode.app/Contents/Developer`;
- macOS báo `15.3.1`;
- còn đủ dung lượng cho Unity Editor, iOS Build Support, Library import và Xcode build.

Nếu Xcode yêu cầu cài first-launch components hoặc chấp nhận license thì người dùng tự hoàn tất trong Xcode. Không gửi mật khẩu, Apple ID, mã xác thực hai lớp, email hoặc Team ID vào repository/evidence.

## 3. Cài Unity trên Mac

Trong Unity Hub trên Mac:

1. Đăng nhập đúng Unity ID có Student license.
2. Cài đúng Unity `6000.3.23f1`.
3. Chọn thêm module **iOS Build Support**.
4. Mở project `research/ar-terrain-unity/` từ source Git; không copy `Library/`, `Temp/`, `Logs/`, `Build/` hoặc `UserSettings/` từ Lenovo.
5. Đợi Unity import/compile xong và xác nhận Console không có error đỏ.

## 4. Xuất project Xcode

Trong Unity trên Mac, chọn:

```text
NovaWay → Build iOS Toolchain Smoke
```

Builder chỉ đóng gói scene không-AR `Assets/Scenes/ToolchainSmoke.unity`. Mỗi lần build tạo thư mục riêng dưới:

```text
research/ar-terrain-unity/Build/iOS-ToolchainSmoke-<UTC timestamp>/
```

Có thể chạy tương đương bằng Terminal:

```bash
/Applications/Unity/Hub/Editor/6000.3.23f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -quit \
  -projectPath "$(pwd)/research/ar-terrain-unity" \
  -executeMethod NovaWay.ArTerrain.IosToolchain.Editor.IosToolchainSmokeBuilder.Build \
  -logFile "$(pwd)/ios-toolchain-smoke.log"
```

File log là evidence local, không commit vì có thể chứa đường dẫn/machine metadata.

## 5. Ký và cài lên iPhone 11 Pro

1. Kết nối iPhone 11 Pro bằng cáp, mở khoá máy và chọn **Trust** nếu được hỏi.
2. Bật **Developer Mode** trên iPhone khi Xcode yêu cầu, sau đó khởi động lại điện thoại theo hướng dẫn của iOS.
3. Trong Xcode, mở `Unity-iPhone.xcodeproj` từ thư mục build.
4. Chọn target `Unity-iPhone` → **Signing & Capabilities**.
5. Bật **Automatically manage signing** và chọn Personal Team của người dùng.
6. Giữ bundle identifier `com.novaway.arterrainprototype`; nếu identifier đã thuộc tài khoản khác, đổi sang một giá trị duy nhất ngay trong Xcode và ghi lại giá trị đã dùng trong evidence ngoài Git, không commit Team ID.
7. Chọn iPhone 11 Pro thật làm Run Destination rồi bấm Run.

## 6. Test gate và evidence

Chỉ đánh dấu `8.1b` PASS khi:

- Xcode build thành công;
- app cài và mở trên iPhone 11 Pro thật;
- scene hiện camera/light/cube và nhãn `NovaWay - Toolchain Smoke / Non-AR test`;
- app chạy ít nhất 60 giây, không crash;
- đóng và mở lại app được ít nhất một lần;
- evidence ghi exact Unity/Xcode/macOS/iOS version và source commit;
- ảnh/log đã che Apple email, Team ID, device UDID, signing certificate serial và đường dẫn chứa thông tin cá nhân.

Không gọi bước này là bằng chứng LiDAR. iPhone 16 Pro vẫn là thiết bị bắt buộc riêng cho step `8.2`.
