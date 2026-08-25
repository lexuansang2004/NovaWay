# NovaWay — Data Model v0.1

> Step D0.4. Cụ thể hoá `DATA_REQUIREMENTS.md` (D0.2) thành schema gần với DDL thật — kiểu dữ liệu, khoá, index, ràng buộc. Vẫn là **thiết kế**, không phải migration thật (migration thật trải qua nhiều step, bắt đầu từ `1.2 feat/database-schema` — xem §3 Migration Order). PostgreSQL + PostGIS (TDR-001).

## 1. Quy ước chung

- Khoá chính: `UUID DEFAULT gen_random_uuid()` cho hầu hết bảng (dùng extension `pgcrypto` hoặc `uuid-ossp`), trừ `raw_gps_events` có thể cân nhắc `BIGSERIAL` nếu insert rate cao (quyết định ở step migrate bảng này — xem §3).
- Toạ độ: `GEOGRAPHY(Point, 4326)` cho điểm đơn (tính khoảng cách chính xác trên mặt cầu); `GEOMETRY(LineString, 4326)` cho `route_geometry` (hiển thị, không cần tính khoảng cách chính xác cao).
- Mọi bảng có `created_at TIMESTAMPTZ DEFAULT now()`. Bảng có vòng đời thay đổi trạng thái có thêm `updated_at`.
- Dùng `TIMESTAMPTZ`, không dùng `TIMESTAMP` trần, để tránh nhầm timezone.

## 2. Bảng chính

### 2.1. `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2. `vehicles`

```sql
CREATE TYPE vehicle_type AS ENUM ('motorbike', 'car');

CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          vehicle_type NOT NULL,
  license_plate VARCHAR(20) NOT NULL,
  brand_model   VARCHAR(100),
  is_active     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
-- Chỉ 1 xe active tại 1 thời điểm cho mỗi user (FR-VEHICLE-03):
CREATE UNIQUE INDEX uniq_vehicles_active_per_user
  ON vehicles(user_id) WHERE is_active = true;
```

### 2.3. `vehicle_authorizations`

```sql
CREATE TYPE authorization_status AS ENUM ('active', 'expired', 'revoked');

CREATE TABLE vehicle_authorizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES users(id),
  borrower_id UUID NOT NULL REFERENCES users(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  status      authorization_status NOT NULL DEFAULT 'active',
  CHECK (expires_at > granted_at),
  CHECK (owner_id <> borrower_id)
);

CREATE INDEX idx_vehicle_authorizations_vehicle_id ON vehicle_authorizations(vehicle_id);
CREATE INDEX idx_vehicle_authorizations_borrower_id ON vehicle_authorizations(borrower_id);
```

*Ràng buộc "không chồng thời gian giữa 2 borrower cho cùng 1 xe" (EDGE_CASES.md §2.1) đề xuất dùng PostgreSQL exclusion constraint (cần extension `btree_gist`):*

```sql
ALTER TABLE vehicle_authorizations ADD CONSTRAINT no_overlapping_active_authz
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(granted_at, expires_at) WITH &&
  ) WHERE (status = 'active');
```

*(Xác nhận tính khả thi/hiệu năng constraint này ở step `1.5` — nếu phức tạp, fallback: enforce ở application layer trong `VehicleAuthorizationModule`.)*

### 2.4. `biometric_verifications`

```sql
CREATE TYPE verification_result AS ENUM ('success', 'failed');

CREATE TABLE biometric_verifications (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id),
  vehicle_id                UUID NOT NULL REFERENCES vehicles(id),
  vehicle_authorization_id  UUID REFERENCES vehicle_authorizations(id),
  result                    verification_result NOT NULL,
  provider                  VARCHAR(50) NOT NULL,
  verified_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_biometric_verifications_user_vehicle ON biometric_verifications(user_id, vehicle_id);
```

**Không có cột lưu ảnh/binary khuôn mặt trong bảng này hoặc bất kỳ bảng nào khác** (NFR-PRIVACY-03, FR-BIOMETRIC-04) — đây là ràng buộc thiết kế, không chỉ quy ước code.

### 2.5. `trips`

```sql
CREATE TYPE trip_status AS ENUM ('active', 'ended');

CREATE TABLE trips (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES users(id),
  vehicle_id                  UUID NOT NULL REFERENCES vehicles(id),
  biometric_verification_id   UUID NOT NULL REFERENCES biometric_verifications(id),
  status                      trip_status NOT NULL DEFAULT 'active',
  consent_at                  TIMESTAMPTZ NOT NULL,
  started_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at                    TIMESTAMPTZ
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
-- Chỉ 1 trip active tại 1 thời điểm cho mỗi user (Edge Case §2 — 2 phiên cùng lúc):
CREATE UNIQUE INDEX uniq_trips_active_per_user
  ON trips(user_id) WHERE status = 'active';
```

### 2.6. `trip_logs` (Trip Summary)

```sql
CREATE TABLE trip_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               UUID NOT NULL UNIQUE REFERENCES trips(id),
  user_id               UUID NOT NULL REFERENCES users(id),
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id),
  distance_km           DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration_minutes      INTEGER NOT NULL DEFAULT 0,
  route_geometry        GEOMETRY(LineString, 4326),
  mismatch_warning_count INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_logs_user_id ON trip_logs(user_id);
CREATE INDEX idx_trip_logs_vehicle_id ON trip_logs(vehicle_id);
```

### 2.7. `raw_gps_events` (partitioned)

```sql
CREATE TYPE gps_source AS ENUM ('gps');
CREATE TYPE sync_channel AS ENUM ('realtime', 'batch');

CREATE TABLE raw_gps_events (
  id               BIGSERIAL,
  trip_id          UUID NOT NULL REFERENCES trips(id),
  vehicle_id       UUID NOT NULL,
  user_id          UUID NOT NULL,
  client_event_id  UUID NOT NULL,
  location         GEOGRAPHY(Point, 4326) NOT NULL,
  speed_kmh        REAL,
  accuracy_m       REAL,
  source           gps_source NOT NULL DEFAULT 'gps',
  sync_channel     sync_channel NOT NULL,
  event_timestamp  TIMESTAMPTZ NOT NULL,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, received_at)
) PARTITION BY RANGE (received_at);

CREATE INDEX idx_raw_gps_trip_id ON raw_gps_events(trip_id, received_at);

-- Idempotency (NFR-SEC-03) — KHÔNG dùng unique index trực tiếp trên raw_gps_events:
-- PostgreSQL bắt buộc partition key (received_at) phải nằm trong mọi unique index của
-- bảng partitioned, nên "UNIQUE(user_id, client_event_id, received_at)" KHÔNG chặn được
-- trùng lặp thật (2 lần gửi cùng client_event_id nhưng received_at khác nhau, do retry
-- cách nhau vài giây/phút, vẫn được coi là 2 dòng khác nhau — phát hiện ở D0.5 self-review).
--
-- Giải pháp: bảng dedup riêng, KHÔNG partition, chỉ giữ khoá để chặn trùng:
CREATE TABLE gps_event_dedup (
  user_id          UUID NOT NULL,
  client_event_id  UUID NOT NULL,
  raw_gps_event_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, client_event_id)
);

-- Insert 1 GPS event = 2 thao tác trong cùng transaction:
--   1. INSERT INTO gps_event_dedup (...) VALUES (...) ON CONFLICT (user_id, client_event_id) DO NOTHING;
--   2. Nếu bước 1 thực sự insert được dòng mới (không bị conflict) -> INSERT vào raw_gps_events.
--      Nếu bước 1 bị conflict (đã tồn tại) -> bỏ qua, tăng duplicate_count, không insert raw_gps_events.
-- Bảng gps_event_dedup nhỏ (chỉ 2 UUID + 1 bigint/dòng), TTL cùng nhịp 30 ngày với raw_gps_events
-- (xoá theo raw_gps_event_id khi partition tương ứng bị DROP) để không phình vô hạn.

-- Ví dụ partition theo tháng (job tạo partition mới + xoá partition cũ >30 ngày chạy định kỳ):
CREATE TABLE raw_gps_events_2026_07 PARTITION OF raw_gps_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

*Lưu ý:* `gps_event_dedup` là bảng riêng, không partition — đây là nơi enforce idempotency thật (NFR-SEC-03), không phải một index trên `raw_gps_events`. Cách này tránh được giới hạn của PostgreSQL (partition key bắt buộc có trong mọi unique index của bảng partitioned) mà không cần Redis (giữ đúng TDR-004 — không thêm hạ tầng cache ở MVP). Cần benchmark ở step migrate bảng này (xem §3 — chưa chốt) xem việc thêm 1 write phụ (`gps_event_dedup`) mỗi GPS event có ảnh hưởng throughput ở mức chấp nhận được không, đặc biệt qua đường realtime (tần suất cao hơn batch).

### 2.8. `vehicle_mismatch_warnings`

```sql
CREATE TYPE mismatch_response AS ENUM ('confirmed', 'changed_vehicle', 'no_response');

CREATE TABLE vehicle_mismatch_warnings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                   UUID NOT NULL REFERENCES trips(id),
  detected_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  declared_vehicle_type      vehicle_type NOT NULL,
  observed_behavior_summary  TEXT NOT NULL,
  user_response               mismatch_response NOT NULL DEFAULT 'no_response',
  resolved_at                 TIMESTAMPTZ
);

CREATE INDEX idx_mismatch_warnings_trip_id ON vehicle_mismatch_warnings(trip_id);
```

### 2.9. `terrain_warnings`

```sql
CREATE TYPE warning_severity AS ENUM ('warning', 'danger');
CREATE TYPE warning_source AS ENUM ('mock_seed', 'computer_vision');

CREATE TABLE terrain_warnings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by_trip_id   UUID REFERENCES trips(id),
  location              GEOGRAPHY(Point, 4326) NOT NULL,
  severity              warning_severity NOT NULL,
  description           TEXT,
  source                warning_source NOT NULL DEFAULT 'mock_seed',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_terrain_warnings_location ON terrain_warnings USING GIST(location);
```

## 3. Migration Order

Thứ tự phụ thuộc FK giữa các bảng (dưới đây) không migrate hết trong 1 step — mỗi step trong `NovaWay_COMPLETE_MICRO_STEP_PLAN.md` chỉ migrate bảng nó thực sự cần, đúng nguyên tắc "một branch = một nghiệp vụ nhỏ" (`AGENTS.md`). Ánh xạ đã chốt:

```text
1. users                      — step 1.2 feat/database-schema
2. vehicles                   — step 1.2 feat/database-schema
3. vehicle_authorizations     — step 1.5 feat/vehicle-authorization-api
4. biometric_verifications    — step 1.6 feat/biometric-verification-api
5. trips (FK tới biometric_verifications) — step 3.1 feat/realtime-location-gateway
6. raw_gps_events (+ gps_event_dedup, partition đầu tiên) — step 3.1 feat/realtime-location-gateway
7. trip_logs                  — step 7.1 feat/trip-logs-api
8. vehicle_mismatch_warnings  — step 6.1 feat/telematics-vehicle-mismatch (đã chốt 07/2026 — bảng này không có ứng viên nào khác trong plan, và FK `trip_id` tới `trips` đã thoả từ step 3.1)
9. terrain_warnings (+ seed data mock ban đầu) — R3-5 (docs/roadmap/SPRINT_R3_VERIFICATION_CD_HARDENING.md) feat/terrain-warnings-api, không phụ thuộc bảng nào khác ngoài FK optional tới trips (đã tồn tại từ step 3.1)
```

*Sửa 07/2026 (lần 1):* bản gốc ghi cả 9 bảng migrate ở step `1.2`, gây lỗi — `trip_logs` có FK NOT NULL tới `trips`, nhưng `trips` lại phụ thuộc `biometric_verifications` (step `1.6`), nên không thể tồn tại trước `1.2`. Đã tách theo đúng step nghiệp vụ cần bảng đó.

*Sửa 07/2026 (lần 2):* dòng `raw_gps_events` từng để "chưa chốt, ứng viên 3.1 hoặc 4.3" — nhưng `raw_gps_events.trip_id` là `NOT NULL REFERENCES trips(id)`, và bản kế hoạch gốc đặt `trips` ở step `7.1` (sau cả `3.1`), nên nếu triển khai `raw_gps_events` ở `3.1` như dự kiến sẽ tạo FK trỏ tới bảng chưa tồn tại — cùng loại lỗi đã gặp ở lần sửa 1. Vì `trips` chỉ phụ thuộc `biometric_verifications` (đã có từ `1.6`), không phụ thuộc `trip_logs`, nên tách `trips` ra khỏi `trip_logs`: migrate `trips` ngay ở `3.1` (chỉ schema, phục vụ `raw_gps_events` — chưa có Trip API thật, vẫn tạo trip test qua SQL trực tiếp cho tới khi `7.1` xây `TripsModule`), giữ `trip_logs` ở `7.1` như cũ. Người dùng đã xác nhận hướng sửa này trước khi code step `3.1`.

## 4. TTL / Cleanup Job (liên quan step migrate `raw_gps_events` — xem §3, và `9.1`)

```text
Job "raw_gps_cleanup" (chạy daily):
  - Tạo partition tháng tiếp theo nếu chưa có.
  - DROP các partition có upper bound < now() - 30 ngày.
  - Xoá khỏi gps_event_dedup các dòng có raw_gps_event_id thuộc partition vừa DROP
    (batch DELETE theo id range, không phải full-table scan).
  - Log số dòng/partition đã xoá vào observability (NFR-OBS-01).
```

Dùng `DROP PARTITION` thay vì `DELETE ... WHERE`, đúng khuyến nghị ở `DATA_REQUIREMENTS.md` để tránh khoá bảng lớn. `gps_event_dedup` không partition được (khoá chính là `(user_id, client_event_id)`, không phải theo thời gian), nên dọn dẹp nó là `DELETE` thường — chấp nhận được vì đã giới hạn qua `raw_gps_event_id` range, không phải toàn bảng.

> **⚠️ Đính chính trạng thái thật (08/2026, step `9.3 fix/raw-gps-partition-availability`):** job "raw_gps_cleanup" mô tả ở trên **chưa từng được implement** trong `apps/backend` — đây luôn chỉ là mô tả thiết kế/tài liệu, không phải code đang chạy. Migration gốc (`1721260000006-CreateRawGpsEventsTable.ts`, step `3.1`) chỉ tạo **đúng một** partition tĩnh, `raw_gps_events_2026_07` (`2026-07-01` → `2026-08-01`). Hậu quả thật đã xác nhận: mọi insert GPS có `received_at` từ `2026-08-01` trở đi (bao gồm CI thật, PR #73, 24/08/2026) đều lỗi `no partition of relation "raw_gps_events" found for row` — xem `docs/REVIEW_NOTES.md` §17 cho log/bằng chứng đầy đủ. Step `9.3` bổ sung migration mới + `PartitionMaintenanceService` để **chỉ đảm bảo partition tháng hiện tại + kế tiếp luôn tồn tại** (phần "tạo partition" của job mô tả ở trên) — **không** implement phần "DROP partition cũ >30 ngày" / dọn `gps_event_dedup` ở step này; hai việc đó vẫn hoàn toàn chưa có code, tiếp tục được theo dõi riêng (không được coi là đã xong). Do đó: **chưa thể tuyên bố TTL 30 ngày/retention policy (FR-RETENTION-02, TDR-006) đã "implemented"** cho tới khi phần dọn dẹp/DROP partition thật sự được xây và verify — step `9.3` chỉ đóng phần "partition availability", không đóng toàn bộ mục 4 này.

## 5. Open Items for D0.7

- Xác nhận extension `btree_gist` khả dụng trên môi trường hosting đã chọn (ảnh hưởng constraint ở §2.3).
- Xác nhận chiến lược partition `raw_gps_events`: theo tháng (đề xuất ở đây) hay theo tuần nếu ước tính insert rate cao hơn dự kiến.
- Benchmark chi phí ghi phụ vào `gps_event_dedup` cho mỗi GPS event (đặc biệt qua đường realtime tần suất cao) — nếu quá tốn, cân nhắc phương án khác ở step migrate `raw_gps_events` (vd. batch dedup theo cửa sổ thời gian ngắn thay vì mọi write).
- Cách xử lý race condition idempotency ở biên partition (§2.7) — cần benchmark trước khi coi là "đã giải quyết".
