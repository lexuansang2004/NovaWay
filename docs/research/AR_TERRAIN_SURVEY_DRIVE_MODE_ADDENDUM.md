# AR Terrain — Survey Mode và Drive Mode Addendum v0.1

> Micro-step tài liệu `8.0b` (`docs/ar-terrain-wide-area-baseline`). Chủ dự án làm rõ mục tiêu ngày 2026-09-21: hệ thống cần dùng dữ liệu địa hình đã quét trước để cảnh báo đủ sớm khi xe di chuyển; không chờ tới khi điện thoại ở gần địa hình mới phát hiện. Tài liệu này ghi nhận **hướng sản phẩm đã được chốt**, nhưng không tuyên bố code, dữ liệu LiDAR hay test thực địa đã tồn tại.

## 1. Vấn đề cần giải quyết

LiDAR trên điện thoại là cảm biến quét cự ly gần. Nó phù hợp để thu thập hình dạng bề mặt xung quanh người khảo sát, nhưng không phải cảm biến nhìn xa dọc cả tuyến đường khi xe đang chạy. Vì vậy không được đồng nhất:

- **phạm vi cảm biến**: khoảng không gian cục bộ mà thiết bị LiDAR đang quan sát;
- **phạm vi cảnh báo**: khoảng cách hoặc thời gian từ vị trí xe tới một địa hình nguy hiểm đã biết.

Cảnh báo sớm phải đến từ bản đồ địa hình đã được thu thập và xử lý trước. Quét LiDAR thời gian thực khi đang di chuyển chỉ có thể là nguồn bổ sung về sau, không phải điều kiện để chế độ lái hoạt động.

## 2. Kiến trúc hai chế độ

### 2.1. Survey Mode — chế độ khảo sát

Chạy trên thiết bị có LiDAR Scene Reconstruction, dự kiến là iPhone 16 Pro hoặc một thiết bị tương đương được kiểm tra capability tại runtime.

```text
LiDAR scan cục bộ
  → mesh AR-local
  → PLY
  → RTK WGS84 / local ENU
  → mesh georeferenced
  → rút trích điểm hoặc vùng cần cảnh báo
  → terrain catalog có version
```

- Ô **10×10 m** trong baseline hiện tại vẫn là đơn vị thí nghiệm bắt buộc để đo độ chính xác và độ ổn định.
- Mở rộng tuyến đường không có nghĩa là buộc một phiên AR quét liên tục toàn tuyến. Hướng mở rộng là ghép nhiều ô/điểm khảo sát đã georeference hoặc chỉ khảo sát những vị trí cần cảnh báo.
- Mesh và dữ liệu đo đầy đủ vẫn lưu ngoài Git theo baseline. Không đưa dữ liệu lớn vào repository.

### 2.2. Drive Mode — chế độ lái xe

Chạy được trên thiết bị không có LiDAR, bao gồm iPhone 11 Pro. Chế độ này chỉ cần các capability phù hợp như vị trí, hướng di chuyển, tốc độ và dữ liệu địa hình đã quét sẵn.

```text
GPS + heading + speed + route/corridor
  → truy vấn terrain catalog phía trước
  → tính khoảng cách và thời gian tới cảnh báo
  → lọc trùng / ưu tiên mức độ
  → cảnh báo giao diện + âm thanh/rung
```

- Không mở AR session hoặc giả vờ tạo mesh trên thiết bị không có LiDAR.
- Khoảng nhìn trước là cấu hình theo tốc độ/thời gian phản ứng, không hard-code thành cự ly của cảm biến LiDAR.
- Trong prototype nghiên cứu trước buổi bảo vệ, catalog có thể là file local/offline đã tạo từ dữ liệu khảo sát. Việc đưa dữ liệu thật vào `terrain_warnings`/API NovaWay là integration Post-MVP riêng, không âm thầm thêm vào track `8.x`.

## 3. Tính độc lập thiết bị

Việc dùng MacBook Air M3 và iPhone 11 Pro để build/test không làm phần mềm bị khóa vào hai thiết bị này.

- Build iOS cần macOS/Xcode, nhưng binary có thể hỗ trợ nhiều model iPhone nếu deployment target và capability gate phù hợp.
- Survey Mode chỉ hiện khi runtime xác nhận Scene Reconstruction/LiDAR được hỗ trợ.
- Drive Mode không phụ thuộc LiDAR và phải có fallback rõ ràng, nên có thể chạy trên nhóm thiết bị rộng hơn.
- Mọi phần phụ thuộc nền tảng phải đi qua adapter/capability interface; business logic cảnh báo không import trực tiếp implementation LiDAR hoặc một model iPhone cụ thể.

## 4. Chế độ hiển thị trực quan

Ba thuật ngữ góc nhìn được ghi nhận, nhưng không mặc định biến cả ba thành chế độ runtime ngang hàng. Thiết kế phải ưu tiên khả năng hiểu nhanh và an toàn khi lái xe.

### 4.1. Góc nhìn thứ nhất — First-Person Perspective (FPP)

Camera ở vị trí gần với mắt/người quan sát và hiển thị môi trường phía trước.

- **Survey Mode:** đây là góc nhìn chính để người khảo sát thấy camera thật, lưới mesh đang được tạo, trạng thái tracking và vùng đã/chưa quét.
- **Drive Mode:** có thể hiển thị camera phía trước với cảnh báo tối giản, nhưng không được tuyên bố điểm cảnh báo bám chính xác lên mặt đường nếu chưa có visual localization/calibration được kiểm chứng.
- Trên iPhone 11 Pro, FPP không được hiển thị mesh LiDAR giả. Nếu chỉ dùng dữ liệu bản đồ quét sẵn, UI phải ghi rõ đây là cảnh báo dựa trên vị trí/bản đồ.
- Không yêu cầu thao tác camera kiểu game; thông tin phải đọc được nhanh, không che khuất đường và không khuyến khích người lái nhìn màn hình lâu.

### 4.2. Góc nhìn thứ hai — Second-Person Perspective

Người dùng điều khiển phương tiện nhưng quan sát từ camera của một chủ thể/camera khác. Chế độ này phụ thuộc camera ngoài, đồng bộ mạng và một hệ quy chiếu khác, đồng thời khó dùng an toàn khi đang lái.

- **Không đưa vào Drive Mode thời gian thực của prototype.**
- Chỉ có thể nghiên cứu sau dưới dạng replay từ camera ngoài/camera khảo sát, phục vụ phân tích hoặc thuyết trình; không phải Definition of Done.
- Không dùng góc nhìn này làm nguồn xác định vị trí phương tiện hoặc thay thế GPS/heading.

### 4.3. Góc nhìn thứ ba — Third-Person Perspective (TPP)

Camera ảo đặt phía sau/trên cao; trong NovaWay, cách triển khai phù hợp nhất là bản đồ nhìn từ trên hoặc góc xiên có biểu tượng phương tiện, tuyến đường và vùng cảnh báo phía trước.

- Đây là **góc nhìn chính của Drive Mode** vì cho người dùng thấy tổng quan khoảng cách, hướng tiếp cận và nhiều cảnh báo trên hành lang sắp đi qua.
- Camera ảo có thể bám theo phương tiện nhưng không cho người lái xoay/điều khiển phức tạp khi xe đang chạy.
- Cần có lựa chọn North-up/Heading-up hoặc một mặc định rõ ràng; mọi chuyển đổi phải giữ vị trí cảnh báo ổn định và không làm người dùng hiểu nhầm hướng.
- iPhone 11 Pro phải chạy được TPP từ terrain catalog đã quét sẵn mà không cần LiDAR.

### 4.4. Quy tắc chuyển chế độ

- Mặc định khi lái: TPP/map overview + âm thanh/rung; FPP chỉ là chế độ bổ sung.
- Mặc định khi khảo sát: FPP/AR mesh; TPP có thể dùng để xem vị trí các ô scan đã georeference.
- Không tự động chuyển qua lại liên tục khi phương tiện đang chạy.
- Nếu camera, AR hoặc tracking không khả dụng, hệ thống quay về TPP thay vì màn hình trống hoặc crash.
- Mọi cảnh báo quan trọng phải hiểu được bằng âm thanh/rung và nội dung chữ ngắn; không phụ thuộc duy nhất vào đồ hoạ 3D.

## 5. Phạm vi luận văn được giữ an toàn

Baseline khoa học hiện tại không bị thay bằng cam kết quét cả thành phố:

1. Bắt buộc trước: hoàn thành `8.1b`, mesh LiDAR thật 10×10 m, PLY, georeference, Measurement Gate, Accuracy KPI và performance evidence theo baseline.
2. Pilot cảnh báo sớm chỉ dùng **một hành lang thử nghiệm có kiểm soát** và một catalog nhỏ có version; không tuyên bố bao phủ mạng đường thực tế.
3. Không cam kết phát hiện tự động mọi ổ gà/vật cản hoặc dùng kết quả làm hệ thống điều khiển xe.
4. Nếu thiếu thiết bị LiDAR thật, có thể phát triển/test Drive Mode bằng fixture nhưng phải ghi `SYNTHETIC/FIXTURE`; không được gọi đó là dữ liệu quét LiDAR thật.
5. Bất kỳ implementation nào cho pilot cảnh báo sớm phải có micro-step/branch/test gate riêng trước khi code; tài liệu này không cho phép gộp tính năng vào branch tooling `8.1b`.

## 6. Hợp đồng dữ liệu logic cho terrain catalog

Đây là hợp đồng khái niệm, chưa phải API/database migration:

| Nhóm trường | Ý nghĩa |
|---|---|
| `schema_version`, `catalog_version` | Cho phép app nhận biết định dạng và phiên bản dữ liệu |
| `coordinate_reference` | WGS84 cho vị trí toàn cầu; tham chiếu ENU/transform cho evidence nghiên cứu |
| `hazard_id`, `type`, `severity` | Định danh và phân loại cảnh báo địa hình |
| `location` hoặc `geometry` | Điểm/vùng địa lý cần cảnh báo |
| `source_scan_id`, `source_commit` | Truy vết về phiên quét và phiên bản code |
| `confidence`, `measured_at` | Chất lượng và thời điểm dữ liệu |
| `recommended_lead_time_s` | Thời gian cảnh báo mong muốn; Drive Mode chuyển thành khoảng cách theo tốc độ |

Không đưa raw mesh vào catalog cảnh báo dành cho Drive Mode. App lái xe chỉ cần dữ liệu dẫn xuất đủ nhẹ để truy vấn nhanh và hoạt động offline.

## 7. Acceptance gate cho micro-step implementation tương lai

Micro-step cảnh báo sớm chỉ được coi là đạt khi tối thiểu:

- iPhone 11 Pro tải được catalog local/offline mà không yêu cầu LiDAR;
- với ít nhất 3 điểm/vùng cảnh báo trong hành lang thử nghiệm, replay hoặc field run tạo cảnh báo **trước** khi đi qua vị trí tương ứng;
- TPP hiển thị được phương tiện, hành lang phía trước, khoảng cách/lead time và mức độ của cảnh báo; đây là view mặc định của Drive Mode;
- FPP hiển thị đúng nguồn dữ liệu (camera/AR thật hoặc cảnh báo dựa trên bản đồ), không render mesh LiDAR giả trên iPhone 11 Pro;
- khi camera/AR/tracking không khả dụng, FPP fallback về TPP không crash; Second-Person Perspective không xuất hiện trong Drive Mode runtime;
- log lưu khoảng cách, tốc độ, thời gian còn lại tới cảnh báo và thời điểm đã phát cảnh báo để đánh giá được lead time;
- cùng một cảnh báo không lặp liên tục; có cooldown/hysteresis hoặc state tương đương;
- mất GPS/heading hoặc catalog sai version tạo fallback rõ ràng, không crash;
- dữ liệu fixture và dữ liệu thực được gắn nhãn tách biệt;
- không có thay đổi `apps/*` nếu chưa có micro-step integration NovaWay được duyệt riêng.

## 8. Trạng thái thiết bị ngày 2026-09-22

| Thiết bị/công cụ | Trạng thái |
|---|---|
| Lenovo Windows | Có sẵn; `8.1a` đã hoàn tất và merge |
| MacBook Air M3 | Người dùng xác nhận đã mượn được; macOS Sequoia 15.3.1; hơn 50 GB trống; Xcode 16.4 đang được tải — chưa gọi là cài đặt/PASS |
| iPhone 11 Pro | Có sẵn; iOS 18.3.1; dùng cho `8.1b` và Drive Mode/compatibility, không có LiDAR Scene Reconstruction |
| iPhone 16 Pro | Chưa có sẵn; `8.2` và mọi bằng chứng LiDAR thật vẫn BLOCKED |

## 9. Quyết định tiếp theo

Ưu tiên thiết bị hiện tại vẫn là hoàn thành `8.1b` trên MacBook Air M3 + iPhone 11 Pro ngay khi Xcode sẵn sàng. Trong thời gian chờ tải/cài toolchain, micro-step `8.1c` được phép chạy song song trên Lenovo để dựng Drive Mode trực quan từ terrain catalog fixture local/offline. `8.1c` phải giữ nhãn `SYNTHETIC/FIXTURE`, không thêm AR Foundation/ARKit, không tạo mesh giả và không tuyên bố `8.1b`, `8.2`, iOS hay LiDAR PASS.
