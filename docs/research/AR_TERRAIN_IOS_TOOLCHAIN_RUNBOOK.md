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

`xcode-select -p` đã trả về `/Applications/Xcode.app/Contents/Developer`; `xcodebuild -version` đã trả về Xcode `16.4`, build `16F6`; `sw_vers -productVersion` đã trả về `15.3.1`. `df -h /System/Volumes/Data` ngày 2026-09-23 báo chỉ còn `15Gi` khả dụng và phân vùng đã dùng 92%, khác với kiểm kê ban đầu hơn 50 GB. Vì đây là Mac mượn, không tự xoá dữ liệu của chủ máy; phải giải phóng dung lượng có sự đồng ý và kiểm tra lại trước khi cài Unity. Step chỉ PASS sau khi hoàn thành toàn bộ §3–§6 (đường Mac Unity) hoặc §7 (đường project sinh từ Windows).

Timeline dung lượng Mac (giữ nguyên lịch sử):

| Ngày | Data volume khả dụng | Nguồn |
|---|---|---|
| 2026-09-23 | `15Gi` | USER-REPORTED (`df` do người dùng cung cấp, REVIEW_NOTES §28) |
| 2026-09-24 | `23 GiB` (sau khi dọn thêm) | USER-REPORTED / NOT AGENT-EXECUTED |
| Sau build/chạy trên Mac (báo 2026-09-26) | `14Gi`, capacity `93%` | USER-REPORTED (REVIEW_NOTES §31) |

**Storage readiness: PENDING** — người dùng tiếp tục giải phóng dung lượng trước phiên Mac; mức tăng 15 → 23 GiB không phải gate PASS.

## 2. Kiểm tra Xcode trước khi mở Unity

Mở Terminal trên Mac và chạy từng lệnh:

```bash
xcodebuild -version
xcode-select -p
sw_vers -productVersion
df -h /System/Volumes/Data
```

Kết quả mong đợi:

- `xcodebuild -version` báo Xcode `16.4`;
- `xcode-select -p` trỏ tới `/Applications/Xcode.app/Contents/Developer`;
- macOS báo `15.3.1`;
- `df -h /System/Volumes/Data` (phân vùng thực sự chứa project, Xcode và DerivedData; không dùng `df -h /`) báo dung lượng khả dụng — ghi lại **số đo thật**. Mốc `23 GiB` ngày 2026-09-24 là số người dùng báo, chưa phải kết quả đo của agent hay kết quả build PASS.

Có hai đường: đường Xcode-only (§7: ZIP khoảng 283 MiB, giải nén khoảng 1,2 GB, không bắt buộc cài Unity trên Mac trước) và đường Mac Unity (§3–§5: cần thêm Unity Editor, iOS Build Support và Library import). Có thể thử đường Xcode-only trước; kiểm tra lại `df -h /System/Volumes/Data` sau khi giải nén và sau lần build đầu tiên.

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

## 7. Đường ưu tiên khi Mac thiếu dung lượng: project Xcode sinh trên Lenovo/Windows

> Trạng thái (2026-09-24): `WINDOWS XCODE PROJECT GENERATION: PASS` (AGENT-EXECUTED, REVIEW_NOTES §29). `MAC XCODE BUILD`, `SIGNING`, `IPHONE INSTALL`, `IPHONE RUNTIME`: **NOT RUN**. §3–§5 (Unity chạy trên Mac) là fallback cho tới khi đường này chạy end-to-end. *(Trạng thái trên là ghi nhận ngày 2026-09-24, giữ làm lịch sử. Kết quả Mac/iPhone do người dùng báo ngày 2026-09-26: xem §8.)*

Lý do: cài Unity + iOS Build Support + Library import trên Mac tốn nhiều dung lượng hơn nhiều so với chỉ giải nén một project Xcode (ZIP khoảng 283 MiB, giải nén khoảng 1,2 GB). Trang system requirements của Unity 6.3 chỉ nêu Xcode 16+ và iOS 15+ (Xcode 16.4 / iOS 18.3.1 đáp ứng) và **không nêu** việc xuất Xcode project từ Windows Editor — đường này là thực nghiệm cho tới khi Xcode build trên Mac thành công.

### 7.1 Trên Lenovo (đã làm, có thể lặp lại)

```text
"C:\Program Files\Unity\Hub\Editor\6000.3.23f1\Editor\Unity.exe" ^
  -batchmode -nographics -quit -projectPath "<worktree>\research\ar-terrain-unity" ^
  -executeMethod NovaWay.ArTerrain.IosToolchain.Editor.IosToolchainSmokeBuilder.Build ^
  -logFile "<log ngoài Git>"
```

- Chạy từ cây Git sạch và ghi `source_commit`. Sau build, `git status` có thể cho thấy Unity đã sửa một số file tracked (lần đã quan sát: `Assets/Settings/*` nâng URP `k_AssetVersion`, một entry iPhone ở `ProjectSettings/ProjectSettings.asset`, cộng whitespace). Không commit các thay đổi này một cách mặc định. Với **từng file**, trong **đúng worktree đang build**: xem `git diff` của riêng file đó, chứng minh thay đổi chỉ do lần build vừa chạy tạo ra (tree đã sạch trước build; nội dung diff khớp kiểu migration/whitespace của Unity), rồi mới quyết định xử lý đúng file đó và ghi lý do. Không dùng lệnh hàng loạt và không đụng thay đổi của người dùng hoặc agent khác.
- Output nằm ở `research/ar-terrain-unity/Build/iOS-ToolchainSmoke-<UTC>/` (bị `.gitignore`). Đóng gói ZIP ngoài Git, loại thư mục `*_BurstDebugInformation_DoNotShip`, tính SHA-256, giải nén thử và so sánh trước khi chuyển sang Mac. Không commit ZIP hay log.
- ZIP chứa đường dẫn thư mục tạm của Lenovo trong `Libraries/lib_burst_generated.a` (không ảnh hưởng chạy) — không chia sẻ công khai.

### 7.2 Trên Mac (bắt buộc, chưa chạy)

Quy trình mặc định: **kiểm SHA-256 → giải nén → mở Xcode → thử Build/Run.** Không gỡ quarantine và không cấp quyền thực thi cho cả cây thư mục theo mặc định: ZIP lưu file ở mode đọc/ghi, và build phase của `Unity-iPhone.xcodeproj/project.pbxproj` đã tự chạy `chmod +x` cho `il2cpp`, `il2cpp-compile` và `bee_backend`. Chưa có lỗi thật trên Mac chứng minh cần can thiệp thêm.

1. Chạy `df -h /System/Volumes/Data` và ghi lại số đo. Chép ZIP sang Mac; `shasum -a 256 <file.zip>` phải khớp SHA-256 trong record chuyển giao ngoài Git.
2. Giải nén ZIP (cách thông thường của macOS); chạy lại `df -h /System/Volumes/Data` sau khi giải nén và ghi lại.
3. Mở `Unity-iPhone.xcodeproj`; target `Unity-iPhone` → **Signing & Capabilities** → Automatically manage signing → Personal Team của người dùng (nếu Xcode báo lỗi ký ở `UnityFramework`/`GameAssembly`, chọn cùng Personal Team). Giữ bundle id `com.novaway.arterrainprototype`; nếu trùng tài khoản khác, đổi giá trị duy nhất trong Xcode và ghi ngoài Git.
4. Kết nối iPhone 11 Pro, mở khoá, Trust; bật Developer Mode khi được yêu cầu; chọn thiết bị làm Run Destination; Build/Run.
5. Lần đầu chạy bằng Personal Team có thể cần **Settings → General → VPN & Device Management → Trust** developer profile trên iPhone.
6. Sau lần build đầu tiên, chạy lại `df -h /System/Volumes/Data` và ghi lại.
7. Chỉ khi gặp lỗi **cụ thể** về quyền thực thi hoặc quarantine/Gatekeeper: chép nguyên văn thông báo (không kèm Apple ID/Team ID), xác định **chính xác file bị chặn**, rồi chỉ xử lý giới hạn cho đúng file đó (ví dụ một lệnh `chmod u+x` hoặc `xattr -d com.apple.quarantine` trên đường dẫn của file đó) và ghi lại file, lỗi và cách xử lý trong evidence. Lỗi quyền trên ba tool đã có `chmod +x` trong build phase là bất thường — báo nguyên văn trước khi can thiệp.
8. Nếu Xcode fail vì lý do khác: chép nguyên văn lỗi. Nếu lỗi do project sinh từ Windows, quay về §3–§5 (Mac Unity) và ghi lại root cause; lưu ý giới hạn dung lượng Mac.
9. Test gate và evidence giữ nguyên §6 (≥60 giây, không crash, đóng/mở lại, che thông tin nhạy cảm, ghi Unity/Xcode/macOS/iOS version và `source_commit`).

### 7.3 Chuẩn bị iPhone 11 Pro

Pin trên 80%, còn khoảng 5 GB trống, cáp hỗ trợ truyền dữ liệu, Apple Account và 2FA sẵn sàng, giữ iOS 18.3.1 (không cập nhật ngay trước gate), mở khoá máy, Trust Mac khi được hỏi, bật Developer Mode khi được yêu cầu, khởi động lại nếu iOS yêu cầu. iPhone 11 Pro không có LiDAR Scene Reconstruction — kết quả này không phải bằng chứng LiDAR.

## 8. Kết quả phiên Mac + iPhone 11 Pro (ghi nhận 2026-09-26)

> Đây là **Non-AR toolchain smoke**. Provenance: các bước Windows do agent chạy (AGENT-EXECUTED); mọi bước Mac/iPhone là **USER-EXECUTED / USER-REPORTED**, có ảnh iPhone và ảnh Xcode đã che (bản đã che lưu ngoài Git). Agent không chạy gì trên Mac hay iPhone. Chi tiết và đối chiếu gate: `docs/REVIEW_NOTES.md` §31.

### 8.1 Đã xảy ra (theo người dùng báo)

Xác minh SHA-256 ZIP (`be66e489…c3e8`) → Xcode 16.4 mở project sinh từ Windows → **Build Succeeded** cho iPhone thật → ký bằng Personal Team, bật Developer Mode, tin cậy chứng chỉ ứng dụng → app chạy trên iPhone 11 Pro (iOS 18.3.1) với cảnh "NovaWay - Toolchain Smoke / Non-AR test" và khối lập phương → mở liên tục hơn 60 giây, không tự thoát → Stop trong Xcode, thoát app, **mở lại trực tiếp từ biểu tượng trên iPhone** (không Run lại) → cảnh hiện lại, không tự thoát. Đúng quy trình §7.2 (không cần `xattr`/`chmod` toàn cây; người dùng không báo lỗi quyền/quarantine).

### 8.2 Đối chiếu test gate §6

| Gate | Kết quả |
|---|---|
| Xcode build thành công | PASS (USER-REPORTED) |
| App cài/mở trên iPhone 11 Pro thật, ký Personal Team | PASS (USER-REPORTED; ảnh cảnh) |
| Cảnh camera/light/cube + nhãn không-AR | PASS (ảnh) |
| Chạy ≥60 giây không crash | PASS (USER-REPORTED; không suy ra từ ảnh) |
| Đóng/mở lại ≥1 lần | PASS (USER-REPORTED) |
| Evidence ghi exact version + source commit | PARTIAL (Xcode/macOS từ lệnh đã báo, iOS user-reported, Unity/`3c12a31` qua SHA artifact) |
| Ảnh/log đã che thông tin cá nhân | Ảnh Xcode gốc CHƯA che (lộ tên Team, một phần Apple ID email, tên thiết bị); chỉ bản agent che lưu ngoài Git |
| Install/launch trên iPhone 16 Pro "trước `8.2`" | NOT RUN |
| Review Manager review + CI + merge | CI xanh; review/merge chưa |

`8.1b` **chưa** được đánh dấu COMPLETED: còn chờ Review Manager review, merge PR #80 (đang DRAFT) và quyết định về điều kiện thiết bị LiDAR thật.

### 8.3 Cần theo dõi

- ~105 cảnh báo Xcode, gồm cảnh báo linker `lib_burst_generated.a` ("no platform load command found"). Phân tích tĩnh (AGENT-EXECUTED): 90/90 object Mach-O arm64 trong thư viện này không có platform load command, trong khi `baselib.a` (3/3) và `libiPhone-lib.a` (1.809/1.809) đều có. Khớp với cảnh báo và chỉ vào thư viện Burst sinh trên Windows; **chưa** biết nguyên nhân gốc, chưa biết project sinh trên Mac có tránh được không, chưa chứng minh các cảnh báo còn lại vô hại. Chưa sửa gì.
- Dung lượng Mac sau build/chạy (USER-REPORTED): `14Gi`, 93% — không biến storage gate cài Unity trên Mac thành PASS. Không xoá dữ liệu của chủ máy.
- Kết quả này không chứng minh ARKit, Scene Reconstruction, LiDAR, quét địa hình thật, GPS hay RTK; iPhone 11 Pro không phải thiết bị kiểm thử LiDAR.
