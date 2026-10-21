# Raw GPS Retention — Tóm tắt bằng chứng và provenance

Tài liệu này tóm tắt đủ để reviewer trong repo hiểu nguồn, phạm vi và giới hạn của thiết kế [`RAW_GPS_RETENTION_SPEC.md`](RAW_GPS_RETENTION_SPEC.md) mà không cần mở gói audit ngoài repo.

Gói audit (thiết kế ứng viên, mô hình, harness, raw JSON, các review) **không** được commit vào repo:
- raw JSON chứa UUID tổng hợp và đường dẫn máy cá nhân;
- harness kết nối DB local.

Hash SHA-256 bên dưới chỉ để đối chiếu; **nguồn sự thật của thiết kế là các file trong `docs/retention/`**.

## 1. Baseline

| Mục | Giá trị |
|---|---|
| Base của PR | `origin/develop` = `5fc9c91f443945fb4d2c519381a68e843c993eca`, tree `ffe5c441554704d25760c7ec8f6f051e21fd4038` |
| Mọi `path:dòng` trong `docs/retention/` | Tính tại tree trên |
| Tác giả thiết kế/spike | Claude (R22 BA phối hợp Backend/Data Architect và Database QA) |
| Reviewer độc lập | Lead Codex (không phải tác giả), kèm một reviewer QA thứ hai ở các vòng retention |

## 2. Chuỗi review độc lập (tác giả không tự duyệt)

| Vòng | Quyết định của Lead | File review (ngoài repo) | SHA-256 |
|---|---|---|---|
| Revision-3 | `PASS_DIRECTION_CONDITIONAL_SPIKE` (chuyển sang spike PostgreSQL) | `WEB_11_REVISION_3_RE_REVIEW.md` | `f74028d0f5b0e2ce5e8752047d47636ff71895f021547cd745d93039e4bd9453` |
| RET-SPIKE-01 | `SCOPED_PASS_FOR_RET0_DRAFT` | `RET_SPIKE_01_INDEPENDENT_REVIEW.md` | `fee8ce454151893feaa45c5a3854017a5e3a286a79de70e15bfb85d01c4777de` |
| RET-0 candidate 1 | `CHANGES_REQUIRED_TARGETED` (RET0-R01…R03) | `RET_0_CANDIDATE_1_REVIEW.md` | `1f5221c2d8a330a77ed54e24ee98ef752832b254cc592c85b04ce6292734f0a1` |
| RET-0 candidate 2 | **`PASS_FOR_RET0_DOCS_PR_SCOPE`** — RET0-R01…R03 CLOSED; không phải implementation baseline | `RET_0_CANDIDATE_2_RE_REVIEW.md` | `e8d717f20cf45eb55b74629de0c49335f24ff551c8ddeabc3e9a7397ecae9cb4` |
| Validation của Lead (candidate 2) | Kiểm hash/artifact/model; không SQL/DB | `RET_0_CANDIDATE_2_VALIDATION.json` | `171e08ef734e633c7177dd772ead1008e5052814492ac009bba02da33a1ea2fc` |

Lead review **không** chạy lại DB hay ứng dụng. Lead kiểm artifact, hash, đọc mã nguồn tĩnh và chạy lại mô hình thuần.

Ghi chú tích hợp N1–N3 của review candidate 2 được xử lý trong SPEC:
- N1: phạm vi synchronous commit — SPEC §8.2;
- N2: X1 tách thành phụ lục nghiên cứu — SPEC Phụ lục A;
- N3: mô hình ≠ validator sản phẩm — SPEC §7.6.

## 3. Bằng chứng DB prototype [P] — RET-SPIKE-01

**Thực hiện:**
- người chạy: Claude, trước các vòng RET-0;
- PostgreSQL **16.4** (image `postgis/postgis:16-3.4-alpine`) trong container local có sẵn, READ COMMITTED;
- **một** DB riêng, tạo mới cho spike, tên và đích ghi trong manifest trước DDL, có bảng marker xác minh trước mọi lệnh ghi;
- schema **thử nghiệm**, không phải migration của app;
- không đụng DB dev hay các DB QA khác;
- DB spike được giữ lại cho reviewer, không có lệnh xoá tự động.

**Kết quả run-1: 20 PASS / 1 FAIL**

| Nhóm | Kết quả | Ý nghĩa |
|---|---|---|
| A — admission/T-ADM-02 (11 ca) | 11 PASS | `INSERT … ON CONFLICT DO NOTHING RETURNING` chờ transaction đang xoá tombstone. DELETE COMMIT → chèn được, rồi cửa sổ nhận từ chối; DELETE ROLLBACK → duplicate. Không có RETURNING thành công trước khi DELETE kết thúc. Guard theo `now()` nhận payload hết hạn; P-ADM từ chối |
| B — timeout (7 ca) | 6 PASS, **1 FAIL (B4a)** | 57014 → 25P02; 55P03; 25P03 FATAL; 40P01 như dự kiến. **B4a FAIL so với kỳ vọng harness:** COMMIT chạy deferred trigger ~0,6 s vẫn hoàn tất dù `statement_timeout` 200 ms. Giữ nguyên FAIL |
| B — chẩn đoán D0–D3 | 4 **quan sát**, không tính PASS | COMMIT ~0,608 s với `SET LOCAL` và `SET` mức session đều không bị cắt; cùng công việc trong câu lệnh thường (`SET CONSTRAINTS ALL IMMEDIATE`) bị 57014. Phù hợp mã nguồn REL_16_4 (Lead đối chiếu) |
| C — đo lường (3 ca) | 3 PASS | C1/C2: cận trên > TTL nhưng oracle độc lập xác nhận dòng đã vắng trước deadline → chỉ là bất định đo lường. C3: chuỗi nhân quả (barrier xác nhận DB clock đã qua deadline → oracle thấy dòng → rồi mới DELETE) → breach đã xác nhận |

**Giới hạn:**
- Một phiên bản PostgreSQL, một cấu hình, mỗi case chạy một lần, schema thử nghiệm.
- Hai giá trị `sync_channel` không phải hai transport sản phẩm.
- Chưa TypeORM/pool, chưa API, chưa cleanup K1/K2 trên DB, chưa PostgreSQL bản phát hành.
- Tham số thử nghiệm (W = 4 s, F = 1 s, T = 5 s, TTL đo 4 s) **không** phải policy sản phẩm.

| Artifact (ngoài repo) | SHA-256 |
|---|---|
| `SPIKE_REPORT.md` | `233c8c5deefec4e51627b294fa77c150c721db068886d5eee58fb19665c1259d` |
| `EVIDENCE_INDEX.json` (hash của 18 file spike) | `c8e14755c254764579d94d3ee89a22874d4eaddcffcb66ba1cf229cafa22c477` |
| raw run-1 JSON | `610072790f59d9c9a7ff5e7e274a5bcc381bbfac44bcd87782b89e5b327a068a` |
| raw chẩn đoán D0–D3 | `c46be28f429d7ae60bd6b813836188e90d36d6c548456e93719bf681130bc143` |

## 4. Mô hình toán [M]

Mô hình thuần, không SQL, mạng hay import sản phẩm. Kết quả **không** phải compliance, benchmark hay tỉ lệ thực.

| Mô hình | Kết quả chính |
|---|---|
| Admission/expiry | P-ADM với `T_tomb = W + F`: 0 lần phát lại lọt. Thiếu 1 đơn vị: 162. Guard theo `now()`: 2430 (không gian mô hình nhỏ, duyệt hết) |
| Coverage (một cohort) | Không fallback: dữ liệu vượt TTL dù job chạy đúng nhịp; có fallback K1 cùng lượt: không vượt |
| Allowlist DML/DDL | K1 xoá dòng quá hạn trong partition tháng hiện tại; K2 từ chối partition đó |
| Đo lường v3 | 14 probe âm (đảo mốc, NaN, thiếu trường, `m > U`…) không tạo breach, G-OBS FAIL. Timeline writer giữa L và snapshot hợp lệ. 4 ca breach hợp lệ FAIL kể cả khi X_max chưa có. 8 ca công bố chỉ mở khi đủ điều kiện. 3000 lịch sử tổng hợp mỗi biến thể: 0 PASS sai, 0 FAIL xác nhận sai; điều kiện cũ `m ≤ L` đánh hỏng 650 lịch sử sạch |
| Timeline X_max (số học) | X từ commit timestamp cho PASS sai trên cửa sổ có breach thật; X từ ACK cho INCONCLUSIVE |

| Artifact (ngoài repo) | SHA-256 |
|---|---|
| `measurement_model_v3.mjs` | `5cc860ca3dfcf0b32960ed80336bee2f5e241d0b166b999c8ce9f099d4d97e19` |
| output mô hình v3 (tái lập byte-identical) | `e458c46d53c006745e70854fb17cb7f71f39910b8ebadf57b05443cd0ac48835` |
| Manifest gói candidate 2 | `817d8441b076ff9409ec1016785bfbae82df14eaa53badd1bd8c447deecfbd34` |

## 5. Mã nguồn PostgreSQL đã đối chiếu [S]

Đọc, không chạy:
- `src/backend/access/transam/xact.c` tag REL_16_4: `RecordTransactionCommit` (timestamp → commit record → `XLogFlush`/`SyncRepWaitForLSN`); `CommitTransaction` (`ProcArrayEndTransaction` sau `RecordTransactionCommit`).
- `src/backend/tcop/postgres.c` tag REL_16_4: `finish_xact_command()` trước `EndCommand` (cả tác giả và Lead đọc). Statement timeout tắt trước khi xử lý commit (Lead đối chiếu).
- `src/backend/tcop/pquery.c` tag REL_16_4: snapshot của extended protocol có thể lấy ở `PortalStart` trong Bind, trước mốc statement-start của Execute (Lead đối chiếu).
- `xact.c` ở trên: tác giả và Lead cùng đọc.
- Tài liệu chính thức PostgreSQL 16:
  - [Current Date/Time](https://www.postgresql.org/docs/16/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT);
  - [Transaction Isolation](https://www.postgresql.org/docs/16/transaction-iso.html);
  - [Index Uniqueness Checks](https://www.postgresql.org/docs/16/index-unique-checks.html);
  - [Explicit Locking](https://www.postgresql.org/docs/16/explicit-locking.html);
  - [Client Connection Defaults](https://www.postgresql.org/docs/16/runtime-config-client.html);
  - [Asynchronous Commit](https://www.postgresql.org/docs/16/wal-async-commit.html).

## 6. Chưa chạy

- Tích hợp sản phẩm [I]: write path P-ADM thật, ánh xạ lỗi realtime/sync, TypeORM/pool, cleanup K1/K2, gauge/bản ghi đo, T-MEAS-01 — **NOT_RUN**.
- Vận hành [O]: môi trường phát hành, PostgreSQL bản phát hành, X_max, cửa sổ quan sát lại, backup — **NOT_RUN**. Môi trường phát hành hiện offline.
- Không bằng chứng nào ở trên chứng nhận FR-RETENTION-02 đã được đáp ứng. Privacy Content Gate vẫn OPEN.
