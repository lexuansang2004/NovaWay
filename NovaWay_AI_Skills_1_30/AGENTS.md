# AGENTS.md — NovaWay AI Agent Rules

## Golden rule

Do not code before the Requirement Baseline v1.0 is approved.

## Required documents before coding

- `README.md`
- `docs/PRD.md`
- `docs/SRS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PHASES.md`
- `docs/GIT_WORKFLOW.md`
- `docs/TEST_STRATEGY.md`

## Branch rules

Never code directly on `main` or `develop`.

Use one branch per micro-step:

- `docs/...`
- `chore/...`
- `feat/...`
- `fix/...`
- `style/...`
- `refactor/...`
- `test/...`

## Commit rules

Use Conventional Commit style:

- `feat:` thêm tính năng mới
- `fix:` sửa lỗi
- `docs:` cập nhật tài liệu
- `style:` chỉnh giao diện/code format
- `refactor:` cải tổ code nhưng không đổi chức năng
- `test:` thêm/sửa test
- `chore:` config/package/build

## Scope rules

- One branch = one small business capability.
- Do not add features outside the current branch target.
- If a requirement is missing, update docs first.
- If tests fail, do not proceed to the next step.
- After feature branch merges into `develop`, test `develop` before creating PR to `main`.

## Required test gate

Before handoff:

```bash
npm run lint
npm run test
npm run build
```

For Flutter:

```bash
flutter analyze
flutter test
flutter run
```

## AI roles

- NotebookLM: source grounding
- ChatGPT 5.5: main docs/architecture
- ChatPRD: product requirement standardization
- Claude Opus 4.8: deep logic review
- Gemini 3.1 Pro / 3.5 Flash: cross-check and flow/table review
- Codex: repo coding agent
- Claude Code / Sonnet: detailed coding, bug fixing, review
