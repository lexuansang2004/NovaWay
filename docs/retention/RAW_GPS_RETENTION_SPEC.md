# Raw GPS Retention — Đặc tả RET-0

> **Trạng thái (2026-10-21):** thiết kế đã qua review độc lập cho **phạm vi tài liệu** (Lead Codex: `PASS_FOR_RET0_DOCS_PR_SCOPE`). Tích hợp tài liệu đang **IN PROGRESS**, chờ review PR độc lập và merge.
>
> Đây **không** phải implementation baseline, không phải chứng nhận retention đang chạy, và không cho phép bắt đầu RET-1/2/3 hay phát hành WEB-11. Quyết định, phụ thuộc và phần còn mở: [`RETENTION_DECISIONS.md`](RETENTION_DECISIONS.md). AC/test: [`RETENTION_ACCEPTANCE_TEST_MATRIX.md`](RETENTION_ACCEPTANCE_TEST_MATRIX.md). Nguồn bằng chứng và giới hạn: [`RETENTION_EVIDENCE_SUMMARY.md`](RETENTION_EVIDENCE_SUMMARY.md).

Tài liệu này là **nguồn sự thật duy nhất** cho thiết kế retention raw GPS. Người triển khai không cần ghép các vòng review cũ bên ngoài repo.

Nhãn trạng thái từng mục:
- **[REVIEWED]** — phần thiết kế đã qua review độc lập ở phạm vi tài liệu. Vẫn phải qua review implementation và test thật khi triển khai.
- **[OPEN]** — chưa chốt; không được tự điền giá trị hay tự chọn khi code.
- **[PROPOSED-RESEARCH]** — hướng nghiên cứu, **không** dùng làm contract, guarantee hay để chứng nhận PASS.

Lớp bằng chứng:
- **[S]** đọc mã/tài liệu;
- **[M]** mô hình toán thuần (đồng hồ trừu tượng);
- **[P]** prototype PostgreSQL 16.4 local, schema thử nghiệm (không phải migration của app);
- **[I]** tích hợp sản phẩm;
- **[O]** vận hành/phát hành.

Hiện chỉ có [S], [M], [P]. [I] và [O] đều NOT_RUN.

## 1. Requirement gốc và cách hiểu

| Nguồn | Nội dung | Cách hiểu trong đặc tả này |
|---|---|---|
| `docs/SRS.md` FR-RETENTION-02 | Raw GPS "chỉ được lưu tối đa **30 ngày** (TTL), sau đó bị dọn dẹp tự động" | **[REVIEWED]** Server-storage TTL theo `received_at`: S = `t − received_at` ≤ 30 ngày. Không đổi 30 ngày; không thêm requirement theo tuổi sự kiện |
| `docs/SRS.md` FR-RETENTION-01 | Trip logs/summary lưu dài hạn | Không thuộc TTL raw. `trip_logs.route_geometry` là bản sao lộ trình (§9) |
| `docs/SRS.md` FR-RETENTION-03 | Dữ liệu công khai không dùng raw GPS định danh | Không đổi |
| `docs/SRS.md` NFR-SEC-03 | Idempotency `(user_id, client_event_id)` ở tầng DB cho mọi đường ghi | Enforce bằng PK của `gps_event_dedup`, không phải unique trên `raw_gps_events` (`docs/DATA_MODEL.md` §2.7) |
| `docs/SRS.md` FR-SYNC-02/04/07 | Idempotency; partial success | Giữ nguyên format FR-SYNC-07 |
| `docs/SRS.md` FR-WEBPRIVACY-03 | Không khẳng định "tự xoá sau 30 ngày" khi chưa có bằng chứng | Câu thời hạn chỉ được mở theo điều kiện công bố §7.6 |
| `docs/04_TECH_DECISION_RECORD.md` TDR-006 | TTL 30 ngày, partition theo thời gian, cleanup job | Không đổi |
| `docs/ACCEPTANCE_CRITERIA.md` AC-RETENTION-01 | Event > 30 ngày bị xoá; trip logs còn | Được chi tiết bởi AC trong ma trận |

**Không** có requirement tuổi sự kiện E = `t − event_timestamp`. Thêm giới hạn E là quyết định chủ dự án [OPEN] (D-10b). Giờ BEGIN của writer **không** đồng nghĩa giờ thu thập GPS hay giờ dòng nhìn thấy được.

## 2. Thuật ngữ, mốc thời gian, đồng hồ

| Ký hiệu | Định nghĩa | Trạng thái |
|---|---|---|
| `received_at` | `raw_gps_events.received_at DEFAULT now()` (`apps/backend/src/database/migrations/1721260000006-CreateRawGpsEventsTable.ts:32`) = thời điểm **bắt đầu transaction ghi** | Hiện có [S] |
| S | `t − received_at`; đại lượng của TTL 30 ngày | [REVIEWED] |
| E | `t − event_timestamp` | Không phải requirement |
| `event_timestamp` | Client gửi, chỉ kiểm định dạng ISO-8601 → **không tin cậy** | Hiện có [S] |
| W, F | Cửa sổ nhận `event_timestamp ∈ [c_adm − W, now_tx + F]` | Cơ chế [REVIEWED]; giá trị [OPEN] (D-11b) |
| `T_tomb` | Thời gian sống tombstone dedup, `T_tomb ≥ W + F` (chỉ khi chọn T1) | [OPEN] (D-12) |
| `admitted_at` | Cột tombstone `= now()` của transaction ghi đầu (chỉ khi chọn T1; migration **mới**) | [OPEN] (D-12) |
| TTL | 30 ngày | Requirement |
| B, P, `G_succ`, `D_max`, `S_gap` | Biên an toàn, chu kỳ, khoảng giữa hai lượt cleanup thành công, thời lượng lượt, khoảng lấy mẫu | [OPEN] (D-14) |
| X_max | Khoảng lớn nhất từ `received_at` tới khi dòng nhìn thấy được với snapshot khác | [OPEN], chưa established (§8) |

Biên và đồng hồ:
- Đúng 30 ngày là còn hạn. Cleanup xoá `received_at ≤ C`. Expiry tombstone dùng `<` nghiêm. Cửa sổ nhận bao gồm cả hai biên.
- Mọi mốc là đồng hồ máy chủ DB, so sánh trên `timestamptz` (UTC). Không dùng đồng hồ tiến trình app cho mốc tuyệt đối.
- `now()` = `transaction_timestamp()`: cố định trong transaction. `clock_timestamp()`: giờ thực. `statement_timestamp()` **không** được coi là luôn trước snapshot, vì với extended protocol snapshot có thể lấy ở Bind ([PostgreSQL 16 §9.9.5](https://www.postgresql.org/docs/16/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)).
- **G3** (giả định): đồng hồ DB không lùi. Đây là giả định của lập luận và mô hình, **chưa** xác nhận ở môi trường phát hành.

Giới hạn idempotency:
- Khoá dedup `(user_id, client_event_id)`; payload không được so sánh — bản ghi đầu thắng khi tombstone còn.
- Sau khi tombstone hết hạn, cùng id với timestamp trong cửa sổ sẽ được nhận như event mới. P-ADM (§3) bảo đảm bản phát lại **cùng payload** không lọt.
- Client đổi timestamp/payload hoặc dùng id mới thì không bị chặn. Idempotency có giới hạn theo thời gian sống tombstone.

## 3. Write path và P-ADM

### 3.1. Hiện trạng [S]

`apps/backend/src/realtime/gps-events.service.ts:36–78`:
- mỗi event một `dataSource.transaction` (`:38`);
- INSERT raw (`:39–56`), rồi INSERT dedup `ON CONFLICT DO NOTHING RETURNING` (`:58–64`);
- không trả dòng → rollback → duplicate (`:66–75`); lỗi khác ném tiếp (`:76`).

Realtime gọi tại `apps/backend/src/realtime/realtime.gateway.ts:136`; sync tại `apps/backend/src/sync/sync.service.ts:113`. Isolation: mặc định server, READ COMMITTED (TypeORM không đặt khác, `apps/backend/src/app.module.ts:30–39`).

### 3.2. Chuỗi P-ADM [REVIEWED — hướng protocol]

Áp dụng giống hệt cho realtime và sync.

| # | Lệnh | Mốc | Ghi chú |
|---|---|---|---|
| 1 | BEGIN | `received_at` = thời điểm này | Bắt đầu khoảng X_max |
| 2 | INSERT raw … RETURNING id | `received_at = now()` | Giữ thứ tự raw → dedup như source |
| 3 | INSERT dedup … ON CONFLICT DO NOTHING RETURNING | (T1) `admitted_at = now()` | Unique check: nếu tombstone đang bị xoá chưa commit, writer chờ ([Index Uniqueness Checks](https://www.postgresql.org/docs/16/index-unique-checks.html)) |
| 4 | Không trả dòng → ROLLBACK → duplicate | — | Như hiện tại |
| 5 | **Câu riêng** `SELECT clock_timestamp()` → `c_adm`; nhận khi `event_timestamp ≥ c_adm − W` và `event_timestamp ≤ now() + F` | `c_adm` lấy **sau** khi bước 3 trả về | Cấm tính `c_adm` trong câu INSERT; cấm dùng kiểm sớm hay `now()` làm cận dưới |
| 6 | Không đạt → ROLLBACK cả raw lẫn dedup → kết quả "ngoài cửa sổ nhận" | — | Tên mã [OPEN] (D-23b) |
| 7 | COMMIT | Kết thúc khoảng X_max | Kết quả có thể không xác định phía client (§4) |

Kiểm sớm cửa sổ trước bước 2 được phép để từ chối rẻ, nhưng không có giá trị quyết định.

Expiry tombstone:
- **T1**: xoá khi `admitted_at < c_exp − T_tomb`, với `c_exp` là mốc DB lấy trước DELETE; batch ngắn; chỉ đụng dedup.
- **T2**: xoá dedup cùng transaction với batch raw tương ứng; cần `W + F < 30 ngày − B`.
- Chọn T1 hay T2: [OPEN] (D-12).

**Lập luận an toàn [M]:** bản phát lại cùng payload chỉ qua bước 3 khi DELETE tombstone đã commit. Khi đó `c_adm ≥ t_del > τ + T_tomb ≥ t_e + W`, nên bước 5 từ chối. Lập luận không cần giới hạn thời gian chờ của writer.

**Bằng chứng [P]** (prototype local, xem evidence summary):
- 11/11 ca admission PASS.
- Writer chờ khoá transaction của expiry; không có RETURNING thành công trước khi DELETE kết thúc. DELETE COMMIT → cửa sổ quyết định; DELETE ROLLBACK → duplicate.
- Kiểm theo `now()` nhận payload đã hết cửa sổ, P-ADM thì từ chối.

Giới hạn của bằng chứng: hai giá trị `sync_channel` **không** phải hai transport sản phẩm; đẳng thức W chỉ kiểm bằng predicate SQL; chưa TypeORM/pool; chưa PostgreSQL bản phát hành.

### 3.3. Ca phát lại và đồng thời

| Ca | Hành vi yêu cầu |
|---|---|
| Phát lại khi tombstone còn | Duplicate, không raw mới — realtime và sync |
| Phát lại sau expiry tombstone, cùng payload | Bị cửa sổ từ chối (vì `T_tomb ≥ W + F`) |
| Cùng id, timestamp/payload khác, tombstone còn | Duplicate (bản đầu thắng) |
| Cùng id, payload khác, sau expiry | Timestamp trong cửa sổ → nhận như event mới (giới hạn §2) |
| Expiry đang xoá chưa commit + writer cùng khoá | Writer chờ. COMMIT → cửa sổ quyết định; ROLLBACK → duplicate. Không có INSERT thành công trước khi DELETE kết thúc |
| Writer gặp tombstone trước, expiry sau | Writer duplicate; expiry không bị writer chặn |
| Sync cho chuyến đã kết thúc | **Giữ** hành vi hiện tại (`apps/backend/src/sync/sync.service.ts:48–53`; `docs/API_CONTRACT.md` §7) |
| Realtime cho chuyến không active | Giữ từ chối `TRIP_NOT_ACTIVE` (`apps/backend/src/realtime/realtime.gateway.ts:131–134`) |

## 4. Lỗi DB và lớp kết quả

Quan sát [P] ở tầng SQL:

| Lỗi | SQLSTATE | Trạng thái | Dữ liệu | Lớp kết quả [REVIEWED] (D-23a) |
|---|---|---|---|---|
| Statement timeout | 57014 | Transaction aborted (25P02 tới ROLLBACK); kết nối dùng lại được sau ROLLBACK | Không lưu | retryable |
| Lock timeout (gồm chờ ở unique check) | 55P03 | Như trên | Không lưu | retryable |
| Deadlock | 40P01 | Một bên bị huỷ | Bên bị huỷ không lưu | retryable |
| Idle-in-transaction timeout | 25P03 FATAL | Kết nối bị đóng; phải bỏ khỏi pool | Không lưu | retryable |
| Lỗi/mất kết nối trong khi COMMIT | — | Không xác định phía client | Có thể đã lưu | indeterminate: gửi lại cùng `client_event_id`; dedup chống trùng nếu đã lưu |

Các lớp: accepted / duplicate / outside-window / retryable / indeterminate.

Ràng buộc:
- Mỗi lỗi DB của **một** event được ánh xạ thành kết quả của event đó. Sync không được để một event làm hỏng cả request.
  - Hiện trạng [S]: `Promise.all` tại `apps/backend/src/sync/sync.service.ts:67` — suy luận tĩnh, chưa chạy.
  - Realtime: hành vi hiện tại khi lỗi DB chưa xác minh.
- **Tên mã lỗi, field và status: [OPEN] (D-23b).** Contract hiện hành trong `docs/API_CONTRACT.md` chưa đổi.
- Chỉ retry phía server cho lỗi retryable trước COMMIT; không retry COMMIT không xác định. Số lần/backoff: [OPEN].
- Client timeout/disconnect **không** chứng minh transaction đã rollback.

## 5. Cleanup K1/K2 [REVIEWED — chiến lược]

| | **K1 — DELETE theo dòng** (đường bảo đảm TTL) | **K2 — DETACH + DROP** (tối ưu) |
|---|---|---|
| Đích | Bảng cha `public.raw_gps_events`, xác minh qua catalog (OID, `relkind = 'p'`, schema). DELETE đi qua bảng cha | Partition có `pg_inherits.inhparent` = OID cha, `relkind = 'r'`, schema `public` |
| Điều kiện | Dòng `received_at ≤ C` ở **mọi** partition đang gắn, gồm partition biên và tháng hiện tại; không xoá dòng `> C` | Upper bound (catalog, exclusive) `≤ C`; không phải tháng hiện tại/tháng sau |
| Lock | ROW EXCLUSIVE; batch ngắn, mỗi batch một transaction có `statement_timeout` | Một transaction; xact advisory lock cùng key với `ensure_raw_gps_partitions` (`apps/backend/src/database/migrations/1721260000010-EnsureRawGpsPartitions.ts:29–79`); `lock_timeout` L; retry ≤ N |
| Lỗi/khôi phục | Rollback batch; lượt sau tiếp tục | DETACH và DROP cùng commit hoặc cùng rollback; timeout sau N lần → fallback K1 trong cùng lượt |
| Bảng ngoài phạm vi | Không chạm tới được | Bị loại vì `inhparent` sai |

Thêm:
- Xác minh danh tính cha thất bại → không xoá gì; lượt không successful.
- Thứ tự lock cho mọi transaction đụng cả hai bảng: raw → dedup. Không dùng session advisory lock trên kết nối pool.
- K3 (`DETACH … CONCURRENTLY`) không chọn.

**[OPEN] — không được tự đoán khi code:**
- index cho batch DELETE theo `received_at` (D-26);
- L, N, kích thước batch, `D_max`;
- cơ chế job-lock và lock lifetime chi tiết.

## 6. Lịch và successful coverage [REVIEWED — nguyên tắc]

- Lượt bắt đầu ở `s`, cutoff `C = s − (30 ngày − B)`, xoá `received_at ≤ C`.
- **Successful coverage:** sau lượt, câu kiểm xác nhận không còn dòng `≤ C`. Một tick lịch hay một lượt kết thúc nhanh nhưng bỏ qua partition **không** phải successful.
- Điều kiện đủ: `G_succ + D_max ≤ B` và `X_max < 30 ngày − B`, với `G_succ` chỉ tính các lượt successful.
- Chạy ngay khi bootstrap. Restart/tick không reset SLA, vì tuân thủ được đo bằng tuổi dữ liệu.
- Cảnh báo `overdue` khi tuổi > `30 ngày − B + P_max + D_max`.
- Không hứa chịu mọi outage, không nới 31 ngày. B, P, ngưỡng: [OPEN].

## 7. Đo lường, G-TTL, G-OBS, công bố

### 7.1. Mốc đo [REVIEWED — nguyên tắc D-21; runtime NOT_RUN]

- **L** là **cận dưới** của một thời điểm mà dòng được đo chắc chắn tồn tại. Nguồn: `transaction_timestamp()` của BEGIN tường minh gửi trước câu đo.
- L **không** khẳng định dòng tồn tại đúng tại L: với READ COMMITTED, writer khác có thể commit sau L và trước snapshot ([Read Committed](https://www.postgresql.org/docs/16/transaction-iso.html#XACT-READ-COMMITTED)).
- **U** = `clock_timestamp()` đọc sau khi câu đo hoàn tất (với bản ghi xoá: sau COMMIT). Snapshot σ thoả L ≤ σ ≤ U.
- Phép đo thực tế: T-MEAS-01 NOT_RUN.

### 7.2. Bằng chứng và tính hợp lệ [REVIEWED — D-24]

- Mẫu `{L, U, m}`: `m = min(received_at)` thấy được trên bảng cha, `null` nếu không có dòng.
- Bản ghi xoá K1 `{L, U, m}`: DELETE … RETURNING.
- Bản ghi K2: `min(received_at)` trong transaction DETACH + DROP.

Kiểm **trước** khi phân loại:
- shape, đủ trường, số hữu hạn, `U ≥ L`;
- `m` là số (bản ghi xoá) hoặc số/`null` (mẫu);
- **`m ≤ U`** (dưới G3);
- mẫu tăng dần nghiêm theo L;
- tham số hợp lệ.

**Không** yêu cầu `m ≤ L`. Cận dưới tuổi `L − m` có thể âm và khi đó không xác nhận breach. Bằng chứng hỏng không tạo breach, chặn PASS, làm G-OBS FAIL.

### 7.3. Phân loại

| Điều kiện | Phân loại |
|---|---|
| `L − m > TTL` | CONFIRMED_BREACH |
| `L − m ≤ TTL < U − m` | POTENTIAL_BREACH (bất định đo lường): chặn công bố, không phải breach đã xác nhận |
| `U − m ≤ TTL` | WITHIN |

**Vị trí breach:** CONFIRMED khẳng định một thời điểm trong `[L, U]`. Khoảng chắc chắn `[m + TTL, L]` chỉ khi X_max đã established và < TTL. Không backfill thời điểm xoá bằng giờ sau COMMIT.

### 7.4. Thứ tự G-TTL — quy tắc duy nhất [REVIEWED — D-27]

Cho cửa sổ I = [a, b]:

| Bước | Điều kiện | G-TTL |
|---|---|---|
| 0 | I/tham số không hợp lệ | INCONCLUSIVE |
| 1 | CONFIRMED_BREACH **hợp lệ** chắc chắn nằm trong I — **kể cả khi** X_max chưa established, có gap hay record khác hỏng | **FAIL** |
| 1b | CONFIRMED_BREACH hợp lệ chạm I nhưng không chắc vị trí | INCONCLUSIVE |
| 2 | Có bằng chứng hỏng | INCONCLUSIVE |
| 3 | Coverage không đạt: cần ≥ 2 mẫu; `U_0 ≤ a`; `L_last ≥ b`; mọi `U_{i+1} − L_i ≤ S_gap` | INCONCLUSIVE |
| 4 | X_max chưa established | INCONCLUSIVE — **không chứng nhận PASS** |
| 5 | POTENTIAL_BREACH chạm I | INCONCLUSIVE |
| 6 | Headroom `max(U_i − m_i, X_max) + (U_{i+1} − L_i) > TTL` | INCONCLUSIVE |
| 7 | Còn lại | PASS (chứng nhận bằng cận trên) |

### 7.5. G-OBS

PASS khi và chỉ khi:
- coverage đạt;
- không có bằng chứng hỏng;
- mọi CONFIRMED có bản ghi breach, mọi POTENTIAL có bản ghi bất định;
- mọi lượt cleanup có bản ghi xoá.

G-OBS và G-TTL độc lập, không thay nhau.

### 7.6. Điều kiện công bố câu thời hạn [REVIEWED — D-27]

Câu thời hạn raw GPS chỉ được mở khi **tất cả** cùng đúng:
1. **G-TTL = PASS và G-OBS = PASS**;
2. cùng phạm vi dữ liệu và cùng cửa sổ quan sát lại;
3. cùng provenance (lượt chạy, phiên bản quy tắc, môi trường);
4. độ dài cửa sổ quan sát lại ≥ giá trị đã chốt (D-14b) — chưa chốt thì không mở;
5. các dependency policy liên quan đã chốt (D-03, D-04, D-09… theo phạm vi câu chữ).

Mọi kết hợp khác (TTL PASS/OBS FAIL, TTL INCONCLUSIVE/OBS PASS, cửa sổ thiếu, khác provenance, policy còn mở, có breach) **không** mở công bố.

> **Ghi chú N3 — mô hình không phải validator sản phẩm:** hàm `publicationEligible` trong mô hình review là mô hình trừu tượng nhận một kết quả và các cờ do caller cung cấp. Validator sản phẩm phải tự kiểm **danh tính thật** của phạm vi, cửa sổ, provenance và tính hợp lệ của input — không chỉ tin cờ boolean. PR tài liệu này không viết validator.

### 7.7. Lịch sử append-only

- Mỗi bản ghi có: loại, nguồn, `m`, `L`, `U`, `L − m`, `U − m`, `U − L`, TTL, trạng thái X_max, provenance, giới hạn.
- Không toạ độ, không id người dùng.
- Không xoá, không viết lại. Đổi phân loại bằng bản ghi mới dẫn tới bản cũ.

## 8. X_max (D-20) — [OPEN]

**Mặc định khi X_max chưa established:** không chứng nhận PASS. Breach đã xác nhận hợp lệ có vị trí trong I vẫn FAIL (§7.4). FR 30 ngày giữ nguyên.

### 8.1. Thành phần

| Thành phần | Cơ chế | Loại | Bằng chứng |
|---|---|---|---|
| Từng câu lệnh (gồm chờ lock) | `statement_timeout`; `lock_timeout` | Enforce được | [P] |
| Khoảng rảnh giữa các câu | `idle_in_transaction_session_timeout` → FATAL, rollback | Enforce được | [P] |
| Số câu trong transaction | Cố định bởi implementation | Code review/test | [S] sau RET-1 |
| **COMMIT** | **Không** bị `statement_timeout` giới hạn (PostgreSQL REL_16_4 tắt statement timeout trước khi xử lý commit) | **Không** enforce được bằng timeout | [P] B4a (FAIL so với kỳ vọng harness), D1/D2 (quan sát); [S] |
| Mất kết nối khi COMMIT | Kết quả không xác định | Không enforce | — |

**Không phải cận cứng:**
- "k × timeout";
- client timeout hay disconnect;
- một lần đo COMMIT nhanh;
- commit timestamp;
- quy tắc "không có deferred work" (chỉ loại một nguồn trễ).

Vệ sinh: write path không có công việc lúc COMMIT (deferred trigger/constraint). Hiện tại không có trên `raw_gps_events`/`gps_event_dedup` [S].

### 8.2. Mốc của một lần commit — phạm vi N1

Thứ tự dưới đây đọc từ mã nguồn PostgreSQL REL_16_4 [S], **chỉ minh hoạ synchronous commit thông thường trên writer/primary**:
- `xact.c` `RecordTransactionCommit`: lấy timestamp cho commit record trước `XLogFlush`/`SyncRepWaitForLSN`;
- `ProcArrayEndTransaction` sau `RecordTransactionCommit`;
- `postgres.c`: `finish_xact_command()` trước `EndCommand`.

| Mốc | Ý nghĩa | Thứ tự (synchronous commit) |
|---|---|---|
| `received_at` | `now()` lúc writer BEGIN | 1 |
| Commit timestamp được ghi (`pg_xact_commit_timestamp` khi bật `track_commit_timestamp`) | Lấy cho commit record | 2 |
| Durable | WAL flush / chờ replication đồng bộ | 3 |
| Visible | `ProcArrayEndTransaction` | 4 |
| Client ACK | CommandComplete của COMMIT | 5 |

Phạm vi:
- Bảng **không** khẳng định durability luôn trước visibility/ACK ở mọi cấu hình. Với **asynchronous commit**, ACK có thể đến trước khi WAL được flush ([PostgreSQL 16 — Asynchronous Commit](https://www.postgresql.org/docs/16/wal-async-commit.html)).
- Không mở rộng sang đọc từ replica hay cấu hình chưa kiểm. Không đổi `synchronous_commit` hay cấu hình server.

Kết luận dùng được:
- Commit timestamp **không** phải visibility. Không dùng commit timestamp để thiết lập X_max (phương án "X2" đã rút, kể cả đề nghị bật `track_commit_timestamp` cho mục đích này).
- ACK thành công của COMMIT trên đúng writer/primary là một mốc quan sát **sau** khi xử lý commit ([postgres.c — exec_execute_message](https://raw.githubusercontent.com/postgres/postgres/REL_16_4/src/backend/tcop/postgres.c)).

Hướng nghiên cứu duy nhất còn mở để có X_max ở **Phụ lục A** — không được dùng cho tới khi được duyệt riêng.

## 9. Ranh giới dữ liệu

| Dữ liệu | Nơi | Thời hạn | Trạng thái |
|---|---|---|---|
| Raw GPS | `raw_gps_events` | TTL 30 ngày theo S | Đặc tả này |
| Tombstone dedup | `gps_event_dedup` | T1: `T_tomb` (+ trễ lịch); T2: cùng raw | [OPEN] D-12 — metadata `(user_id, client_event_id[, admitted_at])` |
| Lộ trình tổng hợp | `trip_logs.route_geometry` (`apps/backend/src/trips/trips.service.ts:204–224`) | Dài hạn (FR-RETENTION-01) | [OPEN] D-04. **Xoá raw không xoá lộ trình** |
| Kết quả sinh trắc | `biometric_verifications` | Chưa có requirement | [OPEN] D-05 |
| Log máy chủ | Log realtime có `user=<id>` khi kết nối (`apps/backend/src/realtime/realtime.gateway.ts:63`) | Chưa biết | [OPEN] D-09 |
| Backup/bản sao DB | Ngoài phạm vi repo | Chưa xác nhận | [OPEN] D-03 |

Câu "raw GPS bị xoá sau 30 ngày" **không** chứng minh mọi bản sao vị trí đã xoá. Nội dung công khai phải tách raw GPS khỏi lộ trình tổng hợp, log và backup.

## Phụ lục A — X1: hướng nghiên cứu cho X_max [PROPOSED-RESEARCH / OPEN — không dùng để chứng nhận PASS]

> Phần này **không** thuộc thiết kế đã review làm guarantee. Không dùng để establish X_max, không dùng để chứng nhận PASS, không phải implementation contract (N2).

Ý tưởng:
- Chứng nhận **hồi cứu** một cửa sổ I đã kết thúc.
- Đo cho **mọi** transaction ghi, trên đồng hồ monotonic của tiến trình app, từ ngay trước khi gửi BEGIN tới ngay sau khi nhận ACK của COMMIT/ROLLBACK.
- Với synchronous commit trên writer, ACK đến sau visibility (§8.2). Vì vậy thời lượng đo được là cận trên quan sát của (visible − `received_at`) cho đúng transaction đó — với điều kiện quy đổi đồng hồ đúng.

Giả định kèm theo: **G5** — telemetry đầy đủ cho mọi transaction ghi; **G6** — sai lệch tốc độ đồng hồ client/DB nằm trong một biên.

**Dependency phải giải quyết trước khi xét duyệt X1:**
1. Tập transaction phải thực sự bao phủ mọi dòng có thể xuất hiện trong I, kể cả transaction bắt đầu trước I và ACK sau I.
2. Completion barrier để đóng tập telemetry; phát hiện writer in-flight, restart và nhiều instance.
3. Ánh xạ cửa sổ đồng hồ DB với thời lượng monotonic, không dùng sai offset hay đơn vị. Nếu ε là biên sai lệch **tốc độ** thì cần công thức và đơn vị đúng, không chỉ cộng một hằng số thời gian không suy ra được.
4. Trạng thái mất ACK và cách chứng minh đã giải quyết; không dùng một snapshot dedup đơn lẻ làm kết luận tuyệt đối khi expiry đang chạy.
5. Kiểm clock jump/lệch tốc độ theo giả định được duyệt.
6. Validation thật qua TypeORM/pool và môi trường phát hành.

Một giá trị X_obs đo được là số đo hồi cứu, không phải cận cho tương lai. Thiếu telemetry, mất ACK chưa giải quyết, restart, hoặc có đường ghi khác (insert tay, restore) → cửa sổ liên quan INCONCLUSIVE.
