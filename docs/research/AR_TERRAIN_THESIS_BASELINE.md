# AR Terrain Thesis Prototype — Baseline v1.0

> Step `8.0` (`docs/ar-terrain-thesis-baseline`) — **APPROVED**. Đây là baseline chính thức cho **AR Terrain Scanning R&D Prototype**: một prototype nghiên cứu độc lập cho báo cáo hội đồng, **không phải tính năng của sản phẩm NovaWay MVP**. Tương ứng nhánh R&D đã mô tả từ D0.4 (`docs/03_REQUIREMENT_DELTA_V0_2.md` §5.1, `docs/04_TECH_DECISION_RECORD.md` TDR-003, `docs/ARCHITECTURE.md` §7) và trạng thái hoãn ghi ở `docs/REVIEW_NOTES.md` §15 — người dùng đã chốt phạm vi/lịch trình để mở lại nhóm step `8.x`, tài liệu hoá đầy đủ ở đây và ở `docs/REVIEW_NOTES.md` §16.
>
> Nguồn sự thật: Git history, `NovaWay_COMPLETE_MICRO_STEP_PLAN.md`, tài liệu được duyệt và evidence có nguồn gốc rõ ràng. Test Windows Editor chỉ chứng minh phạm vi Windows; kết quả iOS/LiDAR/RTK phải có log, video hoặc dataset từ đúng thiết bị thật. Quyết định mới chưa commit phải được ghi rõ là thay đổi working tree, không trình bày như đã merge.
>
> **Trạng thái: step `8.0` — APPROVED / COMPLETED.** Review Manager approved step `8.0` on 2026-08-24, sau hai vòng rework (xem lịch sử đầy đủ ở `docs/REVIEW_NOTES.md` §16, không xoá) và việc chốt xong axis-conversion contract (§6) + branch-scope rule cho `8.6` (§11). Baseline này nay là căn cứ chính thức để triển khai từ step `8.1` trở đi.

> **Cập nhật vận hành được chủ dự án đồng ý ngày 2026-09-04:** làm trên Lenovo Windows trước; MacBook Air M4 hiện chưa sẵn có, người dùng sẽ báo khi có máy. Step `8.1` tách thành `8.1a` (Windows Editor bootstrap) và `8.1b` (Mac/Xcode/iPhone smoke test), với gate riêng (§11). Unity Student subscription đã ACTIVE theo xác nhận người dùng ngày 2026-09-03; kích hoạt license trên máy và các test vẫn phải được kiểm chứng. Không thay đổi phạm vi nghiên cứu, không coi quyết định này là test PASS. Xem `docs/REVIEW_NOTES.md` §20 và `docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md`.

## 1. Objective

Xây dựng một prototype AR quét mesh địa hình thật (LiDAR) trên iPhone, gắn toạ độ thật (RTK/WGS84) vào mesh, và đo được sai số định vị của mesh so với thực địa — để chứng minh tính khả thi kỹ thuật của hướng "AR Terrain Mesh" đã đặt ra từ D0.2 (`docs/03_REQUIREMENT_DELTA_V0_2.md` §5.1) như một R&D track, phục vụ báo cáo hội đồng (không phải để phát hành sản phẩm).

Prototype này là điều kiện để đóng test gate còn treo của step `8.1` gốc (nay chia thành `8.1`–`8.7`, xem §11) đã ghi ở `docs/REVIEW_NOTES.md` §15: đo FPS/nhiệt/pin/ánh sáng yếu **trên thiết bị AR thật**, việc mà môi trường dev trước đây không làm được.

## 2. In Scope

- App Unity độc lập, chạy trực tiếp trên **iPhone 16 Pro** (có LiDAR) — thiết bị chính cho mesh LiDAR thật (xem §4 về tình trạng sẵn có hiện tại).
- Quét mesh địa hình thật bằng **ARKit Scene Reconstruction** (LiDAR) — dữ liệu mesh thật, không phải overlay phẳng hay obstacle mock.
- Mesh **geometry-only**: vertices, triangle faces, normals (nếu ARKit cung cấp được); có thể tô màu đơn sắc hoặc theo độ cao (height-based coloring) để trực quan hoá; **không bắt buộc texture từ camera**.
- Khu vực quét bắt buộc: **10×10 m**.
- Georeference bằng RTK: **5 control points** để tính transform AR-local → ENU, **3 checkpoint độc lập** để đánh giá sai số thật (xem §7).
- Xuất mesh ra **PLY** hai giai đoạn: `mesh_ar_local.ply` (AR-local, step `8.3`) rồi `mesh_enu.ply` georeferenced (step `8.4`, bắt buộc — xem §9).
- Báo cáo: RMSE 3D (và theo trục East/North/Up), FPS, pin, nhiệt độ, hành vi khi mất tracking.
- Fallback trên **iPhone 11 Pro** (không có LiDAR Scene Reconstruction) — chỉ kiểm tra compatibility/failure path (xem §4).
- Build/chạy bằng Apple Account miễn phí (Personal Team), không cần Apple Developer Program trả phí.

## 3. Out of Scope

Không làm trong phạm vi prototype này — vi phạm bất kỳ mục nào dưới đây coi là lệch baseline, cần quay lại cập nhật tài liệu trước khi tiếp tục (đúng nguyên tắc `AGENTS.md`):

- Không tích hợp vào `apps/mobile` hoặc bất kỳ app nào trong `apps/` trước buổi bảo vệ.
- Không phát hành App Store/TestFlight.
- Không mua Apple Developer Program ($99/năm).
- Không dùng cloud/VPS (Virtual Private Server) hay Google VPS (Visual Positioning System) cho phép đo chính — mesh và dữ liệu ở lại local (điện thoại/Lenovo/MacBook).
- Không truyền RTK realtime trực tiếp vào ARKit trong lúc quét — RTK chỉ dùng để đo toạ độ 5 control point + 3 checkpoint bằng thiết bị RTK riêng, **không** streaming vào phiên AR.
- Không có backend/API cho prototype này — không thêm bảng hay endpoint nào vào `docs/DATA_MODEL.md`/`docs/API_CONTRACT.md` của sản phẩm chính (xem ghi chú đã thêm ở hai file đó).
- Không mở rộng diện tích quét quá 20×20 m (xem §3 "stretch goal" trong bảng dưới) trong phạm vi Definition of Done chính.
- Không cam kết sai số ≤ 2 cm hoặc dùng từ "survey-grade" — nếu hội đồng yêu cầu diện tích >50×50 m hoặc sai số bắt buộc ≤ 2 cm, iPhone LiDAR không phải phương tiện phù hợp để cam kết kết quả, và lịch trình này sẽ rủi ro cao (không nằm trong cam kết của baseline này).
- Không nhúng vào Sprint R8 (`Abuse Protection Gaps & Mobile Error-Path Coverage`) — R8 là sprint riêng của sản phẩm chính, không liên quan track R&D này.

| Hạng mục | Definition of Done chính | Stretch goal (không bắt buộc) |
|---|---|---|
| Diện tích quét | 10×10 m | 20×20 m (chỉ thử nếu 10×10 m ổn định) |
| Export mesh | `mesh_enu.ply` (georeferenced, bắt buộc — xem §9) | `mesh_enu.glb` (không được ảnh hưởng deadline PLY) |
| Accuracy KPI (RMSE 3D) | Mục tiêu **PASS** (5cm < RMSE 3D ≤ 10cm) — **đây là KPI đo lường, tách biệt khỏi Measurement Gate** (xem §8): ba trạng thái loại trừ nhau STRETCH PASS/PASS/FAIL, KPI FAIL (>10cm) không tự động làm track thất bại, chỉ đánh dấu chưa đạt ngưỡng chính xác | **STRETCH PASS** (RMSE 3D ≤ 5cm) — đồng thời cũng thoả mục tiêu chính, nhưng output chỉ ghi một trong ba trạng thái |

## 4. Thiết bị và vai trò từng thiết bị

> **Đính chính thiết bị và tình trạng sử dụng (2026-09-04):** baseline `8.0` ghi nhầm iPhone 15 Pro Max; chủ dự án đã đính chính thiết bị LiDAR dự kiến là **iPhone 16 Pro**, hiện chưa xác nhận sẵn có/chưa kiểm chứng vật lý. **Lenovo Windows và iPhone 11 Pro có sẵn; Mac chưa sẵn có.** iPhone 11 Pro chỉ được chuẩn bị khi chưa có Mac, sau đó dùng smoke test iOS `8.1b` và compatibility `8.6`; không có LiDAR Scene Reconstruction. Không dùng Windows Editor hoặc iPhone 11 Pro làm bằng chứng quét LiDAR thật. Galaxy Z Fold5/Android/ARCore không thuộc baseline. Lịch sử đính chính ở §19 và quyết định Windows-first ở §20 của `docs/REVIEW_NOTES.md`.

| Thiết bị | Vai trò |
|---|---|
| **iPhone 16 Pro** | Thiết bị chính dự kiến cho mesh LiDAR thật ở `8.2` trở đi; hiện chưa xác nhận sẵn có/chưa kiểm chứng vật lý. Cần `8.1b` PASS, cài/chạy smoke test trên chính iPhone 16 Pro và runtime Scene Reconstruction capability check trước khi triển khai LiDAR. |
| **iPhone 11 Pro** | Có sẵn theo người dùng; **không có LiDAR Scene Reconstruction**. Khi chưa có Mac: chỉ ghi nhận model/iOS/dung lượng trống và chuẩn bị cáp USB phù hợp (máy dùng Lightning). Khi có Mac: chạy smoke test `8.1b` ≥60 giây. Ở `8.6`: kiểm chứng app phát hiện và thông báo không hỗ trợ LiDAR, không giả vờ tạo mesh thật. Không coi kết nối với Lenovo là đã build/cài/chạy app iOS. |
| **MacBook Air M4 (Apple Silicon)** | Hiện **chưa sẵn có**, chưa có ngày bàn giao được xác nhận. Khi người dùng báo có máy: kiểm tra macOS/Xcode/iOS compatibility, cài đúng Unity Editor patch đã khoá trên Windows và iOS Build Support, build/ký/cài app iOS bằng Xcode. Không thay project bằng một project Mac mới. |
| **Lenovo Windows** | Máy phát triển giai đoạn hiện tại: Ryzen 7 7435HS, RAM 24 GB, RTX 4060 Laptop 8 GB, Windows 11. Được cài Hub/Editor, tạo và chạy project tối thiểu trên Windows ở `8.1a`; làm C#/test độc lập khi micro-step tương ứng được duyệt. Không chạy Xcode hoặc ký/cài app iOS locally; không dùng webcam/Editor simulation thay test LiDAR thật. |
| **Thiết bị RTK (thuê)** | Đo toạ độ WGS84 thật cho 5 control point + 3 checkpoint — không tham gia vào phiên quét AR (xem §3, §6). |

## 5. Kiến trúc Standalone

- Vị trí trong repo: **`research/ar-terrain-unity/`** — nằm **ngoài `apps/`**, đúng nguyên tắc đã ghi từ D0.4 (`docs/ARCHITECTURE.md` §7: "AR Terrain Mesh: dự án Unity/AR Foundation hoàn toàn tách biệt khỏi monorepo chính... Không merge vào `apps/mobile` cho tới khi đạt gate").
- Không có dependency nào vào `apps/backend`, `apps/web`, `apps/mobile`, hay `packages/shared-types`.
- Không gọi bất kỳ API nào của NovaWay (không xác thực, không gửi GPS qua `/realtime`, không dùng `TerrainWarningSource`/`terrain_warnings`) — dữ liệu mesh và toạ độ ở lại hoàn toàn local trên thiết bị/Lenovo/Mac.
- Repo Git hiện tại (`NovaWay`) lưu toàn bộ những gì cần để **tái tạo lại Unity project** (source code, scenes, prefabs, config assets, `.meta` tương ứng, `ProjectSettings/`, `Packages/manifest.json`+`packages-lock.json`) cộng với tài liệu/test script/manifest dataset — **không** lưu asset build lớn hay dataset thô. Danh sách đầy đủ: §16.
- Bước tạo Unity project thật diễn ra ở `8.1a` (`chore/ar-terrain-toolchain`) trên Windows: Unity 6.3 LTS, scene không-AR tối thiểu; chưa thêm AR Foundation/ARKit hoặc logic LiDAR. `8.1b` mở lại **cùng project** trên Mac, thêm iOS Build Support và kiểm chứng Xcode/iPhone. Ghi đúng patch trong `ProjectSettings/ProjectVersion.txt`, giữ package lock và `.meta`; không tự nâng phiên bản khi chuyển máy.

## 6. Coordinate Contract: RTK WGS84 → ENU, và Unity AR-local → ENU

Có **hai luồng chuyển đổi toạ độ độc lập** — không được gộp mập mờ thành một chuỗi transform duy nhất kiểu "WGS84 sang ENU rồi sang AR" như cách diễn đạt cũ (đã bị Review Manager yêu cầu sửa vì không rõ ràng):

**Luồng 1 — RTK WGS84 → local ENU** (thuần địa lý, không liên quan Unity/AR):

1. RTK cung cấp toạ độ các control point/checkpoint dưới dạng **WGS84** (lat/lon/height).
2. **Chọn một mốc làm origin** (thường là control point đầu tiên hoặc trọng tâm khu vực quét).
3. **Chuyển WGS84 → ENU (East-North-Up, đơn vị mét)** quanh origin đó bằng công thức chuyển đổi địa lý chuẩn (WGS84 ellipsoid → tangent-plane ENU tại origin) — đây là hệ toạ độ cục bộ phẳng, mục tiêu cuối cùng mà mesh phải được đưa vào.

**Luồng 2 — Unity AR-local → local ENU** (đây là transform chính cần fit, chủ đề của step `8.4`):

1. **Mesh ARKit tồn tại trong hệ toạ độ Unity world/AR-local** do **AR Foundation** cung cấp cho phiên quét (gốc = vị trí bắt đầu phiên ARKit). Lưu ý thuật ngữ: `ARWorldTrackingConfiguration` là **cấu hình ARKit native** (phía iOS), không phải convention toạ độ mà code Unity thực sự thao tác — trong Unity, toạ độ đã đi qua lớp chuyển đổi của **AR Foundation**, nên phải ghi lại convention trục **thực tế sau lớp chuyển đổi đó** (xem "Axis & handedness contract" bên dưới), không suy luận ngược từ tài liệu ARKit native. **Không được âm thầm giả định hệ AR-local đã trùng với ENU.**
2. **Dùng 5 control points** (toạ độ đã biết ở cả hai hệ: ENU từ Luồng 1, và AR-local đọc từ anchor tương ứng trong mesh — theo decision gate về marker-center picking bên dưới) để **ước lượng transform** từ AR-local sang ENU.
3. **3 checkpoint độc lập tuyệt đối không được dùng ở bước fitting này** — chỉ dùng sau khi transform đã khoá, để đánh giá sai số thật (§7, §8).

### Công thức primary transform (bắt buộc — pipeline hai bước, tường minh axis conversion)

Chỉ một công thức `p_ENU = R_AR_TO_ENU × p_AR + t_AR_TO_ENU` **không đủ** để tái lập pipeline nếu Unity AR-local và ENU khác handedness — axis/handedness conversion phải là **bước riêng, tường minh**, không giấu trong rotation. Pipeline bắt buộc gồm hai bước:

```text
p_AR_CANONICAL = C_AXIS × p_UNITY_AR
p_ENU           = R_AR_TO_ENU × p_AR_CANONICAL + t_AR_TO_ENU
```

- `p_UNITY_AR`: toạ độ Unity world/AR-local do AR Foundation cung cấp trực tiếp (input thô, chưa qua bất kỳ xử lý nào).
- `C_AXIS`: ma trận axis conversion/handedness conversion 3×3 — chuyển `p_UNITY_AR` về convention "canonical" dùng làm nguồn cho bước fit rigid transform. Áp dụng **trước** `R_AR_TO_ENU`, luôn luôn.
- `p_AR_CANONICAL`: toạ độ sau khi đã áp `C_AXIS` — đây mới là toạ độ dùng để fit transform với 5 control points.
- `R_AR_TO_ENU`: **proper rotation** của rigid transform (fit trên `p_AR_CANONICAL` ↔ ENU của 5 control points) — bắt buộc **determinant = +1** (không chứa reflection; mọi reflection/axis-flip phải nằm trong `C_AXIS`, không được lẫn vào đây).
- `t_AR_TO_ENU`: vector translation 3 thành phần, đơn vị mét.
- **Hướng transform tổng thể: AR-local (Unity) → ENU** — cố định, không được đảo chiều tuỳ tiện giữa các phần của code/tài liệu.
- **Primary rigid transform: scale = 1 cố định** (6-DoF: chỉ rotation + translation trong `R_AR_TO_ENU`/`t_AR_TO_ENU`; `C_AXIS` không phải "scale" — nó chỉ đổi convention trục/handedness, không đổi độ dài vector) — xem lý do và đối chiếu với similarity transform (diagnostic) ở mục riêng bên dưới.
- Nếu dùng quaternion cho `R_AR_TO_ENU`, phải ghi rõ **thứ tự component** (vd. `xyzw` hoặc `wxyz`), không được để mặc định ngầm.

**Nếu runtime xác nhận không cần axis conversion** (Unity AR-local convention đã trùng với convention canonical dùng để fit): `C_AXIS` **vẫn phải được lưu** trong sidecar (§9.2) dưới dạng ma trận đơn vị (identity), **kèm ghi chú lý do tại sao xác nhận không cần** — không được bỏ trống trường này.

**Nếu có flip/swap trục:** phải ghi chính xác giá trị ma trận `C_AXIS`, ghi **determinant** của nó (±1 — reflection có determinant −1), ghi rõ **thứ tự áp dụng: `C_AXIS` luôn áp dụng trước `R_AR_TO_ENU`**, và tuyệt đối không được giấu phần reflection này vào bên trong `R_AR_TO_ENU` (đó là lý do `R_AR_TO_ENU` bắt buộc determinant +1 — nếu code vô tình để reflection lẫn vào rotation, determinant sẽ ra −1 và đó là dấu hiệu lỗi cần bắt được ngay).

### Axis & handedness contract (bắt buộc, không được để người đọc đoán)

- **Target axes của `p_ENU`:** `x = East`, `y = North`, `z = Up`, đơn vị mét. `mesh_enu.ply` **phải** dùng đúng trục này — toạ độ trong file `mesh_enu.ply` là `(x=E, y=N, z=U)`, không phải trục Unity gốc.
- **Source axis convention (`source_axis_convention`):** phải ghi rõ trong `transform_ar_to_enu.json` convention trục **thực tế** của `p_UNITY_AR` — tức convention toạ độ Unity/AR Foundation cung cấp cho code thực tế sử dụng (không phải suy luận lý thuyết từ tài liệu `ARWorldTrackingConfiguration` native của ARKit) — xác nhận và ghi lại giá trị **thật** dùng trong code tại thời điểm implement.
- **Handedness:** phải ghi rõ handedness của cả source (`p_UNITY_AR`) lẫn target (ENU — thường right-handed). Nếu handedness giữa hai hệ khác nhau, việc đổi handedness/đảo trục **chính là `C_AXIS` ở trên** — một bước biến đổi riêng, tường minh, ghi lại rõ ràng (matrix, determinant) — không được giấu ngầm bên trong `R_AR_TO_ENU`.
- `rotation` trong sidecar (§9.2) **chỉ chứa `R_AR_TO_ENU`** — proper rotation sau khi đã áp `C_AXIS`, không phải một ma trận gộp cả axis-conversion lẫn rotation.
- Công thức RMSE 3D/Accuracy KPI (§8) phải dùng `p_ENU` tính đúng theo pipeline hai bước này (`C_AXIS` rồi `R_AR_TO_ENU`/`t_AR_TO_ENU`), không phải một phép biến đổi gộp không rõ ràng.
- Không được để bất kỳ chỗ nào trong code/tài liệu buộc người đọc phải tự đoán chiều áp dụng ma trận hay quy ước trục.

**Cao độ (height):** phải ghi rõ RTK đang cung cấp **ellipsoidal height** hay **orthometric height** (so với geoid), và dùng nhất quán một loại trong toàn bộ phép tính — không được trộn hai loại cao độ trong cùng phép biến đổi hoặc cùng bảng sai số.

### Primary vs diagnostic transform (khoá phương pháp, không được đổi ngầm)

- **Primary (dùng cho accuracy result chính thức trong báo cáo):** rigid transform **6-DoF** — chỉ rotation + translation, **scale cố định = 1**. Lý do: ARKit world tracking (VIO) đã là hệ đo lường mét thật ("metric"); không cho phép scale tự do trong phép tính chính.
- **Similarity transform (scale tự do, ước lượng qua Kabsch/Umeyama hoặc tương đương):** chỉ chạy như **phân tích phụ/diagnostic**, dùng để phát hiện/định lượng drift scale của ARKit VIO. Về mặt toán học, cần nói chính xác: scale ước lượng được **fit trên chính 5 control points** để giảm residual của **control points** — nó **không** đảm bảo checkpoint RMSE thấp hơn; scale ước lượng có thể làm sai số checkpoint **tăng hoặc giảm** tuỳ dữ liệu thật, không có gì đảm bảo theo một chiều cố định. Similarity **không được dùng làm primary** vì scale tự do có thể che khuất sai lệch tỉ lệ (metric scale mismatch) thật của hệ thống và khiến kết quả primary khó diễn giải (không còn phân biệt được đâu là sai số vị trí thật, đâu là do scale được fit bù lại).
- Nếu báo cáo có trình bày kết quả similarity transform, phải: (a) nêu rõ đây là kết quả diagnostic, không phải primary; (b) báo riêng giá trị scale ước lượng được; (c) vẫn giữ nguyên bảng RMSE 3D chính thức tính từ rigid transform (primary, scale=1) bên cạnh, không xoá/thay thế.

**Decision gate bắt buộc trước khi bắt đầu code step `8.4`:** phải khoá phương pháp xác định toạ độ AR-local của **tâm khảo sát** cho cả 8 mốc vật lý (5 control + 3 checkpoint) trước khi viết code georeference, cụ thể:

- Mỗi marker vật lý phải có một **tâm khảo sát xác định rõ ràng** (vd. tâm hình học của tấm marker in sẵn, hoặc điểm đánh dấu cụ thể trên mốc).
- App phải ghi lại toạ độ AR-local của **đúng tâm đó** — không lấy tuỳ ý một điểm gần đúng trên mesh.
- **Cùng một phương pháp** (thủ công chọn điểm trên point cloud/mesh trong Unity Editor hoặc trong app, hay raycast tự động từ ảnh/anchor) phải áp dụng nhất quán cho **cả 5 control point lẫn 3 checkpoint** — không được dùng phương pháp khác nhau giữa hai nhóm.
- Toạ độ của 3 checkpoint **không được đưa vào bước fitting transform** (đã nêu ở bước 6 trên) — nhắc lại rõ ràng ở đây vì đây là nơi dễ nhầm lẫn nhất khi implement.
- Phải ghi lại **sai số/độ lặp lại (repeatability)** của thao tác chọn tâm marker (vd. chọn lại cùng một marker nhiều lần, đo độ lệch giữa các lần chọn) — đây là một nguồn sai số độc lập với sai số georeference, cần tách bạch khi phân tích nguyên nhân nếu RMSE vượt ngưỡng (§8).
- **Baseline này CHƯA khoá cụ thể** phương pháp thủ công hay tự động (raycast) sẽ dùng — đây là một **quyết định implementation-time bắt buộc phải chốt, viết thành tài liệu, và được review** trước khi bắt đầu viết code cho step `8.4`. Không được để tới lúc đã có dữ liệu RTK thật ngoài thực địa mới chọn phương pháp (rủi ro: chọn phương pháp có lợi cho kết quả sau khi đã biết trước sai số quan sát được).

## 7. Thiết kế 5 Control Point + 3 Checkpoint

- **Tổng cộng đúng 8 mốc vật lý** đặt trong/quanh khu vực quét.
- **5 control points**: dùng để tính phép căn chỉnh AR → ENU (§6 bước 4). Phải phân bố quanh khu vực quét, **không thẳng hàng và không tập trung vào một góc** (để phép biến đổi ổn định số học, tránh ill-conditioning).
- **3 checkpoints độc lập**: **tuyệt đối không dùng khi tính transform** — chỉ dùng sau khi transform đã khoá, để đánh giá sai số thực tế của mesh đã căn chỉnh.
- Mỗi mốc cần: toạ độ RTK (WGS84 + trạng thái FIX/FLOAT), vị trí tương ứng đọc được trong mesh/AR-local (đánh dấu bằng marker vật lý nhận diện được cả ngoài thực địa lẫn trong mesh quét).

## 8. Công thức RMSE 3D

Với mỗi checkpoint độc lập `i` (i = 1..3, không phải control point):

```text
ΔE_i = E_rtk,i − E_mesh,i   (sai số hướng Đông, mét)
ΔN_i = N_rtk,i − N_mesh,i   (sai số hướng Bắc, mét)
ΔU_i = U_rtk,i − U_mesh,i   (sai số độ cao, mét — cùng một loại height, xem §6)

error_3D_i = sqrt(ΔE_i² + ΔN_i² + ΔU_i²)   -- sai số 3D từng checkpoint
```

RMSE 3D trên toàn bộ 3 checkpoint độc lập:

```text
RMSE_3D = sqrt( (1/n) * Σ_{i=1}^{n} (ΔE_i² + ΔN_i² + ΔU_i²) ),  n = 3
```

Ngoài RMSE 3D tổng hợp, báo cáo (§12) phải có thêm:

- RMSE ngang: `RMSE_horizontal = sqrt( (1/n) * Σ (ΔE_i² + ΔN_i²) )`.
- RMSE cao độ: `RMSE_vertical = sqrt( (1/n) * Σ ΔU_i² )`.
- Bảng sai số `ΔE`, `ΔN`, `ΔU`, `error_3D` cho **từng checkpoint riêng lẻ** (không chỉ số RMSE tổng).

**Không được tuyên bố "survey-grade" hoặc sai số 1–2 cm** nếu chưa có dữ liệu thật chứng minh.

### Measurement Gate vs Accuracy KPI (hai gate tách biệt, không được gộp lẫn)

Track `8.x` có **hai** tiêu chí đánh giá độc lập ở bước georeference/validation — kết quả của một cái **không quyết định** kết quả của cái kia:

**1. Measurement Gate — PASS/FAIL, hoàn toàn không phụ thuộc trị số RMSE:**

- [ ] 5 control points hợp lệ (đo được, phân bố đúng §7, không thẳng hàng/tập trung một góc).
- [ ] Transform (rigid, primary — xem §6) đã tính và **khoá** (không còn chỉnh sửa sau khi bắt đầu đánh giá checkpoint).
- [ ] 3 checkpoint độc lập đã đo, xác nhận **chưa từng** được đưa vào bước fitting transform.
- [ ] Công thức tính (§8) và **toàn bộ raw data** (toạ độ RTK, toạ độ AR-local từng điểm, transform parameters) được ghi lại đầy đủ.
- [ ] Không loại bỏ điểm đo nào khỏi tập dữ liệu báo cáo.
- [ ] Kết quả **tái tính được** từ raw data đã lưu (người khác chạy lại công thức trên cùng raw data phải ra cùng con số).

Measurement Gate PASS khi và chỉ khi cả 6 điều kiện trên đều đúng — **không liên quan gì tới việc RMSE 3D là bao nhiêu**.

**2. Accuracy KPI — đánh giá độc lập, chỉ có ý nghĩa sau khi Measurement Gate đã PASS. Ba trạng thái LOẠI TRỪ NHAU (output chỉ ghi đúng một trong ba, không chồng lấn):**

- **STRETCH PASS** nếu RMSE 3D ≤ **5 cm**.
- **PASS** nếu **5 cm < RMSE 3D ≤ 10 cm**.
- **FAIL** nếu RMSE 3D > **10 cm**.

Ghi chú: STRETCH PASS đồng thời cũng thoả mãn mục tiêu chính (vì ≤5cm chắc chắn cũng ≤10cm) — nhưng đây chỉ là ghi chú diễn giải, **output/test result chỉ được ghi đúng một trong ba trạng thái trên**, không được ghi "PASS và STRETCH PASS" cùng lúc như hai dòng tách biệt.

**Nếu Accuracy KPI = FAIL:**
- Track `8.x` **vẫn có thể hoàn thành gói nghiên cứu/báo cáo** — miễn Measurement Gate đã PASS (quy trình đo đúng, dữ liệu đầy đủ, trung thực).
- **Không được tuyên bố đã đạt mục tiêu độ chính xác** trong bất kỳ phần nào của báo cáo/slide/demo.
- Test result phải ghi rõ **FAIL** (không diễn giải mập mờ) kèm phân tích nguyên nhân khả dĩ: drift ARKit VIO theo thời gian/khoảng cách, sai số marker picking (xem decision gate ở §6 — bao gồm cả repeatability đã đo), điều kiện ánh sáng, góc quét, chất lượng RTK fix (FIX vs FLOAT), hoặc lỗi ở bước coordinate transform.
- **Không được** sửa hoặc loại điểm để làm đẹp kết quả — giữ nguyên toàn bộ dữ liệu đo được (đây cũng là điều kiện của Measurement Gate ở trên, nhắc lại vì đây là chỗ rủi ro cao nhất bị vi phạm).

## 9. PLY Bắt Buộc (hai giai đoạn), GLB Stretch Goal

Export mesh chia làm **hai giai đoạn riêng biệt, không gộp lẫn** — đây là điểm hay bị hiểu nhầm nên ghi rõ tường minh:

### 9.1. Step `8.3` — `mesh_ar_local.ply` (AR-local, CHƯA georeference)

- Export mesh geometry-only (vertices, triangle faces, normals nếu có) **trực tiếp trong hệ toạ độ AR-local** của phiên quét (§6) — **chưa áp transform ENU nào**, đơn vị mét (đơn vị gốc của ARKit).
- Verify: mở lại bằng công cụ độc lập với Unity (Blender, MeshLab, hoặc CloudCompare) trên Windows hoặc Mac — xác nhận vertices/triangle faces/normals hợp lý, đúng trục (không lộn Y-up/Z-up), đúng đơn vị mét.
- **File này KHÔNG được gọi là "PLY ENU" hay coi là kết quả georeferenced** — nó chỉ chứng minh mesh capture + export pipeline hoạt động đúng về mặt hình học.

### 9.2. Step `8.4` — `mesh_enu.ply` (georeferenced, bắt buộc cho Definition of Done)

Step `8.4` có **hai giai đoạn con tách biệt** (xem §11 Timeline cho lịch cụ thể) — không được coi giai đoạn (a) là đã hoàn thành georeference:

- **(a) Triển khai (05–18/10):** khoá decision gate marker-center picking; xác định và khoá `C_AXIS` (axis/handedness conversion — kể cả khi kết quả là identity, xem §6); code hoá Luồng 1 (WGS84→ENU) và Luồng 2 (`p_AR_CANONICAL = C_AXIS × p_UNITY_AR` rồi rigid transform `R_AR_TO_ENU`/`t_AR_TO_ENU`, §6); test bằng **fixture/synthetic data** (toạ độ giả lập, không phải RTK thật). Ở giai đoạn này **chưa được tuyên bố đã hoàn thành georeference thực địa** — chỉ chứng minh code chạy đúng về mặt logic/toán học.
- **(b) Field validation (19–25/10, trùng RTK field test lần 1):** dùng toạ độ RTK thật đo tại 5 control point + 3 checkpoint để chạy pipeline `C_AXIS` → rigid transform thật, tạo `mesh_enu.ply` **thật đầu tiên**. Đây mới là test gate thực địa thật sự của `8.4` (đồng thời là pilot run của Measurement Gate/Accuracy KPI ở `8.5`, §8).

Quy trình tạo `mesh_enu.ply`: sau khi `C_AXIS` đã khoá và transform `R_AR_TO_ENU`/`t_AR_TO_ENU` đã được tính và khoá (§6, pipeline hai bước, rigid 6-DoF primary, scale=1), áp cả hai bước đó lên mesh (hoặc export lại trực tiếp ở hệ ENU, đúng trục `x=E, y=N, z=U`) để tạo `mesh_enu.ply`.

Đi kèm sidecar bắt buộc **`transform_ar_to_enu.json`**, phải có đủ các trường sau (không được thiếu trường nào, không để người đọc phải đoán):

| Trường | Nội dung |
|---|---|
| `schema_version` | Phiên bản schema của file sidecar này (vd. `"1.0"`) — cho phép mở rộng sau mà không phá vỡ file cũ. |
| `source_frame` | Tên/định danh hệ toạ độ nguồn (vd. `"unity_ar_local"`). |
| `target_frame` | Tên/định danh hệ toạ độ đích (vd. `"local_enu"`). |
| `source_axis_convention` | Convention trục **thực tế** của `p_UNITY_AR` (toạ độ Unity/AR Foundation cung cấp, không phải suy luận lý thuyết từ `ARWorldTrackingConfiguration` native — xem §6 "Axis & handedness contract"). |
| `target_axis_convention` | `"x=East, y=North, z=Up"` — khớp §6. |
| `handedness` | Handedness của cả source (`p_UNITY_AR`) và target (ENU) (vd. `{"source": "left-handed", "target": "right-handed"}`). |
| `axis_conversion` | Object bắt buộc mô tả `C_AXIS` (§6) — **luôn phải có mặt**, kể cả khi là identity: `{"from_convention": "...", "to_convention": "...", "matrix_3x3": [[...]], "matrix_layout": "row-major\|column-major", "determinant": ±1, "applied_before_rotation": true}`. Nếu identity (không cần đổi trục), vẫn ghi ma trận đơn vị + ghi chú lý do xác nhận không cần trong `from_convention`/`to_convention`. |
| `matrix_layout` | `"row-major"` hay `"column-major"` cho `rotation` (`R_AR_TO_ENU`) — bắt buộc ghi rõ, không giả định. (Xem thêm `matrix_layout` riêng trong `axis_conversion` cho `C_AXIS`, có thể khác quy ước.) |
| `transform_direction` | Cố định `"AR_TO_ENU"` — khớp pipeline hai bước ở §6 (`p_AR_CANONICAL = C_AXIS × p_UNITY_AR`; `p_ENU = R_AR_TO_ENU × p_AR_CANONICAL + t_AR_TO_ENU`). |
| `rotation` | **Chỉ chứa `R_AR_TO_ENU`** — proper rotation (determinant = +1) sau khi đã áp `axis_conversion`, không gộp axis-flip. Ma trận 3×3 hoặc quaternion. Nếu quaternion: ghi rõ `quaternion_order` (`"xyzw"` hoặc `"wxyz"`). |
| `translation_m` | Vector translation `t_AR_TO_ENU`, 3 thành phần, đơn vị mét. |
| `scale_policy` | `"primary_fixed_1"` (rigid, dùng cho accuracy result chính thức) — nếu có kết quả similarity/diagnostic đính kèm riêng, ghi thêm giá trị scale ước lượng được ở trường phụ, không ghi đè lên `scale_policy` chính (§6). |
| `wgs84_origin` | `{lat, lon, height}` — mốc gốc dùng để quy đổi ENU (§6 Luồng 1). |
| `height_type` | `"ellipsoidal"` hay `"orthometric"` — khớp §6. |
| `units` | Đơn vị dùng trong toàn bộ file (`"meters"`). |
| `created_at` | Thời điểm tạo file (ISO 8601). |
| `source_commit` | Commit hash của `research/ar-terrain-unity/` tại thời điểm tạo transform này (để trace lại đúng phiên bản code đã dùng). |

- **`mesh_enu.ply` (không phải `mesh_ar_local.ply`) mới là file PLY georeferenced được yêu cầu ở Definition of Done (§15) — và chỉ tính là đạt sau giai đoạn (b) field validation với dữ liệu RTK thật, không phải giai đoạn (a) synthetic.**

### 9.3. GLB — stretch goal (step `8.7`)

- **GLB là stretch goal**, tách hẳn khỏi step `8.3`/`8.4` (xem step `8.7` ở §11) — chỉ làm nếu không ảnh hưởng tới lịch trình/deadline của PLY và RMSE. Export `mesh_enu.glb` (dựa trên mesh đã georeferenced), không phải bản AR-local. Nếu phải chọn, ưu tiên PLY + RMSE + demo mesh thật cao hơn GLB.

## 10. FPS / Pin / Nhiệt / Low-light Test

Đây là hạng mục **bắt buộc** (mandatory), không phải phần optional — validation chính thức thuộc step `8.6` (`test/ar-terrain-performance-validation`, xem §11). Có thể quan sát/ghi nhận sơ bộ ngay từ `8.2` (khi mesh capture đầu tiên chạy), nhưng báo cáo đầy đủ và test gate chính thức chốt ở `8.6`. Trong quá trình quét, phải ghi lại:

- **FPS theo thời gian** trong suốt phiên quét.
- **Mức pin trước và sau** mỗi phiên quét.
- **Thermal state** của iPhone (dùng `ProcessInfo.thermalState` phía iOS, hoặc chỉ số tương đương lộ ra qua Unity/native plugin) trước/trong/sau phiên quét.
- Hành vi khi **mất tracking** (ARKit tracking state chuyển sang limited/not-available) — app không được crash, phải có thông báo/khôi phục hợp lý.
- Hành vi trong **điều kiện ánh sáng yếu** — ghi nhận ảnh hưởng tới chất lượng mesh (không nhất thiết phải "pass/fail" cứng, nhưng phải được đo và báo cáo).
- So sánh **iPhone 16 Pro** (LiDAR, chính) với **iPhone 11 Pro** (fallback, không LiDAR) — chỉ so sánh khả năng phát hiện/thông báo không hỗ trợ, không so sánh chất lượng mesh (vì 11 Pro không tạo mesh LiDAR thật).

## 11. Timeline tới 15/11/2026

**Code freeze: 2026-11-15.** Không thêm tính năng mới sau ngày này, chỉ sửa lỗi làm hỏng demo.

| Thời gian | Micro-step | Công việc | Đầu ra bắt buộc |
|---|---|---|---|
| 24–28/08/2026 | `8.0` | Baseline tài liệu | Tài liệu này + cross-reference đồng bộ — **APPROVED** bởi Review Manager ngày 2026-08-24 |
| 04–06/09/2026 (mục tiêu Windows, chưa PASS) | `8.1a` | Windows Editor bootstrap trên Lenovo, license Student tại máy, một scene không-AR | Scene có camera/light/cube/nhãn smoke, chạy Play Mode ≥60 giây không lỗi Console; đóng/mở lại project thành công; source-control/phiên bản/evidence đúng. Không chứng minh iOS hoặc LiDAR. |
| Khi có Mac — chưa có ETA; mốc iOS cũ 06/09 hiện AT RISK | `8.1b` | Mở cùng project trên Mac, kiểm tra toolchain, build/ký/cài bằng Xcode; iPhone 11 Pro là thiết bị smoke ban đầu | Chạy app thật ≥60 giây; lặp install/launch trên iPhone 16 Pro trước `8.2`. Không coi kết quả Windows là iOS PASS. |
| 07–20/09/2026 (mục tiêu gốc, AT RISK khi chưa có Mac/thiết bị) | `8.2` | Sau `8.1b` PASS: có iPhone 16 Pro vật lý, smoke install/launch trên chính máy và runtime capability check; rồi LiDAR mesh capture | Mesh LiDAR thật trên khu vực nhỏ rồi 10×10 m; không thay bằng dữ liệu tổng hợp hoặc iPhone 11 Pro. |
| 21/09–04/10/2026 | `8.3` | Export `mesh_ar_local.ply` (AR-local, chưa georeference — §9.1) | Mesh mở được bằng Blender/MeshLab/CloudCompare, đúng trục/đơn vị mét (hệ AR-local) |
| 05–18/10/2026 | `8.4` (phần a — triển khai) | Khoá phương pháp chọn tâm marker (decision gate §6, nếu chưa chốt) → code hoá Luồng 1 (WGS84→ENU) + Luồng 2 (rigid 6-DoF primary AR-local→ENU, §6) → test bằng **fixture/synthetic test data** (không phải RTK thật) → định nghĩa schema `transform_ar_to_enu.json` (§9.2) | Code georeference chạy đúng trên dữ liệu giả lập — **chưa được tuyên bố đã hoàn thành georeference thực địa** |
| 19–25/10/2026 | `8.4` (phần b — field validation) + `8.5` pilot | **RTK field test lần 1**: đo 5 control point + 3 checkpoint thật (thuê RTK đợt 1) → hoàn thành georeference thực địa **đầu tiên** → tạo `mesh_enu.ply` thật đầu tiên → chạy **pilot** Measurement Gate/Accuracy KPI (§8) trên dữ liệu này | Bộ dữ liệu RTK thật + `mesh_enu.ply` thật đầu tiên + danh sách lỗi phát hiện được — **đây là test gate thực địa thật sự của `8.4`, đồng thời là pilot run của `8.5`** |
| 26/10–08/11/2026 | Stabilization (`fix/ar-terrain-*`, nếu phát sinh) → `8.6` **(mandatory)** | **Trước `8.6`:** nếu RTK lần 1 phát hiện bug, mỗi bug sửa trên branch riêng `fix/ar-terrain-<slug>` (xem quy tắc branch-scope ngay dưới bảng) — không sửa trên branch `test/ar-terrain-performance-validation`. **Sau khi các `fix/*` cần thiết đã pass test riêng và merge:** chạy `8.6` — performance & compatibility validation (FPS, pin, nhiệt, low-light, mất tracking, iPhone 11 Pro compatibility-only) + demo regression + evidence package | Các `fix/*` (nếu có) đã pass test riêng, merge xong → release candidate + báo cáo performance/compatibility đầy đủ + evidence package (§12) từ `8.6` |
| 09–15/11/2026 | `8.5` (chính thức) | **RTK field test lần 2** (thuê RTK đợt 2) + independent accuracy validation **chính thức** (Measurement Gate + Accuracy KPI, §8) + regression test + khoá source | Dataset chính thức + Measurement Gate PASS/FAIL + Accuracy KPI result (PASS/STRETCH PASS/FAIL), tất cả ghi trung thực + evidence package cuối cùng (**code freeze 15/11**) |
| (stretch, không ảnh hưởng deadline) | `8.7` **(stretch, optional)** | GLB export + demo hardening | `mesh_enu.glb` (nếu kịp) — có thể bỏ nếu ảnh hưởng PLY/RTK validation/code freeze |
| 16–30/11/2026 | — | Báo cáo, slide, rehearsal (phần tổng quan/phương pháp nên viết dần từ tháng 9–10, không dồn hết vào cửa sổ này) | Báo cáo hoàn chỉnh, slide, tập trình bày ≥ 3 lần |

**Dependency/gate sau quyết định Windows-first (2026-09-04):**

- `8.1a` = một micro-step độc lập trên branch hiện có `chore/ar-terrain-toolchain`; commit dự kiến: `chore: add ar terrain unity windows toolchain smoke test`. Phạm vi chỉ bootstrap/scene smoke, tài liệu/config/evidence; không gộp PLY, georeference hoặc LiDAR.
- `8.1b` = branch dự kiến `chore/ar-terrain-ios-toolchain`, chỉ tạo sau khi `8.1a` được review/merge và người dùng xác nhận có Mac; commit: `chore: add ar terrain unity ios toolchain smoke test`.
- `8.1a` PASS không làm `8.1b` PASS và không đủ mở `8.2`. Nhóm toolchain `8.1` chỉ hoàn tất khi cả hai gate đạt. Review/required CI vẫn bắt buộc trước merge; không bypass.
- PLY bằng mesh mẫu và unit test WGS84→ENU/rigid/RMSE có thể được chuẩn bị trên Windows **sau khi tách và duyệt micro-step độc lập trong plan**, không triển khai trong `8.1a`, không tự mở `8.3`/`8.4` khi gate cũ chưa đạt. Decision gate marker-center picking ở §6 vẫn giữ nguyên; không khoá `C_AXIS` runtime bằng giả định từ fixture.
- Backend/Web/MVP không phụ thuộc track AR; có thể tiếp tục các micro-step riêng đã được duyệt, không sửa `apps/*` trên branch AR này, không tự merge PR #71.
- Mac chưa có ETA: không lùi ngầm code freeze `2026-11-15` hoặc thay mốc thực địa bằng test Editor. Khi người dùng báo có máy, đánh giá lại lịch `8.1b`/`8.2` trước khi cam kết lịch phục hồi.

**Quy tắc branch-scope: không trộn bug fix vào `test/ar-terrain-performance-validation` (`8.6`):**

- `8.6` (`test/ar-terrain-performance-validation`) **chỉ** được chứa: đo FPS/pin/nhiệt, low-light, mất tracking, iPhone 11 Pro compatibility-only, regression validation, tạo báo cáo/evidence. **Không** implement bug fix trên branch này.
- Mỗi bug phát hiện sau RTK lần 1 (giai đoạn `8.4`(b)): (1) ghi lại (mô tả, mức độ ảnh hưởng); (2) sửa trên branch riêng `fix/ar-terrain-<slug>` (đặt tên theo bug cụ thể, vd. `fix/ar-terrain-marker-picking-offset`); (3) nếu cần, bổ sung micro-step/tài liệu tương ứng **trước khi code** (đúng nguyên tắc `AGENTS.md` — không code trước khi tài liệu cập nhật); (4) fix phải tự pass test riêng của nó; (5) chỉ sau đó mới merge và quay lại chạy `8.6` regression.
- Không được coi các fix "chưa biết trước sẽ phát sinh gì" là nằm sẵn trong phạm vi `8.6` — phạm vi của `8.6` được khoá cố định như liệt kê ở trên, bất kể có bao nhiêu `fix/*` branch phát sinh trước đó.

**Điều kiện cảnh báo (đưa vào Risk & Fallback, §13):**
- **Checkpoint thiết bị: chậm nhất 2026-09-06** phải xác nhận Mac và iPhone 16 Pro sẵn có để thực hiện gate iOS/LiDAR; nếu không, giữ track AR **AT RISK**. Đây là checkpoint rủi ro của kế hoạch gốc, không phải ngày người dùng đã hứa giao máy.
- Nếu hết **07/09/2026** chưa chạy mesh thật trên iPhone 16 Pro → đánh dấu timeline **AT RISK**.
- Nếu chưa export `mesh_ar_local.ply` ổn định trước **04/10/2026** → bỏ `8.7` (GLB) và mọi tính năng trình diễn phụ, tập trung PLY pipeline (`8.3`/`8.4`) + RMSE.
- Nếu RTK lần 1 (field test, tạo `mesh_enu.ply` thật đầu tiên) chưa xong trước **25/10/2026** → không được trì hoãn tới ngày bảo vệ; phải báo Review Manager ngay lập tức — đây là mốc RTK duy nhất trước code freeze để phát hiện lỗi georeference kịp sửa.

## 12. Evidence Cần Lưu

Evidence (dataset đo thực địa, video, mesh export dung lượng lớn) **lưu ngoài Git**, không commit vào repo (xem §16). Thư mục evidence bên ngoài Git đề xuất cấu trúc:

```text
<evidence-root>/ar-terrain-thesis/
  YYYY-MM-DD_windows_editor_smoke_8.1a/
    device_lenovo-windows/       (Windows Editor only — không phải iOS/LiDAR evidence)
  YYYY-MM-DD_ios_toolchain_smoke_8.1b/
    device_iphone-11-pro/         (iOS smoke only — không phải LiDAR evidence)
  2026-10-2x_benchmark_round1/
    device_iphone-16-pro/
      mesh_ar_local.ply          (output step 8.3 — AR-local, chưa georeference)
      mesh_enu.ply               (output step 8.4 — georeferenced, bắt buộc)
      transform_ar_to_enu.json   (sidecar bắt buộc đi kèm mesh_enu.ply — xem §9.2)
      mesh_enu.glb               (nếu có, stretch goal — step 8.7)
      video_scan.mp4
      rtk_control_points.csv
      rtk_checkpoints.csv
      scan_manifest.json
  2026-11-0x_official_round2/
    ...
```

Chỉ ghi thêm một dạng session/raw representation khác (vd. export định dạng ARKit gốc) vào cấu trúc trên **nếu app thực sự triển khai và tài liệu hoá rõ định dạng đó** ở step tương ứng — baseline này không giả định trước một định dạng raw cụ thể nào ngoài `mesh_ar_local.ply`/`mesh_enu.ply`/`transform_ar_to_enu.json` đã chốt ở §9.

Evidence toolchain `8.1a`/`8.1b` phải ghi OS/device, Hub/Editor version, thời điểm, kết quả thực tế và source commit; nếu source chưa commit, ghi thêm trạng thái dirty + checksum của diff, không giả vờ commit đó đã chứa source đang test. Không commit license/serial/token, Apple signing identity, UDID hoặc ảnh tài khoản chưa che thông tin cá nhân. Editor test không có RTK/scan thì ghi N/A, không điền số giả.

Quy tắc đặt tên dataset — mỗi phiên đo cần ghi (trong tên thư mục/file và/hoặc `scan_manifest.json` đi kèm):

- Ngày đo (`YYYY-MM-DD`).
- Thiết bị: `lenovo-windows` cho Editor smoke `8.1a`; `iphone-11-pro` cho iOS smoke `8.1b`/compatibility `8.6`; `iphone-16-pro` cho LiDAR thật. Ghi đúng môi trường, không gắn nhãn evidence Windows/iPhone 11 Pro thành LiDAR.
- Phiên bản app (tag/commit hash của `research/ar-terrain-unity/` tại thời điểm build).
- Điều kiện ánh sáng (mô tả ngắn: nắng gắt/nhiều mây/hoàng hôn/tối...).
- Thời lượng scan.
- Trạng thái RTK: **FIX** hay **FLOAT** cho từng điểm đo.
- Checksum (vd. SHA-256) của từng file mesh/transform/video xuất ra (`mesh_ar_local.ply`, `mesh_enu.ply`, `transform_ar_to_enu.json`, `mesh_enu.glb` nếu có) — ghi vào `scan_manifest.json` cùng thư mục, để đối chiếu tính toàn vẹn khi copy giữa thiết bị.

Bộ evidence mang tới hội đồng (không đổi so với yêu cầu người dùng đã chốt):

- Live demo quét một khu vực nhỏ.
- Video demo hoàn chỉnh 2–3 phút (dự phòng nếu demo trực tiếp lỗi).
- Mesh raw và mesh đã xử lý (processed).
- Ảnh bố trí các marker RTK ngoài thực địa.
- Bảng toạ độ marker (5 control + 3 checkpoint).
- Biểu đồ sai số tại checkpoint, RMSE ngang, RMSE cao độ, RMSE 3D.
- FPS theo thời gian; mức pin trước/sau; thermal state.
- So sánh iPhone 16 Pro và fallback iPhone 11 Pro.
- File GLB (`mesh_enu.glb`) hoặc QR để hội đồng tự xoay mô hình 3D (nếu đạt stretch goal §9.3/step `8.7`).
- Một slide nêu rõ: đây là prototype R&D, không phải thiết bị đo đạc được chứng nhận.

## 13. Risk và Fallback

| Risk | Khả năng | Ảnh hưởng | Fallback |
|---|---|---|---|
| **Mac chưa sẵn có (người dùng xác nhận 2026-09-04), iPhone 16 Pro chưa xác nhận sẵn có/chưa kiểm chứng** | Hiện hữu; chưa có ETA | Cao — gate iOS `8.1b` và LiDAR `8.2` đang chờ thiết bị, lịch gần nhất AT RISK | Làm `8.1a` trên Lenovo; checkpoint thiết bị 06/09, mesh thật đầu tiên 07/09 là mục tiêu rủi ro chứ không cam kết. Khi có máy, kiểm tra toolchain và cập nhật lịch; không dùng iPhone 11 Pro/Editor thay LiDAR. |
| Chưa chạy được mesh thật trên iPhone 16 Pro trước 07/09/2026 | Trung bình | Cao — timeline AT RISK | Ưu tiên tuyệt đối `8.1`/`8.2`, tạm hoãn mọi việc tài liệu phụ ngoài baseline |
| `mesh_ar_local.ply` (step `8.3`) chưa export ổn định trước 04/10/2026 | Trung bình | Cao | Bỏ `8.7` (GLB) và tính năng trình diễn phụ, dồn lực cho pipeline PLY (`8.3`/`8.4`) + RMSE |
| RTK đợt 1 (field test lần 1 — tạo `mesh_enu.ply` thật đầu tiên, không chỉ benchmark) trễ quá 25/10/2026 | Thấp–Trung bình | Cao | Không trì hoãn tới ngày bảo vệ — báo Review Manager ngay để cân nhắc rút phạm vi (vd. giảm xuống chỉ 10×10 m, bỏ 20×20 m) |
| Accuracy KPI FAIL (RMSE 3D > 10 cm) ở lần đo chính thức | Trung bình (chưa có dữ liệu thật để ước lượng chính xác) | Trung bình — không chặn báo cáo/Measurement Gate, chỉ đánh dấu Accuracy KPI chưa đạt (§8) | Báo cáo trung thực (§8), phân tích nguyên nhân, không sửa/loại điểm để làm đẹp số liệu |
| Apple free provisioning hết hạn (7 ngày) đúng lúc cần demo | Cao (cơ chế hệ thống, chắc chắn xảy ra nếu không rebuild định kỳ) | Trung bình | Lịch rebuild định kỳ: 14–15/11 (cài bản final), 26–27/11 (build lại đúng source đã khoá), 1 ngày trước buổi báo cáo (mở app, quét thử, kiểm tra provisioning); mang MacBook + cáp USB-C tới buổi bảo vệ để cài lại nếu cần |
| iPhone 11 Pro vô tình "giả vờ" tạo mesh thật (dùng plane detection thay LiDAR mà không cảnh báo) | Thấp nếu tuân thủ §4 | Cao — sai lệch kết quả nghiên cứu | Phát hiện sớm có thể quan sát từ `8.1`/`8.2`, nhưng test gate chính thức/bắt buộc là `8.6` (`test/ar-terrain-performance-validation`, mandatory): app phải phát hiện đúng thiết bị không có LiDAR Scene Reconstruction và hiển thị thông báo rõ ràng, không tạo mesh giả |
| Diện tích/độ chính xác yêu cầu vượt phạm vi (>50×50 m hoặc ≤2 cm bắt buộc) | Thấp (ngoài baseline đã chốt) | Cao nếu xảy ra | Không cam kết trong baseline này — nếu hội đồng yêu cầu, cần một baseline/spike riêng, không mở rộng ngầm phạm vi `8.x` hiện tại |
| Unity Student subscription đã ACTIVE (người dùng xác nhận 2026-09-03), nhưng activation trên máy chưa kiểm chứng | Cần kiểm tra ở `8.1a` | Có thể chặn Editor | Đăng nhập đúng Student Unity ID trong Hub và xác nhận license hợp lệ. Nếu lỗi, kiểm tra/support; không mua Pro/trial hoặc tự đổi Personal/native stack. Không ghi license activation PASS chỉ từ email subscription. |

## 14. Chi Phí Dự Kiến

> Đây là **ước tính (estimate)**, không phải báo giá cố định — giá RTK/marker có thể thay đổi theo nhà cung cấp, kỹ thuật viên, và di chuyển thực tế.

| Khoản | Ước tính | Ghi chú |
|---|---:|---|
| Unity Student — subscription đã ACTIVE | 0 đồng | Người dùng đã cung cấp xác nhận ngày 2026-09-03; kích hoạt trên Lenovo/Mac phải kiểm tra riêng. Không mua Unity Pro/Industry trial; tài nguyên Synty/Odin không cần cho smoke test. |
| Xcode | 0 đồng | Cài trên MacBook Air M4 |
| Apple Account miễn phí | 0 đồng | Personal Team — build/cài trực tiếp lên iPhone qua cáp, không qua App Store/TestFlight |
| Apple Developer Program | Không mua | Không cần cho phạm vi prototype này |
| Cloud/VPS | Không dùng | Mesh và dữ liệu ở lại local |
| Thiết bị (Lenovo, iPhone 11 Pro, MacBook Air M4, iPhone 16 Pro) | 0 đồng nếu sử dụng thiết bị sẵn có/mượn được như dự kiến | Hiện chỉ Lenovo và iPhone 11 Pro sẵn có; Mac và iPhone 16 Pro chưa có ETA được xác nhận. Không tự mua/thuê thiết bị hoặc Mac cloud; nếu cần phát sinh chi phí phải báo chủ dự án trước. |
| Marker/phụ kiện (tripod nhỏ, in marker, pin dự phòng) | ~100.000–500.000 đồng | Không cố định, tuỳ số lượng thực tế cần |
| RTK — hai đợt thuê (benchmark cuối tháng 10 + chính thức đầu/giữa tháng 11) | ~1–3 triệu đồng | Tổng cho cả 2 đợt, tuỳ nhà cung cấp/kỹ thuật viên/di chuyển; ưu tiên đơn vị cho thuê đã kèm tài khoản CORS/NTRIP |
| CORS/NTRIP riêng (nếu nơi thuê RTK không kèm sẵn) | Chưa ghi giá cố định | Chỉ phát sinh nếu cần — không đăng ký thuê bao dài hạn chỉ để phục vụ báo cáo |

**Tổng ước tính:** khoảng 1,1–3,5 triệu đồng cho toàn bộ track `8.x` tới buổi bảo vệ, chủ yếu là chi phí thuê RTK.

## 15. Definition of Done

Track `8.x` được coi là hoàn tất (tới mức phục vụ báo cáo hội đồng) khi **toàn bộ mục bắt buộc dưới đây** đạt — lưu ý: "hoàn tất" **không** đồng nghĩa với "Accuracy KPI PASS" (xem mục Measurement Gate/Accuracy KPI tách riêng bên dưới, đúng §8).

**Mục bắt buộc (không phụ thuộc trị số RMSE):**

- [ ] `8.1a` Windows Editor smoke và `8.1b` Mac/Xcode/iPhone smoke đều PASS theo gate riêng ở §11; việc cài Hub hoặc có Student subscription không tự làm gate nào PASS.

- [ ] App Unity chạy độc lập trên iPhone 16 Pro, tạo mesh LiDAR thật (ARKit Scene Reconstruction) trên khu vực **10×10 m**.
- [ ] iPhone 11 Pro: app phát hiện đúng thiết bị không hỗ trợ LiDAR Scene Reconstruction, hiển thị thông báo rõ ràng, không giả vờ tạo mesh thật — validation chính thức ở step `8.6` (mandatory).
- [ ] `mesh_ar_local.ply` (step `8.3`) export được, mở lại bằng công cụ độc lập (Blender/MeshLab/CloudCompare), đúng trục và đơn vị mét.
- [ ] `mesh_enu.ply` (step `8.4`, **georeferenced** — không phải `mesh_ar_local.ply`) export được, kèm sidecar `transform_ar_to_enu.json` đầy đủ (origin WGS84, height type, `axis_conversion` (`C_AXIS`, kể cả khi identity), rotation (`R_AR_TO_ENU`, proper — determinant +1), translation, scale policy, đơn vị).
- [ ] **Measurement Gate PASS** (§8): 5 control point hợp lệ, transform khoá, 3 checkpoint độc lập chưa từng dùng để fit, công thức + raw data đầy đủ, không loại điểm, kết quả tái tính được.
- [ ] Báo cáo FPS/pin/nhiệt/hành vi mất tracking/ánh sáng yếu — validation chính thức ở step `8.6` (mandatory), cho ít nhất một phiên quét đầy đủ.
- [ ] Evidence package đầy đủ theo §12, lưu ngoài Git, có checksum.
- [ ] Code freeze đúng hạn 2026-11-15, không có tính năng mới thêm sau mốc này.
- [ ] Không có thay đổi nào trong `apps/backend`, `apps/web`, `apps/mobile` do track này gây ra.

**Mục đo lường, báo cáo bắt buộc nhưng KẾT QUẢ không quyết định "hoàn tất" hay không (§8):**

- [ ] **Accuracy KPI đã được đánh giá và ghi nhận rõ ràng, đúng một trong ba trạng thái loại trừ nhau** (§8): **STRETCH PASS** (RMSE 3D ≤5cm), **PASS** (5cm < RMSE 3D ≤10cm), hoặc **FAIL** (>10cm) — bảng sai số ΔE/ΔN/ΔU/error_3D đầy đủ cho từng checkpoint, dù kết quả là trạng thái nào cũng phải báo cáo trung thực kèm phân tích nguyên nhân nếu FAIL.

**Không bắt buộc** (stretch goal, không chặn Definition of Done chính, thuộc step `8.7`): diện tích 20×20 m, export `mesh_enu.glb`, Accuracy KPI đạt STRETCH PASS (RMSE 3D ≤ 5 cm).

## 16. Quy Tắc Source Control Unity — Commit Đủ Để Tái Tạo Project, Không Commit File Lớn

Git (repo `NovaWay`) phải lưu **đủ để Unity project tái tạo lại được từ đầu** trên Windows hoặc Mac — không chỉ C# script:

- `Assets/**/*.cs` (toàn bộ source code C#).
- Unity scenes (`*.unity`).
- Prefabs.
- ScriptableObject/config assets.
- Materials/shaders cần cho demo.
- Small reference images cần thiết (vd. marker pattern dùng để nhận diện, không phải ảnh/video quét).
- **Toàn bộ file `.meta` tương ứng** với mọi asset ở trên — Unity dùng `.meta` để giữ GUID/import settings; **không được xoá `.meta` của bất kỳ asset nào đang track**, kể cả khi asset đó tưởng chừng không quan trọng, vì mất `.meta` làm vỡ tham chiếu GUID giữa các asset khác.
- `ProjectSettings/`, gồm `ProjectVersion.txt` khoá exact Editor patch để Windows/Mac dùng cùng phiên bản.
- `Packages/manifest.json` và `Packages/packages-lock.json`.
- Test code/config (nếu có test tự động cho logic transform/RMSE, tách khỏi Unity Editor state).
- `.gitignore` (riêng cho Unity, thêm ở step `8.1a`).
- Tài liệu (`docs/**`).
- Manifest/checksum của dataset (`scan_manifest.json` — JSON nhỏ, không phải bản thân dataset).

**Không commit:**

- `Library/`, `Temp/`, `Logs/`, `Obj/`, `Build/`/`Builds/` của Unity.
- `UserSettings/` và cấu hình workspace/IDE cục bộ không cần để tái tạo project.
- Xcode `DerivedData/`.
- Generated Xcode build output (project Xcode do Unity tự sinh ra khi build iOS — sinh lại được từ Unity project, không cần track).
- Video quét (raw hoặc đã dựng) dung lượng lớn.
- Raw scan (USDZ/point cloud gốc) dung lượng lớn.
- Mesh export (PLY/GLB) nếu vượt giới hạn hợp lý cho một file văn bản/binary nhỏ trong Git (ước lượng: vài MB trở xuống có thể chấp nhận cho một file mesh nhỏ minh hoạ trong tài liệu; dataset đầy đủ của từng phiên đo luôn để ngoài Git theo §12, không có ngoại lệ).
- Provisioning profile.
- Certificate/signing secret.

Toàn bộ evidence dataset thật (video, raw scan, mesh export đầy đủ của từng phiên đo) sống trong thư mục evidence bên ngoài Git (§12) — repo Git giữ đủ để tái tạo lại **Unity project** (không chỉ source/tài liệu) cộng với tài liệu, không phải kho lưu trữ dữ liệu đo thực địa.

## 17. Cross-references

- `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` — nhóm step `8.0`–`8.7`.
- `docs/03_REQUIREMENT_DELTA_V0_2.md` §5.1 — yêu cầu R&D gốc.
- `docs/04_TECH_DECISION_RECORD.md` TDR-003 — quyết định AR scope trong MVP (AR Lite) và R&D behavior (Unity AR Terrain Mesh) tách biệt.
- `docs/ARCHITECTURE.md` §7 — vị trí kiến trúc R&D tách biệt khỏi monorepo chính.
- `docs/PRD.md` §8 — R&D Track.
- `docs/RISK_REGISTER.md` — rủi ro kỹ thuật liên quan.
- `docs/roadmap/OPEN_ITEMS_AFTER_MVP.md` §1 — trạng thái trước đây (hoãn) của step `8.1` gốc, nay cập nhật theo baseline này.
- `docs/REVIEW_NOTES.md` §15 (hoãn), §16 (baseline tài liệu hoá, step `8.0` APPROVED 2026-08-24), §19 (đính chính thiết bị), §20 (Windows-first 2026-09-04).
- `docs/research/AR_TERRAIN_WINDOWS_FIRST_HANDOFF.md` — checklist triển khai và bàn giao Windows → Mac.
