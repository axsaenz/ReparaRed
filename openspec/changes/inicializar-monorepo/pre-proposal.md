# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 2
- status: confirmed
- exploration: `openspec/changes/inicializar-monorepo/exploration.md`
- research: unselected
- proposal_ready: true

## Confirmed product decisions (user-confirmed 2026-09-01)

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | package_manager | `npm-workspaces` |
| 2 | task_runner | `none` (root npm scripts only) |
| 3 | node_pinning | `nvmrc+engines+packageManager`, Node 24 LTS line |
| 4 | git_init | `now` — git init + initial commit within this change |
| 5 | packages_config_scope | `tsconfig-only` (lint/format bases belong to backlog item #2) |
| 6 | api_client_placeholder | `minimal-dep-free-stub` (no deps, no build script) |
| 7 | framework_versions | `current-stable-majors` compatible with Node 24 LTS |

Constraint (not a choice): all root npm scripts must be cross-platform (Windows dev, Linux CI).
Source: exploration.md "Open Decisions" 1-7. All decisions confirmed via grouped user prompt on 2026-09-01.
