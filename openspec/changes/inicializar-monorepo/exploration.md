# Exploration: BACKLOG item #1 — Inicializar el monorepo

**Change:** `inicializar-monorepo` (BACKLOG.md item #1)
**Scope:** Create the workspace and the skeletons of `apps/web`, `apps/api`, `packages/api-client` and shared configuration. No dependencies on other backlog items.
**Sources read:** `BACKLOG.md`, `TECH-DESIGN.md`, `openspec/config.yaml`, `Revision adversarial.md`, and the 20 accepted ADRs in `adrs/` (tooling constraints searched exhaustively; only ADR-0001/0003/0004/0005/0006/0007/0008 constrain this change). Environment verified empirically (Node/npm/git versions, absence of git repo).

## Current State

- The workspace is a **planning-only repository** at `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final`: `PRD.md`, `TECH-DESIGN.md` (v1.0, approved for MVP), `Design.md`, `BACKLOG.md`, `Revision adversarial.md`, `adrs/` (20 accepted ADRs), `openspec/` (config.yaml, empty `specs/`, `changes/archive/`), plus agent-tooling dirs (`.opencode/`, `.agents/`, `.atl/`, `opencode.json`, `skills-lock.json`).
- **No application code exists.** There is no root `package.json`, no `.gitignore`, no `.nvmrc`/`engines`, and **no `.git` directory — the workspace is NOT a git repository** (verified).
- `openspec/config.yaml` confirms: zero in-scope projects discovered, `strict_tdd: false` (no-runner fallback), and instructs to **re-run sdd-init detection after `apps/web` and `apps/api` are scaffolded** to populate per-project test commands and re-evaluate strict TDD.
- Verified local toolchain: **Node v24.15.0, npm 12.0.1, git 2.51.2 installed; pnpm and yarn are NOT installed**. OS is Windows (`win32`).
- Decisions already locked (do not re-litigate):
  - **ADR-0001:** monorepo with two independently deployable apps (web + API); API is the only authority for authorization/business rules/data.
  - **ADR-0004 / ADR-0005:** Next.js App Router + React + TypeScript for `apps/web`; NestJS + Fastify + TypeScript on a stable supported Node.js for `apps/api`.
  - **ADR-0003:** REST + versioned OpenAPI contract; web client types generated/validated from OpenAPI **inside the monorepo**; OpenAPI is the only frontier between apps (TECH-DESIGN §3.4: Prisma entities are NOT shared with the frontend).
  - **ADR-0008:** web deploys to Vercel, API to Railway; each platform observes only the app/packages it needs to build; production deploys come from a protected branch after build + static analysis + tests pass.
  - **TECH-DESIGN §3.4 layout:** `apps/web`, `apps/api`, `packages/api-client`, `packages/config` ("shared lint/TypeScript configuration, no secrets"), with `adrs/`, `PRD.md`, `TECH-DESIGN.md` at the root.
  - **TECH-DESIGN §12.2:** pipeline step 1 requires installing dependencies with an **immutable lockfile**.

## Affected Areas

Everything is new; nothing existing is modified except adding repo-root scaffolding files:

- `package.json` (root) — private workspace root; workspace membership for `apps/*` and `packages/*`; root orchestration scripts.
- Lockfile (root) — whichever package manager is chosen; must support immutable installs (TECH-DESIGN §12.2).
- `.gitignore` (root) — does not exist yet; must ignore `node_modules/`, build outputs, env files, and decide the treatment of agent-tooling dirs (`.opencode/` has its own `.gitignore` for its internal `node_modules`/`package.json`).
- Node pinning — `.nvmrc` and/or root `engines` + `packageManager` fields.
- `apps/web/` — minimal Next.js App Router + TypeScript skeleton: `package.json`, `tsconfig.json` (extending the shared base), minimal `src/app` entry that builds.
- `apps/api/` — minimal NestJS + Fastify + TypeScript skeleton: `package.json`, `tsconfig.json`, minimal bootstrap that builds. **No** env validation, error filters, logging, health checks (item #3).
- `packages/api-client/` — placeholder package (`package.json`, `tsconfig.json`, empty `src/` or index stub). Real generated client is item #10; the placeholder must not break workspace installs or builds.
- `packages/config/` — shared TypeScript base config (tsconfig base consumed by both apps). TECH-DESIGN §3.4 also names it the home of shared lint config; see Boundary analysis for what lands now vs. in item #2.
- Git repository — `git init` + initial commit of planning docs and scaffolding (workspace is not a repo today; ADR-0008's "protected branch" presupposes one).

## Approaches

Axes below are the ones genuinely undecided. TECH-DESIGN/ADRs lock the layout, frameworks, and OpenAPI boundary — those are not compared. The adversarial review (`Revision adversarial.md`, Sugerencia 4) explicitly flags that ADR-0001 accepted "monorepo tools and automation" as a cost **without choosing any** (names pnpm/npm workspaces and Turborepo as open questions) and that the CI platform is unnamed.

### Axis 1 — Package manager (workspace mechanism)

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. npm workspaces** | npm 12 ships with the installed Node 24 (zero extra install, verified present); `npm ci` gives the immutable lockfile TECH-DESIGN requires; Vercel and Railway both support npm; simplest for a one-developer course MVP | No strict isolation (phantom dependencies possible); weaker incremental semantics than pnpm | Low |
| **B. pnpm workspaces** | Strict isolated `node_modules`, disk-efficient, first-class monorepo ergonomics (`-r`, `--filter`); supported by Vercel/Railway | Not installed locally (requires `corepack enable` or global install — verified absent); one more tool to pin and keep consistent in CI | Low–Medium |

Both satisfy ADR-0001 and TECH-DESIGN §12.2; this is a genuine open decision.

### Axis 2 — Monorepo task runner

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. No task runner; root npm scripts** (`npm run build --workspaces`, `--workspace=<name>`) | Zero extra dependencies/config; with only 2 apps + 2 packages there is little to cache or parallelize; keeps item #1 minimal | No remote/local build cache; scripts get verbose as items #2/#10 add tasks | Low |
| **B. Turborepo** | Task pipelines + caching; standard for Next.js monorepos; helps CI speed | Extra dependency + `turbo.json` before there is measurable pain; value is low for 2 deployables in a course MVP | Medium |
| **C. Nx** | Powerful graph/tooling | Heaviest option; plugin ecosystem far beyond MVP needs | Medium–High |

Also genuinely open (adversarial review flags it). Nothing in TECH-DESIGN/ADRs mandates a runner.

### Axis 3 — Skeleton depth

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. Minimal hand-controlled skeletons** | Exact scope control; nothing from item #2/#3/#4 leaks in; each app only needs to install and build | Slightly more manual setup | Low |
| **B. Official generators** (`create-next-app`, NestJS CLI) | Fast, idiomatic defaults | Generators bundle lint/test configs that overlap item #2's scope and would need cleanup; risk of pulling scope across the boundary | Low–Medium |

Recommended: minimal skeletons (A), optionally seeded from generators with cleanup, with a verifiable acceptance: one workspace install and a successful build of `apps/web` and `apps/api`.

## Boundary Analysis (item #1 vs. items #2/#3/#4/#10)

**IN scope of item #1:**
- Root workspace definition (root `package.json` + lockfile + workspace globs `apps/*`, `packages/*`).
- Node version pinning (`.nvmrc` and/or `engines` + `packageManager`).
- Root `.gitignore`; `git init` + initial commit (planning docs included).
- `apps/web`: minimal Next.js App Router + TypeScript app that builds.
- `apps/api`: minimal NestJS + Fastify + TypeScript app that builds.
- `packages/api-client`: placeholder package that installs cleanly (real client = item #10).
- `packages/config`: shared **TypeScript base configuration** (tsconfig base extended by both apps) — required now because the skeletons must compile consistently.
- Root orchestration scripts limited to install/build of the skeletons.

**OUT of scope (must not leak in):**
- **Item #2:** ESLint/Prettier tool selection, wiring, scripts and execution; test runners; CI workflows and CI-platform choice; build-reproducibility automation. ESLint/Prettier *base files* may be created as inert config, but the cleaner cut is to let item #2 author them when it wires the tools (TECH-DESIGN §3.4 already fixes `packages/config` as their future home).
- **Item #3:** NestJS module structure, validated env vars, uniform errors, tracing, structured logs, health checks.
- **Item #4:** Prisma schema, client, migrations, DB connections (Prisma lives inside `apps/api` per ADR-0006/0007).
- **Item #6:** seeds. **Item #10:** OpenAPI generation and the real `api-client`. **Item #11:** environments, Vercel/Railway/Supabase configuration.
- Any business code, domain model, or authorization logic.

## Open Decisions (not settled by TECH-DESIGN/ADRs — proposal must resolve)

1. **Package manager:** npm workspaces vs. pnpm (see Axis 1). Interaction: whichever is chosen fixes the lockfile type for item #2's CI and for the immutable-install requirement.
2. **Task runner:** none (root npm scripts) vs. Turborepo vs. Nx (see Axis 2).
3. **Node/version pinning shape:** `.nvmrc` only vs. `engines` + `packageManager` fields; and the concrete LTS line to pin (ADR-0005 only says "stable and supported"; installed local version is Node 24.15.0). Deployment targets' Node runtimes must stay compatible (Vercel/Railway, item #11).
4. **Git initialization:** `git init` in this same folder (recommended — TECH-DESIGN §3.4 intends `adrs/`, `PRD.md`, `TECH-DESIGN.md` at the monorepo root) plus the decision of what to commit vs. ignore among agent-tooling artifacts (`.opencode/`, `.agents/`, `.atl/`, `opencode.json`, `skills-lock.json`). Branch name and protected-branch convention belong to item #11/CI but the repo must exist first.
5. **`packages/config` content at this stage:** TypeScript base only (recommended) vs. TypeScript + inert ESLint/Prettier bases (see Boundary analysis).
6. **Concrete framework versions:** ADR-0004/0005 say "stable and supported" — the proposal must pin the current stable Next.js and NestJS/Fastify major lines.
7. **`packages/api-client` placeholder contract:** package name, exports stub, and the guarantee that it neither declares missing deps nor breaks workspace builds before item #10.
8. **Windows/local specifics:** all scripts must be cross-platform (development machine is Windows; future CI likely runs Linux).

## Recommendation

1. **npm workspaces** as package manager (present locally with zero extra setup; `npm ci` satisfies the immutable-lockfile requirement; both deploy targets support it). Choose pnpm instead if the team prefers strict dependency isolation — either is ADR-conformant; the proposal must pick one and pin it.
2. **No task runner yet** — root npm scripts orchestrating `build`/later quality tasks per workspace. Revisit Turborepo only if item #2's CI shows real friction; adding it later is cheap and additive.
3. **Minimal, hand-controlled skeletons** for both apps with a hard acceptance gate: a single workspace install plus successful build of `apps/web` and `apps/api`. Pin Node via `.nvmrc` + `engines`/`packageManager`.
4. **`git init` + initial commit** as part of this change; root `.gitignore` covering `node_modules/`, build outputs, env files, and an explicit decision on agent-tooling dirs.
5. `packages/config` ships the **TypeScript base config only**; lint/format bases land with item #2.
6. After merging, **re-run sdd-init detection** (per `openspec/config.yaml` note) to populate per-project test commands and re-evaluate `strict_tdd`.

## Risks

- **Scope creep into items #2/#3/#4** (lint tooling, NestJS operational base, Prisma) — the highest-risk failure mode; mitigated by the boundary list above and by spec scenarios limited to "workspace exists, skeletons build".
- **Planning docs and monorepo share one root:** root `.gitignore` must not exclude `PRD.md`/`TECH-DESIGN.md`/`adrs/`/`BACKLOG.md`/`openspec/`, and the git status will permanently include agent-tooling dirs unless explicitly ignored/committed.
- **`packages/api-client` placeholder** can break workspace installs/builds if it declares missing dependencies or a build script with no sources; keep it dependency-free with no build script until item #10.
- **Node pin vs. deploy targets:** pinning a Node line that Vercel/Railway do not run creates a late surprise in item #11; pin a current LTS that both platforms support.
- **Workspace lives under OneDrive:** git + `node_modules` inside a synced folder can cause lock/sync churn; mitigated by ignoring `node_modules` and build outputs in the root `.gitignore`.
- **Windows authoring / Linux CI divergence:** shell-specific script syntax would break later CI; enforce cross-platform npm scripts from day one.
- **Change size:** scaffolding produces many small new files; the tasks phase should forecast the 400-line review budget and consider slicing (e.g., workspace+config vs. app skeletons) if needed.

## Ready for Proposal

**Yes.** All inputs exist and are consistent: TECH-DESIGN §3.4 fixes the layout and the meaning of "shared configuration" (`packages/config`), the ADRs fix frameworks and the OpenAPI boundary, and the genuinely open decisions (package manager, task runner, Node pinning, git init, placeholder shape) are enumerated above with viable options. The orchestrator should proceed to `sdd-propose` for `inicializar-monorepo`, instructing the proposal to resolve open decisions 1–7 explicitly and to keep quality controls, NestJS foundation, and Prisma strictly out of scope (items #2/#3/#4).
