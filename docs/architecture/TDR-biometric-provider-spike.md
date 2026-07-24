# NovaWay — Technical Decision Record: Biometric Provider Spike (R1-8, đóng FR-BIOMETRIC-05/R-17)

> Bổ sung 07/2026. `docs/SRS.md` FR-BIOMETRIC-05 ghi "nhà cung cấp cụ thể là Open Question, chốt ở D0.4" — chưa từng chốt. `docs/RISK_REGISTER.md` R-17 ghi cùng yêu cầu. Doc này là technical spike (R1-8, `docs/roadmap/SPRINT_R1_STABILIZATION.md`, P2) đánh giá nhà cung cấp thật. **Phạm vi: chỉ chốt quyết định qua nghiên cứu, không migrate code** — `apps/backend/src/biometric/providers/mock-biometric.provider.ts` (`MockBiometricProvider`) vẫn là provider đang chạy; việc implement provider thật là PR riêng, chưa lên lịch (P2, "không khẩn cấp cho staging nội bộ").

## Decision

Chọn **AWS Rekognition Face Liveness** làm nhà cung cấp chính (primary candidate) cho FR-BIOMETRIC-05, với điều kiện bắt buộc trước khi implement thật:

1. Xác nhận qua Terms of Service/hợp đồng AWS rằng đã **tắt (opt-out)** việc AWS lưu selfie video "để cải thiện dịch vụ" — mặc định của Face Liveness là có lưu, phải tắt thủ công để thỏa mãn ràng buộc cứng "không lưu ảnh thô" (`FR-BIOMETRIC-04`, `NFR-PRIVACY-03`).
2. Xác nhận vùng dữ liệu (AWS region) và chính sách mã hóa khi truyền/lưu tạm đáp ứng yêu cầu mã hóa mạnh + giới hạn truy cập của Nghị định 13/2023/NĐ-CP.
3. Thiết kế integration sao cho **backend NovaWay không bao giờ lưu trữ ảnh/video thô** — chỉ forward payload tới AWS API và lưu lại kết quả (`success`/`failed` + timestamp), đúng interface `BiometricProvider` hiện có (`apps/backend/src/biometric/biometric-provider.interface.ts`) — không cần đổi contract.

**FPT.AI** (Vietnamese eKYC vendor) ghi nhận là candidate dự phòng — ưu tiên xem xét lại nếu AWS không khả thi về mặt hợp đồng/compliance, hoặc nếu yêu cầu pháp lý sau này đòi hỏi xử lý dữ liệu nội địa nghiêm ngặt hơn (data residency).

## Context

`ARCHITECTURE.md` §3.2 đã thiết kế `BiometricProvider` theo adapter pattern từ step `1.6` — business logic (`BiometricService`) không phụ thuộc trực tiếp vào SDK cụ thể, cho phép đổi provider mà không đổi caller. MVP hiện dùng `MockBiometricProvider` (luôn trả `success` trừ khi `payload === 'fail'`), và `VerifyDto.provider_payload` là chuỗi mờ (opaque string) chưa có schema thật. Ràng buộc cứng của dự án (không phải chỉ quy ước code): **không lưu trữ ảnh khuôn mặt thô** (`FR-BIOMETRIC-04`) và dữ liệu sinh trắc là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP — yêu cầu mã hóa khi truyền/lưu, giới hạn quyền truy cập, và hỗ trợ xóa dữ liệu trong 72 giờ khi có yêu cầu của chủ thể dữ liệu.

## Nghiên cứu (07/2026)

### AWS Rekognition Face Liveness

| Hạng mục | Chi tiết |
|---|---|
| Pricing | Tự phục vụ, minh bạch: $0.015/check (500K check đầu, US East), giảm dần theo volume ($0.0125, $0.010/check ở bậc cao hơn) |
| Data retention | **Mặc định lưu** selfie video "để cung cấp, duy trì, cải thiện tính năng" — có cơ chế **opt-out**, phải tắt thủ công để không vi phạm ràng buộc "không lưu ảnh thô" |
| Truy cập | Tự phục vụ qua AWS Console/SDK — không cần đơn xin duyệt (khác Azure) |
| Tích hợp | REST/SDK chuẩn AWS, dễ tích hợp vào NestJS backend hiện có (đã có kinh nghiệm dùng AWS-style service qua Railway/S3-compatible object storage ở phần deployment) |
| Compliance | Cần xác nhận riêng qua ToS/DPA (Data Processing Agreement) của AWS về vùng lưu trữ, mã hóa, và điều khoản opt-out cụ thể trước khi ký hợp đồng thật |

### Azure Face API (Liveness Detection)

| Hạng mục | Chi tiết |
|---|---|
| Pricing | ~$15/1,000 session (liveness), ~$1/1,000 transaction (detection/recognition cơ bản) |
| Truy cập | **Limited Access** — Face Identification/Verification/Liveness Detection bị Microsoft gate theo chính sách Responsible AI, phải điền form xin duyệt trước khi dùng production, chỉ khả dụng ở tier Standard (S0)/Enterprise (E0), không có ở Free tier |
| Rủi ro | Thời gian chờ duyệt không xác định trước — không phù hợp nếu cần triển khai nhanh; loại khỏi candidate chính vì rào cản tiếp cận |

### FPT.AI (FaceMatch / eKYC, Việt Nam)

| Hạng mục | Chi tiết |
|---|---|
| Sản phẩm | `FPT.AI Facematch` (xác thực khuôn mặt) là 1 phần trong bộ `FPT.AI eKYC` (OCR giấy tờ, Face Match, Liveness Detection, Fraud Detection, đối chiếu CSDL quốc gia C06 của Bộ Công an) |
| Pricing | **Không công khai** — tính theo giao dịch (transaction-based), cần liên hệ trực tiếp để báo giá |
| Ưu điểm | Nhà cung cấp Việt Nam — khả năng phù hợp pháp lý/lưu trữ dữ liệu nội địa tốt hơn theo tinh thần Nghị định 13/2023/NĐ-CP so với vendor nước ngoài |
| Nhược điểm cho use-case NovaWay | Gói eKYC đầy đủ rộng hơn nhu cầu thật (NovaWay chỉ cần face-match/liveness gắn với phương tiện, không cần OCR giấy tờ hay tra cứu CSDL quốc gia C06) — dùng cả gói sẽ tăng bề mặt dữ liệu nhạy cảm xử lý không cần thiết; cần làm rõ với sales liệu có gói con chỉ Face Match + Liveness tách riêng hay không |

### Regula Face SDK / FaceTec (on-device-capable)

| Hạng mục | Chi tiết |
|---|---|
| Đặc điểm | Hỗ trợ chạy liveness detection + face matching ngay trên thiết bị (mobile SDK), về lý tưởng thỏa mãn "không lưu ảnh thô" triệt để nhất vì ảnh không rời khỏi thiết bị |
| Pricing | Không công khai rõ ràng — theo license/usage, cần liên hệ vendor |
| Ghi nhận | Candidate đáng cân nhắc **khi có ngân sách để đánh giá SDK on-device riêng cho `apps/mobile`** — nằm ngoài phạm vi so sánh chính của spike này (spike tập trung vào provider có API self-serve rõ ràng để đánh giá nhanh) |

## Options

| Option | Ưu điểm | Nhược điểm | Quyết định |
|---|---|---|---|
| AWS Rekognition Face Liveness | Pricing minh bạch, tự phục vụ, không cần xin duyệt, dễ tích hợp | Mặc định lưu video, cần opt-out + xác nhận ToS/DPA trước khi dùng thật | **Chọn làm primary** |
| Azure Face API | Hệ sinh thái Microsoft trưởng thành | Limited Access — cần xin duyệt, thời gian chờ không rõ | Loại — rào cản tiếp cận quá lớn cho use-case không khẩn cấp |
| FPT.AI eKYC | Phù hợp pháp lý/dữ liệu nội địa Việt Nam | Không có pricing tự phục vụ, gói rộng hơn nhu cầu | Fallback — cân nhắc lại nếu AWS không khả thi về compliance |
| Regula Face SDK / FaceTec (on-device) | Thỏa mãn "không lưu ảnh thô" triệt để nhất (ảnh không rời thiết bị) | Ngoài phạm vi so sánh nhanh, cần đánh giá SDK mobile riêng | Ghi nhận, chưa đánh giá sâu |
| Tiếp tục `MockBiometricProvider` | Không cần đổi gì, đủ cho staging nội bộ | Không phải xác thực thật — không dùng được khi có traffic sản xuất thật | Giữ nguyên cho tới khi implement provider thật (PR riêng, ngoài phạm vi R1-8) |

## Rationale

Trong 3 candidate có API self-serve so sánh được, AWS Rekognition Face Liveness là lựa chọn hợp lý nhất cho giai đoạn hiện tại của NovaWay vì:

1. **Minh bạch & tự phục vụ** — không giống Azure (Limited Access, cần xin duyệt, thời gian chờ không xác định) hay FPT.AI (cần liên hệ sales để biết giá), AWS cho phép đánh giá/thử nghiệm ngay mà không có rào cản quy trình, phù hợp một dự án đang ở giai đoạn staging nội bộ chưa có ngân sách/quy trình mua hàng chính thức.
2. **Ràng buộc "không lưu ảnh thô" giải quyết được bằng 1 điểm cụ thể** (tắt opt-out lưu video) thay vì rủi ro mơ hồ — khác với việc phải tin tưởng chính sách nội bộ chưa công khai rõ của vendor khác.
3. **Không đóng cửa với candidate Việt Nam** — FPT.AI vẫn được ghi nhận là fallback chính đáng nếu yêu cầu data residency trở nên nghiêm ngặt hơn, nhưng không chặn quyết định hiện tại vì thiếu thông tin giá tự phục vụ.

## Consequence

- **Cập nhật (R2-6, 07/2026): đã implement.** `AwsRekognitionBiometricProvider` thật (`apps/backend/src/biometric/providers/aws-rekognition-biometric.provider.ts`) tồn tại song song `MockBiometricProvider`, chọn qua config `BIOMETRIC_PROVIDER` (mặc định vẫn `mock`). Interface `BiometricProvider` đã đủ tổng quát để nhận provider mới mà không đổi `BiometricService`/`BiometricController` ngoài việc thêm method `createSession()` (đã dự đoán đúng ở lần viết TDR này).
- **Đã xác nhận kỹ thuật (chưa phải xác nhận hợp đồng/DPA):** gọi thật `CreateFaceLivenessSession`/`GetFaceLivenessSessionResults` qua AWS SDK bằng credential sandbox cá nhân của người dùng — cả hai lệnh gọi hoạt động đúng, bao gồm nhánh lỗi (session chưa có capture thật → `LIVENESS_SESSION_NOT_SUCCEEDED`).
- **Vẫn đúng như dự đoán ban đầu:** cần xác nhận hợp đồng/DPA với AWS đã tắt lưu video trước khi bật provider thật trong bất kỳ môi trường nào xử lý dữ liệu thật (kể cả staging nếu dùng khuôn mặt thật của người dùng thử nghiệm) — **chưa làm**, `BIOMETRIC_PROVIDER` vẫn mặc định `mock`.
- `VerifyDto.provider_payload` (opaque string) đã đổi thành `session_id` theo đúng session flow của AWS Face Liveness — thêm endpoint mới `POST /api/vehicles/:id/verify/session` để tạo session trước; contract response của `POST /api/vehicles/:id/verify` không đổi (đã ghi ở `docs/API_CONTRACT.md` §4, `OPEN_ITEMS_AFTER_MVP.md` §4).

## Chưa quyết định / còn nợ (sau R2-6)

- Xác nhận chính thức qua ToS/DPA của AWS rằng opt-out lưu video hoạt động đúng như tài liệu công khai, và vùng lưu trữ/mã hóa đáp ứng Nghị định 13/2023/NĐ-CP — cần review pháp lý trước khi ký, ngoài phạm vi kỹ thuật.
- Ngân sách chính thức cho AWS Rekognition (chi phí theo lượt xác thực) khi có traffic sản xuất thật.
- Đánh giá sâu Regula Face SDK/FaceTec (on-device) như một phương án thay thế triệt để hơn nếu yêu cầu compliance sau này đòi hỏi ảnh không bao giờ rời thiết bị.
- **Xây UI capture liveness thật trên `apps/mobile`** (tích hợp AWS Amplify Face Liveness SDK) — hiện chưa có client nào (web hay mobile) có thể gọi trọn vẹn flow `verify/session` → capture → `verify` thật; verify R2-6 chỉ xác nhận 2 lệnh gọi AWS SDK phía backend hoạt động đúng qua HTTP, không phải click-through UI.
