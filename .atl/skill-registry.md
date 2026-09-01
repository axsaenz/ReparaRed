# Skill Registry

- Workspace root: `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final`
- Generated: 2026-09-01 by `sdd-init`
- Purpose: index of exact `SKILL.md` paths. Sub-agents receive these paths and read the full skill source of truth. This file is an index, not a generated summary.

## Project Skills

### branch-pr

- Scope: project (`.opencode/skills`)
- Trigger: Create Gentle AI pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review.
- Path: `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final\.opencode\skills\branch-pr\SKILL.md`

### chained-pr

- Scope: project (`.opencode/skills`)
- Trigger: Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus.
- Path: `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final\.opencode\skills\chained-pr\SKILL.md`

### judgment-day

- Scope: project (`.opencode/skills`)
- Trigger: Trigger: judgment day, dual review, adversarial review, juzgar. Run explicit blind dual review with at most two scoped fix/re-judgment rounds.
- Path: `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final\.opencode\skills\judgment-day\SKILL.md`

### work-unit-commits

- Scope: project (`.opencode/skills`)
- Trigger: Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code.
- Path: `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final\.opencode\skills\work-unit-commits\SKILL.md`

### generar-backlog

- Scope: project (`.agents/skills`)
- Trigger: Despieza un PRD + Technical Design Document en un backlog ordenado de specs implementables, cada una lista para arrancar un ciclo de Spec-Driven Development (SDD). Use when the user asks to break down, decompose, or turn a PRD/technical design into a backlog, roadmap, list of features, or list of specs to implement.
- Path: `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final\.agents\skills\generar-backlog\SKILL.md`

### generar-tech-design

- Scope: project (`.agents/skills`)
- Trigger: Genera el Technical Design Document + ADRs (formato MADR) + criterios de aceptación de un proyecto, entrevistando al usuario decisión por decisión a partir de su PRD (y opcionalmente su Design.md o un repo existente). Use when the user asks to generate, draft, or create a technical design document, system architecture, or architecture decision records (ADRs) for a project, greenfield or brownfield.
- Path: `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final\.agents\skills\generar-tech-design\SKILL.md`

### revision-adversarial

- Scope: project (`.agents/skills`)
- Trigger: Revisa de forma adversarial un Technical Design Document y sus ADRs, buscando activamente huecos, riesgos y decisiones débiles en vez de validarlos. Use when the user asks to challenge, stress-test, get a second opinion on, or adversarially review a technical design document, architecture decisions, or ADRs.
- Path: `C:\Users\aleja\OneDrive\Documentos\AI Software DMC\Proyecto final\.agents\skills\revision-adversarial\SKILL.md`

## User Skills

### frontend-qa-playwright

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use when Build self-validates or reviewer independently validates rendered frontend behavior with Playwright using risk-triggered mutation, network, responsive-content, accessibility, and asset-resilience profiles.
- Path: `C:\Users\aleja\.config\opencode\skills\frontend-qa-playwright\SKILL.md`

### independent-test-gates

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use only for an exact team dispatch of one BASELINE, RED, or GREEN gate, or when the user explicitly requests Build run one named gate; never trigger for generic testing.
- Path: `C:\Users\aleja\.config\opencode\skills\independent-test-gates\SKILL.md`

### local-runtime-lifecycle

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use when Build or environment-operator must prepare, start, stop, restart, inspect, or clean up a local process-based service with ports, logs, readiness checks, and requested retention.
- Path: `C:\Users\aleja\.config\opencode\skills\local-runtime-lifecycle\SKILL.md`

### opencode-agent-creator

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use instead of generic customize-opencode when creating, reviewing, or improving one cohesive bounded workset centered on focused OpenCode agents. Define clear roles with valid frontmatter, least-privilege permissions, and prompts consistent with adjacent orchestration and workflows.
- Path: `C:\Users\aleja\.config\opencode\skills\opencode-agent-creator\SKILL.md`

### opencode-skill-creator

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use instead of generic customize-opencode when creating, reviewing, or improving one cohesive bounded workset centered on focused OpenCode skills. Keep each skill trigger-specific and host-portable, with supporting resources only when they improve reuse.
- Path: `C:\Users\aleja\.config\opencode\skills\opencode-skill-creator\SKILL.md`

### review-fix-workflow

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use when Build or code-executor corrects independent review findings by translating them into invariants, inspecting equivalent in-scope sibling paths, and implementing one bounded production correction without weakening evidence.
- Path: `C:\Users\aleja\.config\opencode\skills\review-fix-workflow\SKILL.md`

### risk-based-review-planning

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use from orchestrator for non-trivial team implementation planning. Convert changed behavior and direct sources into material risk invariants, evidence owners, proof, and invalidation dependencies before delegation.
- Path: `C:\Users\aleja\.config\opencode\skills\risk-based-review-planning\SKILL.md`

### risk-driven-code-review

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use when Build self-reviews or reviewer independently reviews cumulative production changes through selected contract, recovery, trust, concurrency, rendered-data, and evidence lenses.
- Path: `C:\Users\aleja\.config\opencode\skills\risk-driven-code-review\SKILL.md`

### stitch-ui-workflow

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use when Build or code-executor implements supplied Stitch screens, generated code, assets, and design-system references in an existing frontend while preserving product contracts and asset integrity.
- Path: `C:\Users\aleja\.config\opencode\skills\stitch-ui-workflow\SKILL.md`

### visual-reference-review

- Scope: user (`~/.config/opencode/skills`)
- Trigger: Use when Build self-compares or reviewer independently compares a rendered interface with screenshots, Figma, Stitch, mockups, generated reference code, or a design system without repeating full runtime QA.
- Path: `C:\Users\aleja\.config\opencode\skills\visual-reference-review\SKILL.md`

## Convention Files

Scanned at the workspace root: `AGENTS.md`, `agents.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, `.github/copilot-instructions.md`.

Result: none found. No convention index files to include.

## Scan Notes

- Project skill directories scanned: `.opencode/skills/`, `.agents/skills/` (the other listed project-level directories do not exist at the workspace root).
- User skill directories scanned: `~/.config/opencode/skills/`, `~/.codex/skills/` (the other fourteen listed user-level directories do not exist under `C:\Users\aleja`).
- Skipped per scan rules: 11 `sdd-*` skills (sdd-apply, sdd-archive, sdd-design, sdd-explore, sdd-init, sdd-onboard, sdd-propose, sdd-research, sdd-spec, sdd-tasks, sdd-verify), `_shared`, and `skill-registry`.
- Excluded `~/.codex/skills/.system/` (imagegen, openai-docs, plugin-creator, review-agent, skill-creator, skill-installer): host-internal Codex system namespace marked by `.codex-system-skills.marker`, not user-authored workspace skills.
- Deduplication by skill name with project-level preference applied; no name collisions were found between project-level and user-level scopes.
