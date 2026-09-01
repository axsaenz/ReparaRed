# Design: Initialize the Monorepo (BACKLOG item #1)

## Technical Approach

Hand-authored npm-workspaces monorepo per TECH-DESIGN §3.4: private root (`apps/*` + `packages/*`), committed lockfile for immutable `npm ci`, Node 24 LTS pinned in three declarations, minimal Next.js 16 and NestJS 12/Fastify 5 skeletons on one shared tsconfig base, dependency-free api-client stub, root npm-script orchestration, then `git init -b main` + one commit. Scenarios gate on exit codes and file inspection; no test framework yet (item #2).

## Architecture Decisions

| Decision | Options & tradeoffs | Choice & rationale |
|---|---|---|
| D1. `apps/api` format | ESM needs `"type":"module"` + `.js` extensions; CJS has proven decorator pipeline | **CommonJS**. Gates = build + bootstrap-listens; CJS = fewest parts. Node 24 `require(esm)` keeps later ESM additive |
| D2. TS shape | composite/references add `tsc -b` Next can't join; plain extends has none | One `packages/config/tsconfig.base.json`, `strict`, plain extends; base = shared flags only. Per app: web `esnext`/`bundler` + `noEmit`; api `commonjs`, emit `dist/` |
| D3. `apps/web` skeleton | create-next-app bundles lint/test config colliding with item #2 | Hand-authored App Router: `src/app` layout + one static page, `next.config.ts`; Turbopack default; no ESLint |
| D4. Root orchestration | task runner rejected; npm scripts | `build`: `npm run build --workspaces --if-present`; per-app `--workspace=<name>`; install bare `npm ci`. npm syntax only — no shell operators/env prefixes — identical Windows/Linux |
| D5. Pins (caret majors, verified 2026-09-01) | — | web: next `^16.3.4`, react(+dom) `^19`; dev: typescript `^5`, @types/node `^24`, @types/react(+dom) `^19`. api: @nestjs/{common,core,platform-fastify} `^12.0.1`, fastify `^5`, reflect-metadata `^0.2`, rxjs `^7`; dev: typescript `^5`, @types/node `^24`; `tsc` build, no `@nestjs/cli`. Apps devDep `@repara/config "*"`. Runtime → deps; types → devDeps |
| D6. `.gitignore` | — | Ignored: `node_modules/`, `.next/`, `dist/`, `*.tsbuildinfo`, `.env*`, `npm-debug.log*`. Trackable: `PRD.md`, `TECH-DESIGN.md`, `adrs/`, `BACKLOG.md`, `openspec/`, `Design.md`, `Revision adversarial.md`, `PRD Saenz.pdf`. `.opencode/` needs no root rule (nested `.gitignore` covers it); agent tooling committed |
| D7. Git bootstrap | — | `git init -b main` (ADR-0008 protected branch → item #11). `git add -A`, verify non-empty index, one commit `chore: initialize monorepo workspace`. No `commit -a`, no push |

## Data Flow

    npm ci ──→ package-lock.json ──→ node_modules/ (symlinks: 4 members)
    npm run build ──→ --workspaces --if-present
        ├─→ @repara/web ──→ next build ──→ apps/web/.next/
        ├─→ @repara/api ──→ tsc ──→ apps/api/dist/main.js
        └─→ api-client, config ──→ skipped (no build script)
    node apps/api/dist/main.js ──→ Fastify on :3000

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json` (root) | Create | workspaces, engines, packageManager, D4 scripts |
| `package-lock.json` | Create (gen) | tracked lockfile; enables `npm ci` |
| `.nvmrc` | Create | `24.15.0` |
| `.gitignore` | Create | D6 policy |
| `apps/web/package.json` | Create | D5 pins; `dev|build|start` = `next dev|build|start` |
| `apps/web/tsconfig.json` | Create | extends base; esnext/bundler, `noEmit`, `jsx: preserve`, next plugin |
| `apps/web/next.config.ts` | Create | minimal config |
| `apps/web/src/app/{layout,page}.tsx` | Create | root layout + one static page |
| `apps/web/next-env.d.ts` | Create (gen) | emitted by first `next build`; tracked |
| `apps/api/package.json` | Create | D5 pins; `build`: `tsc -p tsconfig.json`; `start`: `node dist/main.js` |
| `apps/api/tsconfig.json` | Create | extends base; commonjs, decorators, `outDir: dist` |
| `apps/api/src/main.ts` | Create | NestFactory + FastifyAdapter; listens `0.0.0.0:3000` |
| `apps/api/src/{app.module,app.controller}.ts` | Create | root module; `GET /` stub |
| `packages/api-client/package.json` | Create | dep-free stub; no build script |
| `packages/api-client/index.js` | Create | `module.exports = {}` |
| `packages/config/package.json` | Create | private; exports `./tsconfig.base.json` |
| `packages/config/tsconfig.base.json` | Create | shared strict base (below) |

## Interfaces / Contracts

```json
// root package.json
{ "name": "reparared", "private": true, "workspaces": ["apps/*", "packages/*"],
  "engines": { "node": "^24.0.0" }, "packageManager": "npm@12.0.1",
  "scripts": { "build": "npm run build --workspaces --if-present",
    "build:web": "npm run build --workspace=@repara/web",
    "build:api": "npm run build --workspace=@repara/api" } }
// packages/config/package.json
{ "name": "@repara/config", "private": true,
  "exports": { "./tsconfig.base.json": "./tsconfig.base.json" } }
// packages/config/tsconfig.base.json (module stays per-app)
{ "compilerOptions": { "strict": true, "target": "ES2023", "esModuleInterop": true,
    "skipLibCheck": true, "forceConsistentCasingInFileNames": true } }
// packages/api-client/package.json
{ "name": "@repara/api-client", "version": "0.0.0", "private": true,
  "description": "Placeholder; real client is item #10",
  "main": "index.js", "exports": { ".": "./index.js" } }
```

## Testing Strategy

No test runner (item #2). Verification = manual/scripted build gates, not unit tests:

| Spec scenario | Verification |
|---|---|
| Member Discovery | `npm query ".workspace"` lists exactly 4 members |
| Fresh-Clone Install | clean checkout: `npm ci` exits 0; lockfile unchanged |
| Lockfile Drift Rejected | edit manifest: `npm ci` non-zero, lockfile unchanged; revert |
| Declarations Agree | compare `.nvmrc`/`engines.node`/`packageManager`: Node 24 LTS + npm |
| Web Build Succeeds | `npm run build --workspace=@repara/web` exits 0; `.next/` exists |
| API Build Succeeds | `npm run build --workspace=@repara/api` exits 0; `dist/main.js` exists |
| Bootstrap Starts Server | `node apps/api/dist/main.js`; probe `localhost:3000` until 200; alive until killed |
| Placeholder Breaks Nothing | `npm ci` + root `npm run build` exit 0 (`--if-present` skips api-client) |
| Base Extended and Compilable | both tsconfigs extend `@repara/config/tsconfig.base.json`; compiles exit 0 |
| Initialized with Docs Tracked | `git ls-files` has docs + scaffolding; no `node_modules`/`.next`/`dist` |
| Both Platforms Execute | Windows: all gates now; Linux → item #2 CI; scripts npm-syntax-only |
| Artifacts Ignored, Docs Trackable | `git check-ignore` matches artifacts, not docs |

## Threat Matrix

| Boundary | Applicability | Design response |
|---|---|---|
| Documentation-like paths | N/A — Markdown is docs only | — |
| Git repository selection | Applicable — git runs during scaffolding | All git pinned to repo root via explicit cwd |
| Commit state | Applicable — initial commit | Explicit `git add -A`; verify non-empty index; never `commit -a` |
| Push state | N/A — no remote configured | — |
| PR commands | N/A — no PR automation; protected branch → item #11 | — |

Applicable rows propagate unchanged to `tasks.md` as RED-test boundaries.

## Migration / Rollout

No migration (greenfield). Rollout = single initial commit on `main`; rollback per proposal.

## Open Questions

None.
