# Tasks: Quality Controls

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

- Estimated authored change: ~220–320 lines across ~11 small new files and manifest edits. Generated `package-lock.json` is excluded from authored-line risk but may be a bulk diff.
- Delivery strategy: `ask-on-risk`; finish as one commit.

Threat matrix propagation: run npm-shell and CI-definition RED-equivalent checks before production edits; run the commit-state RED check immediately before commit. Restore every temporary mutation.

## Phase 1: Shared Quality Policy

- [x] 1.1 Before production edits, remove a required script from `apps/api/package.json` and assert the root gate fails; validate an invalid CI fixture (reorder/deployment) fails; restore both.
- [x] 1.2 Create `packages/config/eslint.mjs` and `packages/config/prettier.mjs`; add their exports to `packages/config/package.json`, retaining the strict TypeScript base.
- [x] 1.3 Create `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`; update `.gitignore` for caches, coverage, and generated output.
- [x] 1.4 Update root `package.json` with dev-only tools and npm-only lint/format/format:check/typecheck/test/build gates; run `npm install` and update generated `package-lock.json`.
- [x] 1.5 Create `.github/workflows/quality.yml` with Ubuntu, `.nvmrc`, npm 12, `npm ci`, ordered lint → format:check → typecheck → test → build, and no deployment.
- [x] 1.6 Compatibility gate: run `npm run lint` cleanly for both apps; on ESLint 10/Next incompatibility, use the newest compatible ESLint major, re-lock, and document the fallback.

## Phase 2: Application Gates

- [x] 2.1 Add lint/typecheck/test/build scripts without `--if-present` to `apps/web/package.json` and `apps/api/package.json`; re-lock if either changes.
- [x] 2.2 Create `apps/web/vitest.config.mts` and `apps/web/src/app/layout.test.tsx` for Node-based metadata/component sanity without server or external services.
- [x] 2.3 Create `apps/api/vitest.config.mts` and `apps/api/src/app.controller.spec.ts`; assert direct `AppController` output equals `{ status: 'ok' }`.

## Phase 3: Verification Gates (S1–S16)

- [x] 3.1 S1–S2: run `npm run lint`; inject violations in `apps/web/src/app/layout.test.tsx` and `packages/config/eslint.mjs`, assert non-zero, restore.
- [x] 3.2 S3–S4: run format/write and `format:check`; test temporary drift plus excluded `.next/`, `dist/`, lockfiles, and coverage, then restore.
- [x] 3.3 S5–S6: run `npm run typecheck`; add a temporary type error to `apps/web/src/app/layout.test.tsx`, assert non-zero, restore.
- [x] 3.4 S7–S8: run `npm test`; temporarily remove or empty both baseline tests, assert empty-suite failure, restore both files.
- [x] 3.5 S9–S10: run root fan-out gates; temporarily remove a required app script from `apps/api/package.json`, assert missing-script failure, restore.
- [x] 3.6 S11–S12: parse `.github/workflows/quality.yml` with `npm exec prettier -- --check`; assert toolchain, step order, and no deployment; mutate invalid copies and restore.
- [x] 3.7 S13–S14: inspect dev-only declarations in `package.json`, app manifests, and `package-lock.json`; run `npm ci` and immutability checks; reject runtime/stale-lock mutations in a disposable copy.
- [x] 3.8 S15–S16: use `git check-ignore` for generated paths and verify source plus `openspec/changes/controles-calidad/tasks.md` stays trackable; remove an ignore rule, assert failure, restore, then run clean gates.

## Phase 4: RED Threat Gates and Commit

- [x] 4.1 npm-shell-boundary RED: remove a required script from `apps/api/package.json`; verify `npm run test` fails non-zero; restore before staging.
- [x] 4.2 commit-state RED: stage an intentionally incomplete intended set and assert the index-completeness check rejects it; restore, then stage explicit intended files only.
- [x] 4.3 Run the clean-tree gate; create exactly one commit, `chore: add quality controls`; never use `git commit -a` and never push.
