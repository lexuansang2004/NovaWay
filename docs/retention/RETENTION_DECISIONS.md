# Raw GPS Retention — Sổ quyết định và phụ thuộc theo step

Đi kèm [`RAW_GPS_RETENTION_SPEC.md`](RAW_GPS_RETENTION_SPEC.md) (gọi tắt **SPEC**).

Trạng thái:
- **REVIEWED-CORE**: chấp nhận cho phạm vi tài liệu ở review độc lập; vẫn cần review implementation và test thật.
- **OPEN**: chưa chốt.
- **NEEDS_OWNER**: chỉ chủ dự án/vận hành trả lời được.
- **UNKNOWN**: chưa có bằng chứng.

Không mục nào là "approved" chỉ vì được giữ qua nhiều vòng review.

## 1. Kỹ thuật — REVIEWED-CORE (phạm vi tài liệu)

| ID | Nội dung | Phạm vi được chấp nhận | Giới hạn |
|---|---|---|---|
| D-10a | FR-RETENTION-02 = server-storage TTL theo `received_at` (SPEC §1) | Làm rõ tài liệu; không thêm requirement E; giữ 30 ngày | BEGIN ≠ giờ thu thập/visibility |
| D-11a | P-ADM (SPEC §3) | Hướng protocol, có bằng chứng prototype [P] | W/F (D-11b) và integration [I] chưa chốt/chưa chạy |
| D-15 | Đính chính thứ tự raw → dedup, PK dedup, NFR-SEC-03 theo source | Đính chính tài liệu | Không sửa migration cũ |
| D-18 | K1 là đường TTL, K2 atomic là tối ưu, K3 không chọn (SPEC §5) | Chiến lược | Index, L/N, ngân sách, job-lock chưa chốt |
| D-21 | Cận dưới L từ BEGIN tường minh + `transaction_timestamp()` (SPEC §7.1) | Nguyên tắc thiết kế | T-MEAS-01 runtime NOT_RUN |
| D-23a | Lớp kết quả theo event (SPEC §4) | Để soạn contract | Tên/field/status (D-23b) chưa duyệt |
| D-24 | Validity-before-classify; `m ≤ U` dưới G3; không đòi `m ≤ L`; breach hợp lệ ưu tiên (SPEC §7.2) | Quy tắc đánh giá | Không phải bằng chứng product PASS |
| D-27 | Một thứ tự G-TTL; công bố khi G-TTL PASS **và** G-OBS PASS cùng phạm vi/cửa sổ/provenance, đủ cửa sổ, policy đã chốt (SPEC §7.4–§7.6) | Quy tắc gate | Không phải bằng chứng product PASS; mô hình ≠ validator sản phẩm |
| G3 | Đồng hồ DB không lùi | Giả định của lập luận/mô hình | Chưa xác nhận ở môi trường phát hành |

## 2. Kỹ thuật — OPEN

| ID | Nội dung | Trạng thái | Cần gì |
|---|---|---|---|
| D-20 | X_max | **OPEN, chưa established**. Mặc định: không chứng nhận PASS; breach đã xác nhận hợp lệ vẫn FAIL | Phương án được duyệt + bằng chứng [I]/[O]. X1 chỉ là nghiên cứu (SPEC Phụ lục A); commit timestamp ("X2") đã rút |
| X1, G5, G6 | Chứng nhận hồi cứu bằng telemetry BEGIN → ACK | PROPOSED-RESEARCH, **không** approved | 6 dependency ở SPEC Phụ lục A |
| D-23b | Tên mã lỗi/field/status cho outside-window/retryable/indeterminate | OPEN | Patch `docs/API_CONTRACT.md` riêng, Lead duyệt |
| D-26 | Index cho batch DELETE theo `received_at` | OPEN | Đo hiệu năng (T-R2-09) |
| D-14a | B, P, `S_gap`, `D_max`, L, N, kích thước batch | OPEN | Benchmark trên dữ liệu tổng hợp được duyệt + vận hành |
| D-22 | T-ADM-02 trên PostgreSQL bản phát hành, qua TypeORM/pool | OPEN | [I]/[O] |
| D-20-timeout | Giá trị `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout` cho kết nối ghi | OPEN | Chốt cùng RET-1 |

## 3. Chủ dự án chọn policy

Không hỏi lại việc dữ liệu Railway cũ là demo (đã trả lời). Câu trả lời đó không cho phép xoá DB/volume hay phát sinh chi phí.

| ID | Câu hỏi | Mặc định khi chưa trả lời |
|---|---|---|
| D-10b | Có thêm giới hạn theo tuổi sự kiện E không? | Không thêm |
| D-11b | Cửa sổ offline W và dung sai tương lai F? | OPEN — chặn RET-1 |
| D-12 | Tombstone T1 (thêm `admitted_at`, metadata sống lâu hơn raw) hay T2 (từ chối dữ liệu offline cũ hơn W)? | OPEN — chặn RET-1/RET-2a |
| D-14b | Độ dài cửa sổ quan sát lại trước khi công bố | OPEN — không mở công bố |
| D-04 | Thời hạn `trip_logs.route_geometry` | OPEN — không mặc định giữ vô hạn trong câu chữ |
| D-05 | Thời hạn `biometric_verifications` | OPEN |
| D-16 | Đầu mối/quy trình yêu cầu dữ liệu | NEEDS_OWNER |
| D-17 | WEB-11 bản hẹp trước hay chờ dependency | OPEN (Lead ưu tiên chờ) |

## 4. Vận hành

| ID | Nội dung | Trạng thái |
|---|---|---|
| D-01 | Provider sinh trắc runtime | NEEDS_OWNER (backend phát hành đang offline) |
| D-02 | Điều kiện AWS nếu chọn AWS | NEEDS_OWNER (có điều kiện) |
| D-03 | Backup/bản sao DB | NEEDS_OWNER |
| D-09 | Log: nơi lưu, thời hạn | UNKNOWN |
| D-19 | Hạ tầng phát hành còn lại (credits, chi phí, quyền) | NEEDS_OWNER; dữ liệu cũ là demo (đã trả lời) |

## 5. Phụ thuộc theo step

| Step | Trạng thái | Bị chặn bởi |
|---|---|---|
| RET-0 (tài liệu) | Design review cho phạm vi docs: PASS. Tích hợp: IN PROGRESS, chờ review PR độc lập và merge | Review PR + required checks |
| RET-1 (write path P-ADM + ánh xạ lỗi) | NOT STARTED / BLOCKED | RET-0 merged **và** D-11b, D-12, D-23b, giá trị timeout kết nối ghi |
| RET-2a (tombstone T1) | NOT STARTED / BLOCKED; chỉ khi D-12 = T1 | RET-1, D-12 |
| RET-2b (cleanup K1/K2, coverage, bản ghi đo) | NOT STARTED / BLOCKED | RET-1 (+ RET-2a nếu T1), D-14a, D-26 |
| RET-3 (bằng chứng vận hành) | NOT STARTED / BLOCKED | RET-2b; môi trường phát hành đang chạy; D-20; D-14b; D-03; D-22 |
| PRIV-0 / WEB-11 | Không đổi (Privacy Content Gate OPEN) | RET-3 nếu có câu thời hạn; D-01…D-09, D-16, D-17 |

Kể cả khi PR tài liệu RET-0 đã merge, **RET-1 vẫn chưa được bắt đầu** cho tới khi W/F (D-11b), D-12, D-23b và cấu hình timeout tương ứng được chốt. X_max (D-20) vẫn OPEN.
