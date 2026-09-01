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
