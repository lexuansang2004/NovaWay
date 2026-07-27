# TDR — Nâng NestJS v10 → v11 (R5-4)

- **Trạng thái:** ✅ Đã quyết định và thực hiện — 27/07/2026
- **Bối cảnh:** Sprint R5 (`docs/roadmap/SPRINT_R5_DEPENDENCY_AND_COVERAGE.md`), mục R5-4
- **Quyết định:** **Nâng**, toàn bộ họ `@nestjs/*` lên v11

## 1. Vì sao lại xét lại quyết định của R4

Sprint R4 đã **cố ý gạt** việc nâng NestJS ra ngoài phạm vi, với lý do ghi rõ: *"dù sẽ dọn được vài lỗ hổng dependency (`qs`/`body-parser`/`multer` bundle mới hơn), đây là thay đổi lớn có rủi ro breaking change thật, cần TDR riêng + full regression pass"*. Lúc đó tất cả advisory liên quan đều là **transitive** — nằm dưới `@nestjs/*` chứ không phải bản thân nó.

Dữ kiện đã đổi ở R5: xuất hiện advisory nhắm **thẳng vào `@nestjs/core`** ("Improperly Neutralizes Special Elements in Output Used by a Downstream Component"), với `vulnerable: <=11.1.17`, `patched: >=11.1.18`. Tức **không tồn tại đường vá nào trong nhánh v10** — muốn hết thì buộc phải lên major. Đây là lý do TDR này được mở, không phải vì "nâng cho mới".

## 2. Rà soát breaking change v11 trên đúng codebase này

Nguồn: migration guide chính thức (`docs.nestjs.com/content/migration.md`). Mỗi mục được đối chiếu với code thật trước khi nâng, không suy đoán:

| Breaking change của v11 | Áp dụng cho NovaWay? | Bằng chứng |
|---|---|---|
| **Node.js ≥ 20** | ✅ Đã thoả sẵn | CI dùng `node-version: 22` (`.github/workflows/ci.yml`), Docker dùng `node:22-alpine` (`apps/backend/Dockerfile`) |
| **Express v5: wildcard `*` phải đặt tên** | ❌ Không | Grep `'*'` / `(.*)` / `@All(` trên toàn `apps/backend/src` → 0 kết quả. Mọi route đều là path tĩnh hoặc param có tên (`:id`, `:vehicleId`, `:authId`) |
| **`setGlobalPrefix` bỏ hỗ trợ RegExp** | ❌ Không | `main.ts` dùng `exclude: ['/', 'health', 'metrics']` — chuỗi thường, không RegExp |
| **Express v5: query parser đổi `qs` → `simple`** | ❌ Không | Chỉ có 2 `@Query()` trong toàn backend, cả hai là scalar đơn: `bbox` (`terrain-warnings.controller.ts:12`), `vehicle_id` (`trips.controller.ts:32`). Không có object/array lồng nhau |
| **CORS chỉ cho phép safelisted methods** | ❌ Không | Đây là thay đổi của **Fastify**, dự án dùng `@nestjs/platform-express`. Đã **đo thật** thay vì tin doc — xem §3 |
| **Middleware global chạy trước** | ❌ Không | Không có `NestMiddleware` / `configure()` nào trong codebase |
| **Dynamic module dùng object reference thay hash** | ❌ Không | Test dùng `Test.createTestingModule` với provider thường, không chia sẻ dynamic module giữa nhiều module |
| **`Reflector.getAllAndOverride` đổi kiểu trả về** | ❌ Không | Không chỗ nào dùng `Reflector` |
| **Lifecycle hook huỷ chạy ngược thứ tự** | ❌ Không | Không implement `OnModuleDestroy` / `OnApplicationShutdown` / `BeforeApplicationShutdown` |
| **`@nestjs/config` v4: internal config ưu tiên hơn env** | ❌ Không | `ConfigModule.forRoot({ isGlobal: true, validationSchema })` — không có `load` factory nào, nên không tồn tại "internal config" để tranh chấp thứ tự. Cũng không dùng `ignoreEnvVars` (option bị deprecate) |
| **`@nestjs/cache-manager` chuyển sang Keyv** | ❌ Không | Không dùng package này |
| **`@nestjs/terminus` deprecate `HealthIndicator`** | ❌ Không | `HealthController` tự viết, không dùng terminus |

## 3. Thay đổi code thực tế phải làm

Chỉ **2 chỗ**, cả hai là lỗi biên dịch do typing chặt hơn, không phải đổi hành vi:

- `auth.module.ts` — `@nestjs/jwt` v11 dùng `StringValue` (template-literal type của `ms`) cho `signOptions.expiresIn`, không nhận `string | undefined` mà `ConfigService.get()` trả về.
- `jwt.strategy.ts` — typings của `passport-jwt` không nhận `secretOrKey: string | undefined`.

Cả hai sửa bằng `configService.getOrThrow<string>(...)` thay vì `get<string>(...)`. Đây **không phải cách lách kiểu**: `envValidationSchema` đã đánh dấu `JWT_SECRET` là `.required()` và `JWT_EXPIRES_IN` có default, nên `getOrThrow` mô tả đúng thực tế và còn chặt hơn bản cũ — hỏng ở lúc boot tốt hơn là ký token bằng secret `undefined`. Riêng `expiresIn` phải cast sang `JwtSignOptions['expiresIn']` vì kiểu của `ms` hẹp hơn những gì config có thể biểu diễn; `ms` tự parse chuỗi lúc chạy.

## 4. Verify thật (không chỉ chạy test)

Chạy backend đã build trên v11, gọi HTTP thật, kèm Postgres thật:

- **Routing + `setGlobalPrefix` exclude** — `GET /`, `/health`, `/metrics` đều `200` (nếu Express v5 làm hỏng `exclude` thì phải là `404`); `GET /api/vehicles` không token → `401`, tức prefix `api` vẫn áp đúng.
- **CORS theo từng method** — migration guide chỉ nói về Fastify nên phải đo để chắc: preflight `OPTIONS /api/vehicles/abc` với `Access-Control-Request-Method` lần lượt `GET`/`POST`/`PATCH`/`DELETE` đều trả `204` + `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE`. `PATCH` và `DELETE` là method API này thật sự dùng (`vehicles.controller.ts`), nên đây là rủi ro thật đã được loại bỏ bằng đo.
- **WebSocket CORS (giữ nguyên kết quả R4-2)** — preflight `/socket.io/` với `Origin: http://localhost:5173` **và** `Origin: http://evil.example.com` đều trả `Access-Control-Allow-Origin: http://localhost:5173`, tức `ConfiguredSocketIoAdapter` vẫn ép đúng `WEB_ORIGIN` chứ không rơi về `*`. Handshake polling → `200`.
- **Rate limiting (`@nestjs/throttler` 6.5.0 giữ nguyên version)** — 7 lần gọi `POST /api/auth/login` liên tiếp: `401 401 401 429 429 429 429`, đúng ngưỡng 5/60s.
- **E2E golden path** — 3/3 pass, đi thật qua đăng nhập → chọn xe → xác thực sinh trắc → bắt đầu chuyến → gửi GPS qua WebSocket → kết thúc chuyến với quãng đường thật.
- **Unit test** — backend 142/142 (24 suite), web 14/14, lint toàn workspace sạch.

## 5. Kết quả bảo mật

`pnpm audit` toàn workspace:

| Mốc | Tổng | critical | high | moderate | low |
|---|---|---|---|---|---|
| Đầu Sprint R5 | 30 | 1 | 15 | 13 | 1 |
| Sau R5-2 (bcrypt 6) | 18 | 0 | 8 | 9 | 1 |
| **Sau R5-4 (NestJS 11)** | **4** | **0** | **3** | **1** | **0** |

Advisory nhắm `@nestjs/core`: **0**.

4 advisory còn lại đều đã có quyết định ghi sẵn, không mục nào là nợ mới:

- `@hono/node-server`, `fast-uri` — đến qua `shadcn` CLI, **không reachable**; xem R5-3 trong `SPRINT_R5_DEPENDENCY_AND_COVERAGE.md`.
- `react-router` — lỗ hổng ở RSC mode, dự án dùng `BrowserRouter` thuần nên **không reachable**; vá chỉ có ở v8 (major), đã ghi Out of Scope ở R5.
- `brace-expansion` — qua `typeorm>glob>minimatch`, chỉ dọn được bằng `typeorm` major, vẫn Out of Scope từ R4.

## 6. Đánh đổi và rủi ro còn lại

- Rủi ro lớn nhất **không nằm ở phần đã test**: v11 chạy trên Express v5, và những khác biệt còn lại của Express v5 (xử lý lỗi async, hành vi một số middleware bên thứ ba) chỉ lộ ra dưới traffic thật. Ở quy mô pilot hiện tại, đánh đổi này chấp nhận được — bù lại là bỏ được một advisory không có đường vá nào khác.
- Không nâng `typeorm` trong TDR này (vẫn 0.3.x, `@nestjs/typeorm` 11 tương thích ngược). `typeorm` major vẫn cần TDR riêng.
- `@nestjs/throttler` giữ nguyên 6.5.0 — đã là bản mới nhất và tương thích v11 (`pnpm peers check` sạch), đã verify hành vi 429 bằng đo.
