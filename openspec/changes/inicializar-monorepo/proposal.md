# Proposal: Initialize the Monorepo (BACKLOG item #1)

## Intent

Workspace is planning-only (PRD, TECH-DESIGN, 20 ADRs; no code, no git repo). This change builds the TECH-DESIGN §3.4 layout as an installable, buildable monorepo for all later backlog items.

## Scope

### In Scope
- Root npm-workspaces workspace (`apps/*`, `packages/*`) + immutable `package-lock.json`
- Node 24 LTS pinning: `.nvmrc` + `engines` + `packageManager`
- Root `.gitignore`; `git init` + initial commit
- Minimal buildable Next.js App Router + TypeScript skeleton at `apps/web`
- Minimal buildable NestJS + Fastify + TypeScript skeleton at `apps/api`
- Dependency-free placeholder at `packages/api-client`
- TypeScript-base-only shared config at `packages/config`
- Cross-platform root install/build npm scripts (no task runner)

### Out of Scope
- Lint/format wiring, test runners, CI (item #2)
- NestJS operational foundation (item #3); Prisma/DB (item #4)
- OpenAPI generation / real api-client (item #10); environments/deployment (item #11)
- Business/domain code

## Capabilities

### New Capabilities
- `monorepo-workspace`: workspace root, Node pinning, app skeletons, shared tsconfig base, api-client placeholder, git bootstrap.

### Modified Capabilities
- None (`openspec/specs/` is empty).

## Approach

Per exploration + confirmed decisions: npm workspaces (`npm ci` gives immutable installs); no task runner — root npm scripts only; minimal skeletons gated on one install + both builds. Pin current stable majors: Next.js 16.x + React 19.x (`apps/web`); NestJS 12.x + `@nestjs/platform-fastify` 12.x / Fastify 5.x (`apps/api`). `packages/config` ships the tsconfig base only; lint/format bases land in item #2.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` (root) | New | Workspace root; globs; orchestration scripts |
| `package-lock.json` | New | Immutable lockfile |
| `.gitignore` | New | Ignores `node_modules/`, outputs, env files |
| `.nvmrc` | New | Node 24 LTS line |
| `apps/web/` | New | Minimal Next.js App Router + TS skeleton |
| `apps/api/` | New | Minimal NestJS + Fastify skeleton |
| `packages/api-client/` | New | Dep-free stub; no build script |
| `packages/config/` | New | Shared tsconfig base |
| `.git/` | New | Initial commit |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep into items #2/#3/#4 | Med | Strict boundary; specs limited to install + build scenarios |
| Placeholder breaks install/build | Low | `api-client`: no deps, no build script |
| Node pin vs. deploy targets | Low | Node 24 LTS supported by Vercel/Railway |
| OneDrive sync churn | Med | `.gitignore` covers `node_modules`/outputs |
| Windows/Linux script divergence | Low | Cross-platform npm scripts only |

## Rollback Plan

Greenfield — nothing pre-exists. Pre-commit: delete created paths (`package.json`, `package-lock.json`, `.gitignore`, `.nvmrc`, `apps/`, `packages/`). Post-commit: remove `.git/` or revert the single initial commit. Planning docs are untouched, so deletion restores prior state.

## Dependencies

- Node 24 LTS, npm, git (verified installed)
- None on other backlog items

## Success Criteria

- [ ] Single `npm ci` installs the whole workspace
- [ ] `apps/web` builds
- [ ] `apps/api` builds
- [ ] `packages/api-client` breaks neither install nor build
- [ ] Git repo initialized with initial commit
- [ ] Node pinned via `.nvmrc` + `engines` + `packageManager`
- [ ] Root scripts work on Windows and Linux
