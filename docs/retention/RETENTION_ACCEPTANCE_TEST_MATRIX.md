# Raw GPS Retention — Acceptance criteria và ma trận test

Đi kèm [`RAW_GPS_RETENTION_SPEC.md`](RAW_GPS_RETENTION_SPEC.md) (**SPEC**) và [`RETENTION_DECISIONS.md`](RETENTION_DECISIONS.md). Nguồn bằng chứng: [`RETENTION_EVIDENCE_SUMMARY.md`](RETENTION_EVIDENCE_SUMMARY.md).

Lớp bằng chứng:
- **[S]** đọc mã/tài liệu/review;
- **[M]** mô hình toán thuần — **không** phải compliance, không phải benchmark;
- **[P]** prototype PostgreSQL 16.4 local, schema thử nghiệm (RET-SPIKE-01 run-1);
- **[I]** tích hợp sản phẩm;
- **[O]** vận hành/phát hành.

Cột Actual chỉ ghi kết quả đã chạy thật, kèm lớp. [P] không thay [I]/[O]; [M] không thay [P]/[I]/[O].

Tổng run-1 của [P]: **20 PASS / 1 FAIL** (B4a FAIL giữ nguyên). Bốn quan sát chẩn đoán D0–D3 **không** được cộng vào số PASS.

Ánh xạ sang `docs/ACCEPTANCE_CRITERIA.md` §10:

| AC trong ACCEPTANCE_CRITERIA | Nhóm AC ở đây |
|---|---|
| AC-RETENTION-02 | AC-RET1-* |
| AC-RETENTION-03 | AC-RET2a-* |
| AC-RETENTION-04 | AC-RET2b-* |
| AC-RETENTION-05 | AC-RET3-01…05 |
| AC-RETENTION-06 | AC-RET3-06/07 |

## 1. Chuỗi step và phụ thuộc

Xem [`RETENTION_DECISIONS.md`](RETENTION_DECISIONS.md) §5. Tóm tắt: RET-0 → RET-1 → RET-2a (chỉ khi T1) / RET-2b → RET-3 → PRIV-0 → WEB-11.

## 2. Ma trận

| Req | Quyết định | AC | Test | Lớp | Evidence / provenance | Actual |
|---|---|---|---|---|---|---|
| FR-RETENTION-02 | D-10a | AC-RET0-01: SPEC nêu S là đại lượng TTL; không thêm requirement E; FR 30 ngày không đổi | T-RET0-01 review tài liệu | [S] | Lead design review (evidence summary §2) | Design review phạm vi docs PASS; review PR PENDING |
| — | — | AC-RET0-02: SPEC tự chứa; phần REVIEWED tách khỏi OPEN/PROPOSED-RESEARCH | T-RET0-02 review PR | [S] | PR RET-0 | PENDING |
| NFR-SEC-03, FR-SYNC-04 | D-11a | AC-RET1-01: admission là câu riêng `clock_timestamp()` sau INSERT dedup; cận trên `≤ now() + F` | T-ADM-01 | [P] | run-1 A5: kiểm theo `now()` nhận, P-ADM từ chối | PASS [P] |
| | | | T-ADM-01-APP: qua realtime **và** sync thật | [I] | — | NOT_RUN |
| NFR-SEC-03 | D-11a, D-22 | AC-RET1-02: không có INSERT dedup thành công trước khi DELETE xung đột kết thúc; COMMIT → cửa sổ quyết định; ROLLBACK → duplicate | T-ADM-02 | [P] | run-1 A3/A4 × 2 giá trị `sync_channel`: lock `transactionid`, promise chưa settle trước khi kết thúc, `returned_clock` sau mốc trước-kết-thúc | PASS [P] |
| | | | T-ADM-02-APP: qua TypeORM/pool | [I] | — | NOT_RUN |
| | | | T-ADM-02-REL: PostgreSQL bản phát hành | [O] | — | NOT_RUN |
| FR-SYNC-04 | D-12 | AC-RET1-03: writer/expiry đảo thứ tự; biên `admitted_at = c_exp − T`; biên F; cửa sổ W ± | T-ADM-03/04 | [P] | run-1 A6a/A6b/A6c/A6de | PASS [P]. Đẳng thức W chỉ kiểm bằng predicate SQL |
| | | | T-ADM-04-APP: đúng biên qua writer thật | [I] | — | NOT_RUN |
| FR-SYNC-07, FR-REALTIME-02 | D-23a, D-23b | AC-RET1-04: mỗi lỗi DB (57014, 55P03, 40P01, 25P03, COMMIT không xác định) của một event → lớp kết quả của event đó; sync không hỏng cả request | T-ADM-06 | [I] | Hiện trạng [S]: `apps/backend/src/sync/sync.service.ts:67` (`Promise.all`) | NOT_RUN |
| — | D-20 | AC-RET1-05: semantics lỗi DB tầng SQL được ghi đúng | T-ADM-05-DB | [P] | run-1 B1 (57014 → 25P02), B2a (55P03), B2b (57014), B3 (25P03 FATAL), B5 (40P01) | PASS [P] |
| | D-20 | AC-RET1-06: COMMIT không bị `statement_timeout` giới hạn; X_max không dựa vào nó | T-ADM-05-COMMIT | [P] | run-1 B4a: COMMIT thành công dù timeout 200 ms → **FAIL so với kỳ vọng harness**. D0–D3 là quan sát | FAIL [P] (giữ nguyên) |
| | D-20 | AC-RET1-07: chuỗi lệnh thật BEGIN → 3 câu → COMMIT; timeout kết nối ghi đã chốt | T-ADM-05-APP | [I] | — | NOT_RUN |
| FR-SYNC (offline) | — | AC-RET1-08: sync vẫn nhận chuyến đã kết thúc; realtime vẫn từ chối chuyến không active | T-R1-02 | [I] | Hiện trạng [S]: `apps/backend/src/sync/sync.service.ts:48–53`; `apps/backend/src/realtime/realtime.gateway.ts:131–134` | NOT_RUN |
| FR-RETENTION-02 | D-10a | AC-RET1-09: cửa sổ nhận không giới hạn E sau khi ghi | T-R1-04 | [M] | Phản ví dụ số học (nhận khi E = 29 ngày, lưu thêm 28 → E = 57) | PASS [M] |
| FR-SYNC-04 | D-12 = T1 | AC-RET2a-01: expiry `admitted_at < c_exp − T_tomb`, `T_tomb ≥ W + F`; bản phát lại cùng payload không tạo raw mới | T-R2a-01/02 | [M] + [P] | [M] mô hình admission: 0 lần lọt khi `T_tomb = W + F`, 162 khi thiếu 1, 2430 khi kiểm theo `now()`; [P] run-1 A3–A6 | PASS [M], PASS [P] (prototype) |
| | | | T-R2a-APP | [I] | — | NOT_RUN |
| FR-RETENTION-02 | D-18 | AC-RET2b-01: K1 xoá mọi dòng `≤ C` qua bảng cha đã xác minh, gồm partition biên/tháng hiện tại; không xoá `> C` | T-PART-01…03, T-R2-02/03 | [M] | Mô hình allowlist DML/DDL | PASS [M] |
| | | | T-PART-DB | [P]/[I] | — | NOT_RUN |
| | D-18 | AC-RET2b-02: K2 chỉ partition hết hạn hoàn toàn, không tháng hiện tại/sau; bảng ngoài phạm vi không bị đụng; danh tính cha sai → không xoá | T-PART-04/05, T-R2-06a/b | [M] | Mô hình allowlist | PASS [M]; DB NOT_RUN |
| | D-18 | AC-RET2b-03: K2 timeout sau N lần → fallback K1 cùng lượt; DETACH + DROP cùng commit/rollback | T-COV-01, T-R2-05 | [M] | Mô hình coverage (một cohort) | PASS [M]; DB NOT_RUN |
| | D-14a | AC-RET2b-04: lượt chỉ successful khi kiểm sau lượt không còn dòng `≤ C`; tick/restart không reset; overdue/breach theo tuổi dữ liệu | T-COV-02…04 | [M] | Mô hình coverage | PASS [M]; [I] NOT_RUN |
| | D-26 | AC-RET2b-05: hiệu năng batch/lock trong ngân sách `D_max` | T-R2-09 | [I] | — | NOT_RUN |
| FR-RETENTION-01 | — | AC-RET2b-06: `trip_logs` không bị cleanup đụng | T-R2-08 | [I] | — | NOT_RUN |
| FR-WEBPRIVACY-03 | D-21 | AC-RET3-01: L là **cận dưới** từ BEGIN tường minh; U = `clock_timestamp()` sau khi hoàn tất/sau COMMIT | **T-MEAS-01**: kiểm L ≤ snapshot ≤ U bằng barrier nhân quả, gồm writer commit giữa L và snapshot; cả simple lẫn extended protocol | [P]/[I] | — | NOT_RUN |
| | D-24 | AC-RET3-02: validate trước classify (shape/finite/`U ≥ L`/`m ≤ U`/thứ tự); không đòi `m ≤ L`; cận dưới có thể âm; record hỏng → không breach, chặn PASS, G-OBS FAIL; breach hợp lệ trong I vẫn FAIL | T-MEAS-02 (14 probe âm), T-MEAS-05 (writer giữa L và snapshot), T-MEAS-06 (lịch sử tổng hợp) | [M] | Mô hình đo v3: 14 probe âm đúng; timeline L = 10, m = 10,1, σ = 10,2, U = 10,3 hợp lệ; 0 lịch sử sạch bị đánh hỏng (điều kiện cũ `m ≤ L`: 650) | PASS [M] |
| | D-24 | AC-RET3-03: cận trên > TTL không thành breach đã xác nhận; cận dưới > TTL là confirmed | T-MEAS-03 | [P] + [M] | [P] run-1 C1/C2 POTENTIAL (oracle độc lập: dòng vắng trước deadline); C3 CONFIRMED (barrier nhân quả seq 627 → oracle seq 628–629 → DELETE); [M] | PASS [P], PASS [M] |
| | D-27 | AC-RET3-04: một thứ tự G-TTL (SPEC §7.4); breach hợp lệ trong I → FAIL kể cả khi X_max chưa có, có gap hay record hỏng; nếu không có breach thì thiếu điều kiện → INCONCLUSIVE | T-GATE-01…14 | [M] | Mô hình đo v3 (`precedence`: 4 ca FAIL) | PASS [M] |
| | D-20 | AC-RET3-05: không chứng nhận PASS khi X_max chưa established; commit timestamp không thiết lập X_max | T-XMAX-01 (timeline số học theo thứ tự nguồn REL_16_4, synchronous commit) | [M] + [S] | X từ commit timestamp (0,02) → PASS sai; X từ ACK (4,15) → INCONCLUSIVE; có bản ghi xoá → FAIL | PASS [M] |
| | D-20 | AC-RET3-05a: (chỉ nếu X1 được duyệt sau này) telemetry hồi cứu đủ 6 dependency SPEC Phụ lục A | T-XMAX-02 | [I]/[O] | — | NOT_RUN |
| | D-20 | AC-RET3-05b: X_max established theo phương án được duyệt | T-MEAS-04 | [O] | — | NOT_RUN |
| | D-27, D-14b | AC-RET3-06: công bố chỉ khi G-TTL PASS **và** G-OBS PASS, cùng phạm vi/cửa sổ/provenance, đủ cửa sổ quan sát lại, policy liên quan đã chốt | T-GATE-15…18 | [M] | Mô hình `publication`: 8 ca, chỉ ca đủ mọi điều kiện mở. Mô hình ≠ validator sản phẩm (SPEC §7.6, N3) | PASS [M] |
| | D-27, D-14b | AC-RET3-06a: như AC-RET3-06 trên môi trường phát hành; validator kiểm danh tính phạm vi/cửa sổ/provenance thật | T-R3-01, T-GATE-05 | [O] | — | NOT_RUN |
| | D-03 | AC-RET3-07: chính sách backup xác nhận, câu chữ khớp | T-R3-02 | [O] | — | NOT_RUN |
| FR-WEBPRIVACY-01…05 | D-01…D-09, D-16, D-27 | AC-PRIV0-01: mỗi câu có trace; câu thời hạn chỉ khi AC-RET3-06/06a và AC-RET3-07 đạt | T-P-02 | [S] | — | NOT_RUN |

## 3. Tổng kết theo lớp

| Lớp | Đã chạy | Kết quả |
|---|---|---|
| [P] RET-SPIKE-01 run-1 | 21 case | **20 PASS / 1 FAIL** (B4a). D0–D3: 4 quan sát, không tính |
| [M] mô hình admission/coverage/allowlist + mô hình đo v3 | Probe + lịch sử tổng hợp có seed | PASS (mô hình). Không phải compliance, không phải benchmark |
| [I] | 0 | NOT_RUN |
| [O] | 0 | NOT_RUN |
