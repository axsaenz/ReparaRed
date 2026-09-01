# Design: Quote Persistence

## Technical Approach

Add the tenth Prisma model and fourth enum without changing existing physical fields. Append hand-authored migration #4 in the established quoted, named-constraint style. Keep lifecycle legality, future availability, endpoints, seeds, and service effects outside this persistence capability; the unique database index remains the final race defense.

## Architecture Decisions

| Decision | Choice | Alternatives/tradeoff | Rationale |
|---|---|---|---|
| Lifecycle | PostgreSQL/Prisma enum; default `SUBMITTED`; no triggers | Text/check or triggers add drift and scope | Matches the closed-state precedent; later API commands own transitions. |
| Money/currency | `Decimal(8,2)` plus `VARCHAR(3)` and `PEN` check | Float, `CHAR(3)`, or currency enum weaken the locked ISO/fixed-precision contract | PostgreSQL preserves exact money and the MVP currency boundary. |
| Description/time | Trimmed 10–1000 check; required `TIMESTAMPTZ(6)` availability | Volatile `NOW()` check or API-only length | Matches migration #3 patterns while leaving future validation to API commands. |
| Reads/migration | Two directed read indexes, named pair unique, append `20260901000002_quotes` | Unique-only or rewritten history | Supports deterministic technician/request reads and preserves migration history/provider lock. |

## Data Flow

    Request + TechnicianProfile
              │ required restrictive FKs
              ▼
        Quote persistence row ──→ pair unique + ordered read indexes

Prisma validation/generation and static contracts inspect the declarative shape. No endpoint or transition command is introduced here.

## Prisma Schema Additions

```prisma
enum QuoteStatus {
  SUBMITTED
  WITHDRAWN
  SELECTED
  CLOSED
}

model Quote {
  id           String            @id(map: "quotes_pkey") @default(uuid()) @db.Uuid
  requestId    String            @db.Uuid @map("request_id")
  technicianId String            @db.Uuid @map("technician_id")
  amount       Decimal           @db.Decimal(8, 2)
  currency     String            @db.VarChar(3)
  description  String            @db.VarChar(1000)
  availableAt  DateTime          @map("available_at") @db.Timestamptz(6)
  status       QuoteStatus       @default(SUBMITTED)
  createdAt    DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  request      Request           @relation(fields: [requestId], references: [id], onDelete: Restrict, map: "quotes_request_id_fkey")
  technician   TechnicianProfile @relation(fields: [technicianId], references: [userId], onDelete: Restrict, map: "quotes_technician_id_fkey")

  @@unique([requestId, technicianId], map: "quotes_request_id_technician_id_key")
  @@index([technicianId, createdAt(sort: Desc), id], map: "idx_quotes_technician_created")
  @@index([requestId, createdAt(sort: Desc), id], map: "idx_quotes_request_created")
  @@map("quotes")
}

// Add inside the existing Request model.
quotes Quote[]

// Add inside the existing TechnicianProfile model.
quotes Quote[]
```

## Migration #4 SQL

File: `apps/api/prisma/migrations/20260901000002_quotes/migration.sql`

```sql
CREATE TYPE "QuoteStatus" AS ENUM ('SUBMITTED', 'WITHDRAWN', 'SELECTED', 'CLOSED');

CREATE TABLE "quotes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "technician_id" UUID NOT NULL,
  "amount" NUMERIC(8,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "available_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quotes_amount_check" CHECK ("amount" >= 0.01 AND "amount" <= 999999.99),
  CONSTRAINT "quotes_currency_check" CHECK ("currency" = 'PEN'),
  CONSTRAINT "quotes_description_check" CHECK (char_length(trim("description")) BETWEEN 10 AND 1000)
);

CREATE UNIQUE INDEX "quotes_request_id_technician_id_key" ON "quotes"("request_id", "technician_id");
CREATE INDEX "idx_quotes_technician_created" ON "quotes"("technician_id" ASC, "created_at" DESC, "id" ASC);
CREATE INDEX "idx_quotes_request_created" ON "quotes"("request_id" ASC, "created_at" DESC, "id" ASC);

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "quotes_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technician_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

## Interfaces / Contracts

The persistence contract is the model, enum, named constraints, and indexes above. `SELECTED`/`CLOSED` terminal semantics, request locking, availability revalidation, and resend/update behavior are downstream API obligations, not database triggers.

## Static Contract Test Plan

| Test | Required `STATIC` assertions |
|---|---|
| `quote-schema.spec.ts` | Model count 10; exactly four enum members; `Decimal(8,2)`, VarChar(3/1000), required mapped availability; all mappings, default, relation targets/actions, named unique, and both directed indexes. |
| `quote-migration.spec.ts` | Exact enum/table and named amount, `PEN`, and trimmed-description predicates; unique and two directed indexes; two `RESTRICT` FKs; no `INSERT INTO`, `CREATE FUNCTION`, or `CREATE TRIGGER`. |
| Existing contracts | Change only the model-count assertions in `identity-schema.spec.ts` and `request-image-schema.spec.ts` from 9 to 10. |

## Verification Commands

With a temporary disposable `DIRECT_URL` value (never committed):

```powershell
$env:DIRECT_URL = '<temporary-disposable-value>'
npm --prefix apps/api exec prisma validate -- --schema prisma/schema.prisma
npm --prefix apps/api exec prisma generate -- --schema prisma/schema.prisma
npm --prefix apps/api exec prisma migrate diff -- --from-empty --to-schema-datamodel prisma/schema.prisma --script
npm run format:check; npm run lint; npm run typecheck; npm run test; npm run build
```

Review the from-empty diff against the declarative portions of migrations #1–#4, tolerating known hand-authored additions. The live apply twice → status → seed gate remains `UNSATISFIED / RECORDED PENDING`; unique-race/concurrency proof is live-only.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add enum/model and two reverse relations. |
| `apps/api/prisma/migrations/20260901000002_quotes/migration.sql` | Create | Complete migration #4 DDL. |
| `apps/api/src/database/quote-schema.spec.ts` | Create | Static Prisma schema contract. |
| `apps/api/src/database/quote-migration.spec.ts` | Create | Static migration contract. |
| `apps/api/src/database/identity-schema.spec.ts` | Modify | Model count 9→10. |
| `apps/api/src/database/request-image-schema.spec.ts` | Modify | Model count 9→10. |

No other files change.

## Threat Matrix

| Boundary | Applicability and response | Planned RED evidence |
|---|---|---|
| Secrets | Applicable: schema/migration contain no URLs or credentials; forbidden-literal scan must fail closed. | Static schema/migration sensitive-literal assertions. |
| Shell | N/A: scripts are unchanged and no subprocess boundary is added. | None. |
| SQL injection | N/A: static quoted DDL has no runtime interpolation or input execution path. | None. |
| Documentation-like paths | N/A: no executable documentation classification changes. | None. |
| Git repository selection | N/A: no repository selector or automation changes. | None. |
| Commit state | Applicable but apply-owned: one intended commit; unrelated or unstaged state fails the apply gate. | Apply phase state check. |
| Push state / PR commands | N/A: push and PR ownership remain outside this change. | None. |

## Migration / Rollout

Append migration #4 in a single commit; no feature flag or phased rollout. Rollback is `git revert` of that commit. Do not rewrite prior migrations or reset the provider lock.

## Open Questions

None expected.
