# NovaWay Skill Index

| # | Skill | Main use | Key outputs |
|---:|---|---|---|
| 1 | `01-project-intake-skill` | Gom ý tưởng thô, bối cảnh, mục tiêu, ràng buộc và biến thành intake rõ ràng trước khi viết PRD. | `docs/00_SOURCE_SUMMARY.md`, `docs/01_OPEN_QUESTIONS.md`, `docs/PROJECT_INTAKE.md` |
| 2 | `02-mvp-scope-skill` | Chốt phạm vi MVP nhỏ nhất có thể test được, tránh làm dồn tính năng. | `docs/MVP_SCOPE.md`, `docs/PHASES.md`, `docs/OUT_OF_SCOPE.md` |
| 3 | `03-timeline-planner-skill` | Chia roadmap thành phase, milestone, micro-step, dependency và test gate. | `docs/ROADMAP.md`, `docs/MICRO_STEP_PLAN.md`, `docs/DEPENDENCY_MAP.md` |
| 4 | `04-board-card-generator-skill` | Biến phase thành thẻ task trên board: title, description, acceptance criteria, test checklist. | `docs/BOARD_CARDS.md`, `docs/SPRINT_TASKS.md` |
| 5 | `05-diagram-designer-skill` | Tạo sơ đồ luồng, kiến trúc, data flow, sequence và roadmap để AI/dev đọc nhanh. | `docs/DIAGRAMS.md`, `docs/UI_UX_FLOW.md`, `docs/SYSTEM_FLOW.md` |
| 6 | `06-database-architect-skill` | Thiết kế database, relationship, migration, indexing, data lifecycle và validation. | `docs/DATA_MODEL.md`, `docs/DATABASE_SCHEMA.md`, `docs/MIGRATION_PLAN.md` |
| 7 | `07-api-contract-skill` | Thiết kế API contract trước khi code: endpoint, method, request, response, error, auth. | `docs/API_CONTRACT.md`, `docs/API_ERROR_MODEL.md`, `docs/API_TEST_CASES.md` |
| 8 | `08-sprint-prompt-writer-skill` | Viết prompt cho Codex/Claude Code theo từng sprint nhỏ, tránh agent làm quá phạm vi. | `docs/SPRINT_PROMPTS.md`, `docs/AI_TASK_PROMPTS.md` |
| 9 | `09-scope-guardrail-skill` | Chống scope creep, đảm bảo mỗi branch chỉ làm một nghiệp vụ nhỏ. | `docs/SCOPE_GUARDRAILS.md`, `docs/CHANGE_CONTROL.md` |
| 10 | `10-business-translator-skill` | Dịch ý tưởng kinh doanh/người dùng thành yêu cầu kỹ thuật dễ build. | `docs/BUSINESS_REQUIREMENTS.md`, `docs/PRODUCT_LOGIC.md` |
| 11 | `11-release-doc-skill` | Tạo release note, changelog, upgrade notes và tài liệu bàn giao sau mỗi phase. | `docs/RELEASE_NOTES.md`, `CHANGELOG.md` |
| 12 | `12-architecture-review-skill` | Review kiến trúc trước khi code hoặc trước khi merge phase lớn. | `docs/ARCHITECTURE_REVIEW.md`, `docs/TECH_DECISIONS.md` |
| 13 | `13-security-compliance-review-skill` | Review bảo mật: auth, permission, secrets, input validation, data protection. | `docs/SECURITY_REVIEW.md`, `docs/SECURITY_REQUIREMENTS.md` |
| 14 | `14-test-regression-skill` | Thiết kế test checklist, unit/integration/e2e/manual regression trước khi qua step tiếp theo. | `docs/TEST_STRATEGY.md`, `docs/REGRESSION_CHECKLIST.md` |
| 15 | `15-pr-release-governance-skill` | Quản trị PR, branch, commit convention, merge develop/main và release gate. | `docs/GIT_WORKFLOW.md`, `docs/PR_TEMPLATE.md`, `docs/MERGE_CHECKLIST.md` |
| 16 | `16-dependency-risk-audit-skill` | Audit package/dependency/license/version/risk trước khi dùng công nghệ mới. | `docs/DEPENDENCY_RISK_AUDIT.md`, `docs/TECH_STACK_DECISIONS.md` |
| 17 | `17-ai-agent-prompt-hardening-skill` | Làm cứng prompt/AGENTS.md để Codex/Claude Code tuân thủ scope, test và repo rule. | `AGENTS.md`, `docs/AI_AGENT_RULES.md` |
| 18 | `18-incident-response-ops-skill` | Chuẩn bị xử lý sự cố: lỗi deploy, rollback, downtime, dữ liệu hỏng, realtime lỗi. | `docs/INCIDENT_RESPONSE.md`, `docs/ROLLBACK_PLAN.md` |
| 19 | `19-ai-system-safety-skill` | Đảm bảo AI agent không tự quyết định rủi ro, không sinh hành vi ngoài tài liệu, không phá repo. | `docs/AI_SYSTEM_SAFETY.md`, `docs/AI_USAGE_POLICY.md` |
| 20 | `20-threat-modeling-skill` | Tạo threat model cho auth, API, location data, realtime channel, mobile permissions. | `docs/THREAT_MODEL.md`, `docs/RISK_REGISTER.md` |
| 21 | `21-codebase-graph-intelligence-skill` | Giúp AI đọc codebase, hiểu module/file dependency và đề xuất sửa đúng chỗ. | `docs/CODEBASE_MAP.md`, `docs/MODULE_OWNERSHIP.md` |
| 22 | `22-geospatial-routing-skill` | Thiết kế bản đồ, GPS, route, geospatial query, PostGIS, routing engine và logic theo phương tiện. | `docs/GEOSPATIAL_ROUTING.md`, `docs/ROUTING_RULES.md`, `docs/MAP_PROVIDER_DECISION.md` |
| 23 | `23-realtime-location-tracking-skill` | Thiết kế realtime GPS qua WebSocket, heartbeat, reconnect, rate limit và dashboard tracking. | `docs/REALTIME_LOCATION.md`, `docs/WEBSOCKET_CONTRACT.md`, `docs/LOCATION_EVENT_TESTS.md` |
| 24 | `24-mobile-permission-background-skill` | Thiết kế quyền location, background tracking, foreground service, pin và privacy cho mobile. | `docs/MOBILE_LOCATION_PERMISSIONS.md`, `docs/BACKGROUND_TRACKING.md` |
| 25 | `25-ar-terrain-prototype-skill` | Thiết kế prototype AR terrain: camera, plane/mesh, obstacle mock, Unity/AR Foundation tách khỏi app chính. | `docs/AR_TERRAIN_PROTOTYPE.md`, `docs/XR_BUILD_PLAN.md`, `docs/AR_TEST_CHECKLIST.md` |
| 26 | `26-simulation-mock-data-skill` | Tạo dữ liệu mô phỏng GPS, route, speed, vehicle mismatch và demo realtime trước khi có mobile thật. | `docs/SIMULATION_MOCK_DATA.md`, `docs/MOCK_ROUTE_SCENARIOS.md` |
| 27 | `27-observability-monitoring-skill` | Thiết kế logging, metrics, health, alert, debug realtime và tracking lỗi production. | `docs/OBSERVABILITY.md`, `docs/LOGGING_STANDARD.md`, `docs/METRICS_ALERTS.md` |
| 28 | `28-devops-deployment-skill` | Thiết kế Docker, env, CI/CD, deploy backend/web/database/cache và test gate trước merge. | `docs/DEVOPS_DEPLOYMENT.md`, `docs/CI_CD.md`, `docs/ENVIRONMENT.md` |
| 29 | `29-ux-flow-review-skill` | Review luồng người dùng web/mobile/dashboard, đảm bảo dễ dùng và không thiếu trạng thái lỗi. | `docs/UX_FLOW_REVIEW.md`, `docs/SCREEN_FLOW.md`, `docs/EMPTY_ERROR_STATES.md` |
| 30 | `30-location-privacy-compliance-skill` | Thiết kế quyền riêng tư dữ liệu vị trí: consent, retention, delete/export, ownership, minimization. | `docs/LOCATION_PRIVACY.md`, `docs/DATA_RETENTION.md`, `docs/CONSENT_MODEL.md` |
