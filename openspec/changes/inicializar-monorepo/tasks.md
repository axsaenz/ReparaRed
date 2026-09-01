# Tasks: Initialize the Monorepo

## Review Workload Forecast

Counting: budget covers only text authored here (~280 scaffolding lines + ~90 tasks.md ≈ 370). The initial commit also tracks ~6,500 lines of pre-existing docs/tooling and the generated `package-lock.json` — bulk snapshot, excluded from authored risk. Single commit; no chaining needed.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Foundation — root workspace + shared packages

- [x] 1.1 Create root `package.json`: private, workspaces `apps/*`+`packages/*`, engines node ^24, `packageManager npm@12.0.1`, D4 build scripts.
- [x] 1.2 Create `.nvmrc` (`24.15.0`).
- [x] 1.3 Create root `.gitignore` per D6 (ignore `node_modules/`, `.next/`, `dist/`, `*.tsbuildinfo`, `.env*`, logs; never planning docs).
- [x] 1.4 Create `packages/config/package.json` + `packages/config/tsconfig.base.json` (strict shared base).
- [x] 1.5 Create `packages/api-client/package.json` (dep-free stub, no build) + `packages/api-client/index.js`.
- [x] 1.6 Run root `npm install` to generate `package-lock.json`.

## Phase 2: App skeletons

- [x] 2.1 Create `apps/web/package.json` (D5 pins; dev/build/start).
- [x] 2.2 Create `apps/web/tsconfig.json` extending base (esnext/bundler, noEmit, jsx preserve).
- [x] 2.3 Create `apps/web/next.config.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx` (App Router, one static page).
- [x] 2.4 Create `apps/api/package.json` (NestJS 12, Fastify 5; build=tsc, start=node dist/main.js).
- [x] 2.5 Create `apps/api/tsconfig.json` extending base (commonjs, decorators, outDir dist).
- [x] 2.6 Create `apps/api/src/main.ts` (Fastify, listens 0.0.0.0:3000), `apps/api/src/app.module.ts`, `apps/api/src/app.controller.ts` (GET / stub).
- [x] 2.7 Re-run root `npm install`; finalize `package-lock.json` with app deps.

## Phase 3: Scripted verification gates (12 spec scenarios; no test framework)

- [x] 3.1 Member Discovery: `npm query ".workspace"` lists exactly 4 members.
- [x] 3.2 Fresh-Clone Install: delete node_modules; `npm ci` exits 0; `package-lock.json` (read-only) unchanged.
- [x] 3.3 Lockfile Drift RED: temporarily bump a dep in `apps/web/package.json`; `npm ci` fails, lockfile unchanged; revert.
- [x] 3.4 Declarations Agree: `.nvmrc`, root `package.json` (read-only) pin Node 24 LTS + npm.
- [x] 3.5 Web Build: `npm run build --workspace=@repara/web` exits 0; generated `apps/web/next-env.d.ts` tracked.
- [x] 3.6 API Build: `npm run build --workspace=@repara/api` exits 0; `apps/api/dist/main.js` exists.
- [x] 3.7 Base Extended: both app tsconfigs (read-only) extend `@repara/config/tsconfig.base.json`; proven by 3.5/3.6.
- [x] 3.8 Bootstrap: run `apps/api/dist/main.js` (read-only); probe localhost:3000 until 200; stays alive; kill.
- [x] 3.9 Placeholder + Both Platforms: root `npm run build` exits 0 (`--if-present` skips stubs); npm-syntax-only scripts.

## Phase 4: Git bootstrap + initial commit

- [x] 4.1 RED — repository selection: all git commands run with explicit workspace-root cwd, never from subdirectories.
- [x] 4.2 `git init -b main`; verify `git rev-parse --show-toplevel` = workspace root, branch `main`.
- [x] 4.3 Ignore policy: `git check-ignore` matches `node_modules/`, `.next/`, `dist/`, `.env.local`, not `PRD.md`, `TECH-DESIGN.md`, `adrs/`, `BACKLOG.md`, `openspec/` (read-only).
- [x] 4.4 `git add -A`; RED — commit state: index non-empty; nothing staged under `node_modules`/`.next`/`dist`.
- [x] 4.5 `git commit -m "chore: initialize monorepo workspace"`; never `commit -a`; no push.
- [x] 4.6 Gate: `git ls-files` tracks scaffolding + docs (`PRD.md`, `TECH-DESIGN.md`, `adrs/`, `BACKLOG.md`, `openspec/` — read-only); clean tree.
