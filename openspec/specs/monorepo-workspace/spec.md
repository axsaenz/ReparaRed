# monorepo-workspace Specification

## Purpose

The installable, buildable monorepo foundation: one npm-workspaces root for `apps/web`, `apps/api`, `packages/api-client`, and `packages/config`, with pinned toolchain, immutable installs, git bootstrap, and cross-platform orchestration.

## Requirements

### Requirement: Workspace Root Definition

The root manifest MUST declare a private npm-workspaces workspace whose members are exactly the packages under `apps/*` and `packages/*`, all resolvable from one root install.

#### Scenario: Member Discovery

- GIVEN `apps/web`, `apps/api`, `packages/api-client`, and `packages/config` exist
- WHEN members are resolved from the root
- THEN all four are detected and none resolves outside those globs

### Requirement: Immutable Installs

The workspace MUST commit a root lockfile from which `npm ci` installs immutably.

#### Scenario: Fresh-Clone Install

- GIVEN a clean checkout with the committed lockfile
- WHEN `npm ci` runs at the root
- THEN all workspace dependencies install and the lockfile stays unchanged

#### Scenario: Lockfile Drift Rejected

- GIVEN a lockfile out of sync with a workspace manifest
- WHEN `npm ci` runs
- THEN the install fails instead of rewriting the lockfile

### Requirement: Node Version Pinning

The workspace MUST declare the Node 24 LTS line consistently across `.nvmrc`, root `engines`, and `packageManager`, naming one package manager.

#### Scenario: Declarations Agree

- GIVEN the `.nvmrc`, `engines`, and `packageManager` declarations
- WHEN their versions are compared
- THEN all agree on the Node 24 LTS line and one package manager

### Requirement: Web App Skeleton

`apps/web` MUST be a minimal Next.js App Router + TypeScript skeleton that builds successfully, without business code.

#### Scenario: Web Build Succeeds

- GIVEN workspace dependencies installed
- WHEN the `apps/web` build script runs
- THEN the build exits successfully under the App Router convention

### Requirement: API Skeleton

`apps/api` MUST be a minimal NestJS + Fastify + TypeScript skeleton that builds and whose bootstrap starts an HTTP server.

#### Scenario: API Build Succeeds

- GIVEN workspace dependencies installed
- WHEN the `apps/api` build script runs
- THEN the build exits successfully

#### Scenario: Bootstrap Starts Server

- GIVEN the built `apps/api` skeleton
- WHEN its bootstrap entry runs
- THEN an HTTP server listens and keeps running until stopped

### Requirement: api-client Placeholder

`packages/api-client` MUST be a dependency-free placeholder that breaks neither install nor any build, in any order.

#### Scenario: Placeholder Breaks Nothing

- GIVEN the placeholder declares no dependencies and no failing build step
- WHEN `npm ci` and the root build run across buildable members
- THEN install and every buildable member's build succeed

### Requirement: Shared TypeScript Base Config

`packages/config` MUST provide a shared TypeScript base configuration consumed by `apps/web` and `apps/api`.

#### Scenario: Base Extended and Compilable

- GIVEN both app skeletons with dependencies installed
- WHEN their TypeScript configurations are inspected and either app compiles
- THEN each extends the shared base and compilation succeeds

### Requirement: Git Repository Bootstrap

The workspace MUST become a git repository whose initial commit includes scaffolding and planning documents.

#### Scenario: Initialized with Docs Tracked

- GIVEN the workspace was not a git repository
- WHEN this change completes
- THEN the initial commit tracks scaffolding plus `PRD.md`, `TECH-DESIGN.md`, `adrs/`, `BACKLOG.md`, `openspec/`, and never `node_modules` or outputs

### Requirement: Cross-Platform Orchestration

Root install and build scripts MUST run unmodified on Windows and Linux, without shell-specific syntax.

#### Scenario: Both Platforms Execute

- GIVEN Windows and Linux machines with the pinned toolchain
- WHEN the same root install and build scripts run on each
- THEN both succeed on both platforms

### Requirement: Root .gitignore

The root `.gitignore` MUST exclude `node_modules`, build outputs, and env files, and MUST NOT exclude planning documents.

#### Scenario: Artifacts Ignored, Docs Trackable

- GIVEN generated artifacts and planning documents present at the root
- WHEN git evaluates the ignore rules
- THEN artifacts are ignored while `PRD.md`, `TECH-DESIGN.md`, `adrs/`, `BACKLOG.md`, `openspec/` remain trackable

### Requirement: Workspace Lint Gate

The workspace MUST expose a lint gate covering every TypeScript/TSX source in applications and shared packages. Shared policy MUST come from `packages/config`; an app MAY narrow or override it. Violations MUST produce a non-zero exit.

#### Scenario: Fresh checkout lint

- GIVEN a fresh checkout with the committed manifests and lockfile
- WHEN the workspace lint gate runs without extra setup
- THEN it evaluates the application and shared-package TypeScript/TSX sources

#### Scenario: Lint violation

- GIVEN a lint violation exists in an app or `packages/config`
- WHEN the lint gate runs
- THEN it reports the violation and exits non-zero

### Requirement: Workspace Format Gate

The workspace MUST provide a format command that rewrites local files and a format check for all committed formatter-scope sources. `.next/`, `dist/`, lockfiles, and generated quality output MUST be excluded. Format drift MUST fail CI through the check.

#### Scenario: Local formatting

- GIVEN a formatter-scope source is not formatted
- WHEN the format command runs
- THEN the source is rewritten to the shared formatter policy

#### Scenario: CI format check

- GIVEN a source is drifted but generated output and lockfiles are present
- WHEN CI runs the format check
- THEN CI fails for source drift and ignores the excluded outputs

### Requirement: Standalone Application Type Gate

Each application MUST expose a standalone typecheck independent of build, honor the shared strict TypeScript base, and exit non-zero for type errors.

#### Scenario: Clean typecheck

- GIVEN both applications extend the shared strict TypeScript base
- WHEN each standalone typecheck runs
- THEN both complete successfully without invoking build

#### Scenario: Type error

- GIVEN an application contains a TypeScript type error
- WHEN its standalone typecheck runs
- THEN it reports the error and exits non-zero

### Requirement: Application Unit Test Gate

The test gate MUST execute at least one runnable unit-level baseline test in both `apps/web` and `apps/api`. Empty or `passWithNoTests`-only suites MUST NOT satisfy it, and tests MUST NOT start a server or use an external service.

#### Scenario: Baseline tests run

- GIVEN each application has an executable unit baseline test
- WHEN the root test gate runs
- THEN both tests execute and pass without server or external-service access

#### Scenario: Required test missing

- GIVEN a required application has no runnable test or only an empty passing suite
- WHEN the root test gate runs
- THEN the gate fails explicitly

### Requirement: Root Quality Orchestration

Root `lint`, `format`, `format:check`, `typecheck`, `test`, and `build` commands MUST fan out to all required workspace gates. Missing required scripts MUST fail explicitly, and scripts MUST use npm syntax only on Windows and Linux.

#### Scenario: Complete root fan-out

- GIVEN required workspace scripts exist and the pinned toolchain is installed
- WHEN any root quality or build command runs
- THEN it invokes every required workspace gate and returns its result

#### Scenario: Missing workspace script

- GIVEN a required workspace script is absent
- WHEN its root command runs
- THEN the command exits non-zero rather than silently skipping that workspace

### Requirement: Reproducible CI Quality Workflow

A CI workflow definition MUST specify one sequential Ubuntu quality job using the pinned Node 24/npm 12 toolchain: immutable install, lint, format check, typecheck, test, then build. It MUST NOT define deployment.

#### Scenario: Static workflow validity

- GIVEN the committed workflow definition is inspected
- WHEN its job and steps are evaluated
- THEN the pinned toolchain and required order are present with no deployment step

#### Scenario: Invalid workflow definition

- GIVEN a workflow reorders, omits, or adds deployment to the required sequence
- WHEN static CI validation evaluates it
- THEN the workflow fails the quality-workflow contract

### Requirement: Development-Only Quality Dependencies

Quality tooling MUST add zero runtime dependencies. Every quality dependency MUST be a devDependency, and the committed lockfile MUST remain the source used by `npm ci`.

#### Scenario: Dev-only manifests

- GIVEN quality manifests and the committed lockfile are inspected
- WHEN dependency classification and immutable installation are checked
- THEN quality dependencies are dev-only and `npm ci` uses the lockfile without rewriting it

#### Scenario: Runtime or lockfile leakage

- GIVEN a quality dependency is declared at runtime or the lockfile is stale
- WHEN policy validation or `npm ci` runs
- THEN validation or installation fails

### Requirement: Generated Quality Output Hygiene

Git ignore rules MUST exclude lint caches, coverage directories if present, and generated quality output without ignoring source or planning files. A committed `.editorconfig` MUST mirror formatter basics.

#### Scenario: Hygiene configuration

- GIVEN generated quality outputs and source/planning files exist
- WHEN ignore rules and editor configuration are inspected
- THEN outputs are ignored, source/planning files remain trackable, and formatter basics are defined

#### Scenario: Generated output appears

- GIVEN a lint cache or coverage directory is created
- WHEN git evaluates workspace status
- THEN the generated path is ignored and cannot pollute the committed source set
