# Pre-Proposal State — gentle-ai.sdd-preproposal/v1

- revision: 1
- status: confirmed
- exploration: `openspec/changes/cotizaciones/exploration.md`
- research: unselected
- proposal_ready: true
- confirmed_by: orchestrator (auto mode mandate 2026-09-01 — recommended options auto-selected)

## Confirmed product decisions

| # | Decision | Confirmed value |
|---|----------|-----------------|
| 1 | quote_status | `quote-status-enum` — Prisma enum QuoteStatus {SUBMITTED, WITHDRAWN, SELECTED, CLOSED} (locked members); NO transition triggers; transitions API-owned under ADR-0015 (#23/#28/#31) |
| 2 | initial_status | `submitted-default` — DB default SUBMITTED matching #28 creation semantics (recorded implementation choice) |
| 3 | currency_physical | `varchar3-check-pen` — String @db.VarChar(3) + named quotes_currency_check = 'PEN' (ISO-code field per ADR-0016; future currencies = later decision) |
| 4 | description_check | `trimmed-10-1000` — VarChar(1000) + named trimmed char_length check 10–1000 (bounds locked; trim predicate = implementation choice, #5/#7 pattern) |
| 5 | read_indexes | `technician-created-plus-request-created` — idx_quotes_technician_created (technician_id ASC, created_at DESC, id ASC) for #29 + idx_quotes_request_created (request_id ASC, created_at DESC, id ASC) for #30 + named unique (request_id, technician_id) |
| 6 | availability_enforcement | `api-validation-split` — availableAt TIMESTAMPTZ(6) REQUIRED persisted; no volatile NOW() DB check; future validation at create (#28) + revalidation under request lock at selection (#31) |
| 7 | state_instants | `created-updated-only` — no selectedAt/closedAt/audit (not locked for #8) |
| 8 | migration_naming | `20260901000002_quotes` — next ordered migration; never rewrite #1–#3 or reset provider lock |

## Locked model content (binding, verbatim from TECH-DESIGN §5.1/§6.1/§6.2 + ADR-0015/0016/0017)

- `quotes`: id, requestId, technicianId (REQUIRED), amount, currency, description, availableAt, status, timestamps; ÚNICA por solicitud+técnico; NUMERIC(8,2) entre 0.01 y 999999.99; moneda PEN; descripción 10–1000; índice por técnico y creación.
- Relations: requests 1—* quotes *—1 technician_profiles (FKs → requests.id + technician_profiles.user_id, restrictive).
- States: SUBMITTED (editable/withdrawable while request PUBLISHED, selectable by client), WITHDRAWN (re-editable/resubmittable while PUBLISHED), SELECTED (terminal, linked to service), CLOSED (terminal, other chosen or request cancelled).
- Money: decimal fixed precision + ISO 4217 code; MVP only PEN validated by API + DB constraint; amount > 0 (ADR-0016); NUMERIC scale 2 (ADR-0016); Float/number storage FORBIDDEN → Prisma Decimal @db.Decimal(8,2).
- availableAt: TIMESTAMPTZ UTC (ADR-0017); future-only is API validation.
- Concurrency: DB unique index = final defense; API request-row lock + revalidation per ADR-0015 (#28 create: lock request, check PUBLISHED + specialty, insert; #31 select: lock, SELECTED one, CLOSED rest, request ASSIGNED, create service).
- Re-send/edit (#29) = update same row preserving unique pair + updatedAt.

## Capability impact (binding)

NEW capability `quote-persistence`. No modifications to existing capabilities (expected side effect: model-count assertions in prior static contract tests update 9→10).

## Scope boundary (binding)

IN: Quote model + QuoteStatus enum, amount/currency/description named checks, unique pair + two read indexes, two restrictive FKs, migration #4, offline static contracts, compatibility test updates, quality gates. OUT: endpoints/commands (#23/#28–#32), service creation (#9/#31), transition triggers, future-date DB checks, auth, OpenAPI, money display, seeds.

## Carried forward (binding)

Live PostgreSQL gate remains UNSATISFIED (migrations #1–#4 apply→re-apply→status + seed execution). Offline evidence only; MUST NOT claim live acceptance. Enforcement split: quote transitions are API-owned under ADR-0015.
