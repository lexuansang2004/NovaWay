# AR Terrain — Windows-first toolchain và bàn giao Mac

> Quyết định workflow: chủ dự án đồng ý ngày 2026-09-04, xem `REVIEW_NOTES.md` §20. Baseline khoa học không đổi. Đây là checklist thao tác, không phải bằng chứng test đã hoàn thành.

## 1. Trạng thái đã biết

| Hạng mục | Trạng thái / nguồn |
|---|---|
| Lenovo | Windows 11; Ryzen 7 7435HS, RAM 24 GB, RTX 4060 Laptop 8 GB (ảnh người dùng + kiểm tra OS ngày 04/09) |
| Unity Student subscription | ACTIVE theo xác nhận/email người dùng ngày 03/09; không lưu email, mã license hoặc link redeem cá nhân vào Git |
| Unity Hub Windows | Đã cài 3.21.1, package 3.21.1.65535 ngày 04/09 qua WinGet `Unity.UnityHub`; installer hash verification thành công |
| Student license trong Hub | Người dùng đã đăng nhập; ảnh trang Licenses hiển thị **Unity Student** và Editor đã mở/chạy project thành công. Chưa ghi nhận ngày hết hạn; không lưu thông tin đăng nhập/serial trong Git |
| Unity Editor exact patch | **6000.3.23f1 (6.3 LTS), đã cài** — ảnh Hub báo Install complete; đã xác nhận `C:/Program Files/Unity/Hub/Editor/6000.3.23f1/Editor/Unity.exe` tồn tại |
| Template đã chọn | **Core → Universal 3D (URP)**; project ghi nhận URP `17.3.0`, Input System `1.20.0`, UGUI/TMP `2.0.0`; không phải Sample/HDRP/AR Mobile |
| Unity project | Đã tạo tại `research/ar-terrain-unity/`; scene `Assets/Scenes/ToolchainSmoke.unity` có camera, light, cube và nhãn không-AR |
| iPhone 11 Pro | Có sẵn theo người dùng; chưa có evidence smoke iOS |
| MacBook Air M4 | Chưa sẵn có, chưa có ETA được xác nhận; chờ người dùng báo |
| iPhone 16 Pro | Thiết bị LiDAR dự kiến; chưa xác nhận sẵn có, chưa kiểm chứng runtime |
| Kết quả | PR #76 (commit `3d8cfb4`, sau rework thêm commit mới cùng branch) mở vào `develop`, required GitHub checks **PASS**. Review Manager: **CHANGES REQUESTED** (2026-09-05) → đã áp dụng rework (xem §3 dưới) → chờ review lại. Chưa merge. `8.1b`/iOS/LiDAR/RTK **NOT RUN** |

## 2. Step 8.1a — Windows Editor bootstrap

Branch: `chore/ar-terrain-toolchain` (worktree đang chứa đính chính thiết bị chưa commit).
Commit khi đủ gate và được review: `chore: add ar terrain unity windows toolchain smoke test`.

- [x] Chủ dự án đồng ý Windows-first; ghi tài liệu trước implementation.
- [x] Cài Unity Hub từ nguồn chính thức, không mua gói trả phí.
- [x] Người dùng tự Sign in và cung cấp ảnh **Licenses → Unity Student**. Không lưu thông tin đăng nhập/serial; ngày hết hạn chưa được xác minh.
- [x] Chọn/cài Unity Editor **6000.3.23f1 (6.3 LTS)**, xác nhận qua Hub và đường dẫn Editor trên máy. Hub version ở bảng trên là phiên bản đã ghi nhận lúc cài, chưa tái kiểm tra sau các thao tác đăng nhập/cài lại của người dùng.
- Cấu hình tạo project: **Universal 3D (URP)**, Project name `ar-terrain-unity`, Location `D:/CaNhan/myProject/NovaWay/.claude/worktrees/chore-ar-terrain-toolchain/research`. Hub thêm tên project vào Location để tạo thư mục đích. Giữ Use AI Assistant/Use Unity CLI tắt; không chọn Source control provider để tránh tạo repository mới lồng trong worktree Git hiện có. Không bật cloud service/build hoặc mua dịch vụ.
- Không bấm Upgrade template trong lần khởi tạo này; ghi lại URP/package versions thực tế từ manifest/lock sau import. Việc chọn URP cho scene Windows không chứng minh ARKit/iOS đã được cấu hình hay kiểm thử.
- [x] Trước khi chốt source/config: đã đọc/rà lại các tài liệu bắt buộc trong `AGENTS.md` ở worktree, bao gồm plan, PRD/SRS, Architecture, Data Model, API Contract, Acceptance Criteria, Edge Cases, Test Strategy và Review Notes; prototype vẫn tách khỏi `apps/*`.
- [x] Tạo project tối thiểu tại `research/ar-terrain-unity/` bên trong **worktree đang làm step**, không ở dirty checkout `develop`; scene không-AR có camera, light, cube và nhãn `NovaWay - Toolchain Smoke / Non-AR test`.
- [x] Giữ phạm vi tooling: kiểm tra manifest/source ngày 05/09 không có AR Foundation/ARKit, camera/LiDAR capture, PLY/georeference/RTK. `ProjectSettings.asset` đang để `iOSRequireARKit: 0`.
- [x] Visible Meta Files + Force Text; mọi asset/directory dưới `Assets/` có `.meta`, không có `.meta` mồ côi; có `ProjectSettings/`, `Packages/manifest.json` và `packages-lock.json`. Exact patch được khoá trong `ProjectVersion.txt` là `6000.3.23f1 (09d2ecc7fb28)`.
- [x] Thêm Unity-local `.gitignore`: bỏ Library/Temp/Logs/Obj/Build/Builds/UserSettings và file IDE/generated; không bỏ asset, `.meta`, package lock hoặc ProjectSettings cần track.
- [x] Thêm Unity-local `.gitattributes`: cố định LF cho scene/meta/config/source dạng text khi chuyển Windows → macOS và giữ ảnh/font/model/audio/video/plugin ở dạng binary.
- [x] Smoke cục bộ theo xác nhận người dùng: Editor import xong, scene chạy Play Mode ≥60 giây, cube/nhãn hiển thị, đã stop/save, đóng/mở lại và chạy lại. Ảnh lần chạy sau khi mở lại cho thấy Console 0 error/0 warning; thời lượng là user-reported, không phải phép đo tự động/video liên tục. Kiểm tra lại bằng Editor batch mode ngày 05/09 cũng import/compile và thoát thành công với mã 0.
- [x] Đặt `ToolchainSmoke.unity` làm scene build đầu tiên. Audit ngày 05/09 phát hiện cấu hình template còn trỏ tới `SampleScene.unity`; sau khi Unity đã đóng, đã đổi `EditorBuildSettings.asset` sang đúng path/GUID của `ToolchainSmoke` và kiểm tra lại ở tầng source.
- [x] Evidence Windows được giữ ngoài Git dưới `2026-09-04_windows_editor_smoke_8.1a/device_lenovo-windows/`: có ảnh Play Mode, SHA-256 ảnh, run record với version/source base/phân loại sự cố. **Lưu ý (05/09, sau rework):** ảnh Play Mode này được chụp **trước** khi dọn template asset và sửa `ShaderGraphSettings.asset` (§3 dưới) — vẫn đúng là bằng chứng Play Mode ban đầu, nhưng không phải ảnh của đúng bộ source cuối cùng đã commit. Xác minh cho bộ source cuối cùng là batch-mode reopen do agent tự chạy (mục dưới), không phải ảnh này.
- [x] `git diff --check` (cả staged lẫn unstaged) pass.
- [x] Review đúng phạm vi: không có thay đổi `apps/*`; không có AR Foundation/ARKit/LiDAR/PLY/RTK/georeference; asset/`.meta` không thiếu, không mồ côi; `ToolchainSmoke` vẫn là build scene duy nhất; không có secret/credential/email.
- [x] Required GitHub PR checks xanh (lint/test/build, E2E, Mobile) — GitHub CI **không** chạy Unity, nên đây chỉ là bằng chứng cho phần Node/Web/Mobile không đổi, không phải bằng chứng Unity import/compile.
- [ ] Review Manager duyệt lại rework (đang **CHANGES REQUESTED** tính đến 2026-09-05); merge — **chưa xảy ra**. Không ghi toàn bộ nhóm `8.1` PASS.

Nếu Hub chưa nhận Student license: ghi lỗi cụ thể và kiểm tra/support; không tự đổi Personal, kích hoạt Pro trial hay mua license. Student subscription ACTIVE và license tại máy là hai trạng thái khác nhau.

Sự cố đã quan sát trong quá trình bootstrap Windows (không được xoá khỏi báo cáo): lần import đầu có lỗi hết bộ nhớ và VirtualArtifacts khi RAM trống rất thấp; sau khi đóng ứng dụng khác rồi mở lại, scene import/chạy được. Một lần mở lại có cảnh báo VS/Unity messaging không bind được UDP `56202`; kiểm tra read-only cho thấy port nằm trong excluded UDP range của Windows. Ảnh chạy cuối có Console 0 warning nhưng chưa đủ để khẳng định nguyên nhân port đã hết vĩnh viễn. Không thay firewall/port reservation, không xoá Library và không nâng Editor để che sự cố.

## 3. Rework sau Review Manager CHANGES REQUESTED (2026-09-05)

Review Manager tự kiểm tra độc lập commit `3d8cfb4`/PR #76, ra verdict CHANGES REQUESTED trước khi merge. Chi tiết đầy đủ: `docs/REVIEW_NOTES.md` §22. Tóm tắt các sửa đổi, tất cả agent tự thực hiện và tự verify bằng Unity `6000.3.23f1` cài sẵn trên máy này:

1. **Bất ổn khi mở lại (`ShaderGraphSettings.asset`):** tái hiện độc lập từ `Library` sạch lẫn `Library` đã có — Unity luôn ghi thêm một khoảng trắng cuối dòng vào `m_Name:`/`m_EditorClassIdentifier:` (giá trị rỗng) mỗi lần reimport, ổn định/xác định. Đã chấp nhận bản serialize canonical này làm nội dung commit, và thêm attribute `-whitespace` (giới hạn đúng các đuôi YAML MonoBehaviour/ScriptableObject của Unity, không đổi whitespace behavior toàn repo) vào `.gitattributes` để `git diff --check` không coi đây là lỗi. Verify: hai lần mở lại liên tiếp sau khi áp dụng (một từ `Library` sạch, một từ `Library` đã có) đều không tạo thêm sai khác nào; `git diff --check` pass ở cả hai trạng thái.
2. **Dọn template onboarding:** xoá `Assets/Readme.asset`+`.meta`, `Assets/TutorialInfo/`+`.meta`, `Assets/Scenes/SampleScene.unity`+`.meta` theo đúng cặp asset/`.meta` — đã xác nhận qua tìm GUID rằng không asset nào khác tham chiếu tới ba mục này. TextMesh Pro và Input System giữ nguyên (đã xác nhận `ToolchainSmoke.unity` dùng TMP cho label, và `EditorBuildSettings.asset` tham chiếu đúng GUID `InputSystem_Actions.inputactions`).
3. **Evidence tái tạo được:** manifest nguồn đầy đủ (141 file thay đổi giữa `6c17812` và commit head cuối `3e7799275632c2f1b63e243cf355e3be68ca277a`, mỗi file kèm SHA-256, thuật toán/định dạng dòng, và checksum tự tham chiếu của chính manifest) đã thêm vào `2026-09-05_source_manifest_8.1a_rework/SOURCE_MANIFEST.md` cùng thư mục evidence ngoài Git (`.../novaway-ar-terrain-evidence/2026-09-05_source_manifest_8.1a_rework/SOURCE_MANIFEST.md`) — checksum file manifest: `c27303d682bd91f1ad1810d218cf5eb6553c09cb4c97971649aa93302f43cddc`. Đã verify bằng `sha256sum -c` chạy từ repo root: cả 141 dòng đều `OK`. `RUN_RECORD.md` gốc (`2026-09-04_windows_editor_smoke_8.1a/`) đã được bổ sung addendum ghi rõ ảnh Play Mode có trước rework, không phải bằng chứng cho source cuối cùng.
4. **Tách trạng thái:** Windows Play Mode thủ công = user-reported/manual-observed; batch-mode import/compile = agent-executed automated local check (agent tự chạy Unity `6000.3.23f1`, có log/exit code); GitHub checks = PASS (không kiểm Unity); Review Manager = CHANGES REQUESTED cho tới khi review lại; merged = NO; `8.1b`/iOS/LiDAR/RTK = NOT RUN.

## 3. iPhone 11 Pro trong lúc chưa có Mac

Chỉ cần chuẩn bị: model chính xác, phiên bản iOS, dung lượng trống, cáp Lightning truyền dữ liệu phù hợp với Mac sau này. Không cần UDID/Apple credentials/certificate. Không giả định cắm vào Lenovo là đã deploy được app iOS. Chưa có app build hợp lệ thì không ghi install/launch/60-second test PASS.

## 4. Step 8.1b — Khi người dùng báo có Mac

Branch dự kiến: `chore/ar-terrain-ios-toolchain`, tạo sau `8.1a` được review/merge.
Commit: `chore: add ar terrain unity ios toolchain smoke test`.

1. Kiểm tra `sw_vers`, `uname -m`, `xcodebuild -version`, `xcode-select -p`, dung lượng trống, phiên bản iOS; xác nhận compatibility trước khi build.
2. Đăng nhập Student trong Hub trên Mac, kiểm tra license tại máy; cài **cùng exact Editor patch** và iOS Build Support. Không nâng phiên bản âm thầm.
3. Lấy **cùng source project** qua Git, giữ `.meta` và package lock; Unity tự tái tạo Library. Không chép Library/Temp/Build hoặc tạo project Mac thay thế.
4. Mở đúng scene đã kiểm chứng, export Xcode project vào thư mục build không track; dùng Apple Account miễn phí/Personal Team, người dùng tự đăng nhập.
5. Build/ký/cài/chạy trên iPhone 11 Pro ≥60 giây, lưu log/ảnh/video thật đã che thông tin nhạy cảm. Nếu đổi thiết bị smoke chính phải ghi quyết định, không đổi âm thầm.
6. Trước `8.2`: lặp smoke install/launch trên iPhone 16 Pro và kiểm tra runtime Scene Reconstruction capability. Smoke không-AR trên iPhone 11 Pro không chứng minh LiDAR.
7. Bổ sung evidence ở `YYYY-MM-DD_ios_toolchain_smoke_8.1b/`, source commit và versions; review/required PR checks trước merge. Khi đó mới xác nhận gate iOS.

## 5. Phần việc độc lập và giới hạn

Sau `8.1a`, có thể đề xuất tách PLY writer trên mesh mẫu hoặc unit test WGS84→ENU/rigid/RMSE thành micro-step Windows riêng. **Phải cập nhật plan, branch, commit và test gate rồi review trước khi code**; chưa có quyền gộp các tính năng đó vào branch tooling hoặc bỏ gate của `8.3`/`8.4`.

Fixture chỉ chứng minh logic/toán học. Mục tiêu cuối vẫn là mesh LiDAR thật 10×10 m, WGS84/ENU, `C_AXIS` rồi rigid scale=1, 5 control + 3 checkpoint độc lập, Measurement Gate và Accuracy KPI tách biệt, PLY bắt buộc/GLB stretch. Không thay RTK thực địa bằng fixture, không báo FPS/pin/nhiệt PC thành iPhone.

MVP/backend/web có thể đi tiếp theo kế hoạch riêng đã được duyệt; không sửa `apps/*` hoặc merge PR của sprint khác trong nhánh AR.

## 6. Tiến độ và chi phí

- Ngày 04/09: lịch iOS/LiDAR gần nhất **AT RISK** do chưa có Mac/thiết bị được xác nhận; Windows-first chỉ giảm thời gian chờ phần độc lập.
- Checkpoint gốc: thiết bị chậm nhất 06/09, mesh nhỏ thật đầu tiên 07/09. Không coi là lời hứa giao máy; khi có Mac cần đánh giá lại lịch.
- Không lùi ngầm PLY 04/10, RTK đợt 1 25/10, code freeze 15/11 và thời gian viết báo cáo/rehearsal sau đó.
- Dùng Student đã ACTIVE, không mua Pro/Industry trial, Apple Developer, Mac cloud, cloud build hoặc phần cứng trong workflow này. Nếu cần trả phí phải báo chủ dự án quyết định riêng.

## 7. Nguồn kỹ thuật

- [Unity 6.3 system requirements](https://docs.unity3d.com/6000.3/Documentation/Manual/system-requirements.html).
- [Unity 6.3 iOS environment setup](https://docs.unity3d.com/6000.3/Documentation/Manual/ios-environment-setup.html): Unity tạo Xcode project; build iOS locally cần Xcode trên macOS.
- [Unity Student activation](https://id.unity.com/en/verification/student/success): đăng nhập đúng Student Unity ID trong Hub; kết quả tại máy vẫn phải kiểm tra.
