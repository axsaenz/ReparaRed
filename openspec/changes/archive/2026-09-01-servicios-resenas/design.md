# Design: Persist Services and Reviews

> **Amendment record (2026-09-01):** Apply failed Prisma 6.19.3 validation with P1012 because the composite one-to-one relation requires defining-side uniqueness. Added the required Service composite unique, migration index, and corresponding static test assertions; no scope change and no fallback used.

## Technical Approach

Append migration #5 using the existing hand-authored PostgreSQL style, then align Prisma 6.19.3 models and `STATIC` Vitest contracts. The database stores normalized services/reviews and same-row integrity; later API commands own actors, locks, transitions, eligibility, and future-time validation.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Independent quote/request FKs | Allows an unrelated existing quote; #31 must prove equality. | **Reject as primary.** |
| Composite `(selected_quote_id, request_id)` FK | Requires a redundant unique target and exact Prisma/DDL alignment. Prisma 6 supports multi-field relations. | **Use.** Add `@@unique([id, requestId])`; fallback only if validation unexpectedly fails: independent restrictive FKs plus #31 transaction equality check. |
| API-only review immutability | Does not protect direct SQL writes. | **Reject.** Use the PostgreSQL rejecting trigger, with no update path or `updatedAt`. |
| Per-transition timestamp columns | Invents unowned semantics. | **Reject.** Use established `createdAt`/`updatedAt` pair only. |

The composite relation is definitive: `Service.selectedQuote` references `Quote.[id, requestId]`; the extra `Quote.service` field is Prisma relation metadata only. `ClientProfile` remains unchanged. No direct technician or average is stored.

## Data Flow

```text
#31 later transaction -> Service(request, selected quote, availability instant)
                         -> PostgreSQL constraints/checks
completed Service + client -> #38 later transaction -> Review
Review -> Service -> selected Quote -> TechnicianProfile
```

## Interfaces / Contracts

### Normative Prisma additions

```prisma
enum ServiceStatus {
  SCHEDULED
  IN_PROGRESS
  AWAITING_CONFIRMATION
  COMPLETED
  CANCELLED
}

// Add to User: cancelledServices Service[] @relation("ServiceCancellationActor")
//             reviews Review[]
// Add to Request: service Service?
// Add to Quote: service Service?
// Add to Quote: @@unique([id, requestId], map: "quotes_id_request_id_key")

model Service {
  id                 String        @id(map: "services_pkey") @default(uuid()) @db.Uuid
  requestId          String        @unique(map: "services_request_id_key") @db.Uuid @map("request_id")
  selectedQuoteId    String        @unique(map: "services_selected_quote_id_key") @db.Uuid @map("selected_quote_id")
  scheduledAt        DateTime      @map("scheduled_at") @db.Timestamptz(6)
  status             ServiceStatus @default(SCHEDULED)
  cancelledAt        DateTime?     @map("cancelled_at") @db.Timestamptz(6)
  cancelledByUserId  String?       @db.Uuid @map("cancelled_by_user_id")
  cancellationReason String?       @db.VarChar(500) @map("cancellation_reason")
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)
  request            Request       @relation(fields: [requestId], references: [id], onDelete: Restrict, map: "services_request_id_fkey")
  selectedQuote      Quote         @relation(fields: [selectedQuoteId, requestId], references: [id, requestId], onDelete: Restrict, map: "services_selected_quote_id_request_id_fkey")
  cancelledBy        User?         @relation("ServiceCancellationActor", fields: [cancelledByUserId], references: [id], onDelete: Restrict, map: "services_cancelled_by_user_id_fkey")
  review             Review?

  // Structurally implied by services_request_id_key; REQUIRED by Prisma's composite one-to-one validation (P1012).
  @@unique([selectedQuoteId, requestId], map: "services_selected_quote_id_request_id_key")
  @@index([status, createdAt(sort: Desc), id], map: "idx_services_status_created")
  @@map("services")
}

model Review {
  id        String   @id(map: "reviews_pkey") @default(uuid()) @db.Uuid
  serviceId String   @unique(map: "reviews_service_id_key") @db.Uuid @map("service_id")
  clientId  String   @db.Uuid @map("client_id")
  rating    Int      @db.Integer
  comment   String?  @db.VarChar(1000)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  service   Service  @relation(fields: [serviceId], references: [id], onDelete: Restrict, map: "reviews_service_id_fkey")
  client    User     @relation(fields: [clientId], references: [id], onDelete: Restrict, map: "reviews_client_id_fkey")

  @@map("reviews")
}
```

### Normative migration #5

```sql
CREATE TYPE "ServiceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED');

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_id_request_id_key" UNIQUE ("id", "request_id");

CREATE TABLE "services" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "selected_quote_id" UUID NOT NULL,
  "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "ServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
  "cancelled_at" TIMESTAMPTZ(6),
  "cancelled_by_user_id" UUID,
  "cancellation_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "services_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "services_request_id_key" UNIQUE ("request_id"),
  CONSTRAINT "services_selected_quote_id_key" UNIQUE ("selected_quote_id"),
  CONSTRAINT "services_cancellation_reason_check" CHECK ("cancellation_reason" IS NULL OR char_length(trim("cancellation_reason")) BETWEEN 10 AND 500),
  CONSTRAINT "services_state_consistency" CHECK (("cancelled_at" IS NULL AND "cancelled_by_user_id" IS NULL AND "cancellation_reason" IS NULL AND "status" <> 'CANCELLED') OR ("cancelled_at" IS NOT NULL AND "cancelled_by_user_id" IS NOT NULL AND "cancellation_reason" IS NOT NULL AND "status" = 'CANCELLED'))
);

CREATE UNIQUE INDEX "services_selected_quote_id_request_id_key" ON "services"("selected_quote_id", "request_id");

CREATE INDEX "idx_services_status_created" ON "services"("status" ASC, "created_at" DESC, "id" ASC);

ALTER TABLE "services"
  ADD CONSTRAINT "services_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "services_selected_quote_id_request_id_fkey" FOREIGN KEY ("selected_quote_id", "request_id") REFERENCES "quotes"("id", "request_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "services_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviews_service_id_key" UNIQUE ("service_id"),
  CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_review_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Reviews are immutable';
END;
$$;

CREATE TRIGGER "reviews_immutable"
BEFORE UPDATE OR DELETE ON "reviews"
FOR EACH ROW
EXECUTE FUNCTION prevent_review_modification();
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Enum, relations, composite Quote target, Service, Review. |
| `apps/api/prisma/migrations/20260901000003_services_reviews/migration.sql` | Create | Complete migration above; no inserts. |
| `apps/api/src/database/service-review-schema.spec.ts` | Create | `STATIC` schema contract. |
| `apps/api/src/database/service-review-migration.spec.ts` | Create | `STATIC` migration contract. |
| `apps/api/src/database/identity-schema.spec.ts` | Modify | Model-count assertion, 10→12. |
| `apps/api/src/database/request-image-schema.spec.ts` | Modify | Model-count assertion, 10→12. |
| `apps/api/src/database/quote-schema.spec.ts` | Modify | Model-count assertion, 10→12. |

## Testing Strategy

`service-review-schema.spec.ts` asserts five enum members, 12 models, every Service field/default/map/unique, the composite `@@unique([selectedQuoteId, requestId], map: "services_selected_quote_id_request_id_key")`, composite relation/index, Review integer/bounded nullable fields and createdAt-only shape, restrictive relations, and absence of technician/average fields. `service-review-migration.spec.ts` asserts `STATIC` labels, type, quote target, both tables, exact cancellation predicate, rating check, all five restrictive FKs, named uniques including `services_selected_quote_id_request_id_key`, directed index, trigger/function/event names, and no `INSERT`. Run API Vitest plus lint, typecheck, build, and format checks.

Verification commands (from the repository root) are:

```text
$env:DIRECT_URL = "<temporary PostgreSQL URL>"
npm exec --workspace=@repara/api -- prisma validate --schema=prisma/schema.prisma
npm exec --workspace=@repara/api -- prisma generate --schema=prisma/schema.prisma
npm exec --workspace=@repara/api -- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
npm run test --workspace=@repara/api
npm run lint --workspace=@repara/api
npm run typecheck --workspace=@repara/api
npm run build --workspace=@repara/api
npm run format:check
```

Review the from-empty diff while tolerating the known manual review trigger/function and composite quote target. Live gate remains **UNSATISFIED / RECORDED PENDING** for migrations #1–#5 apply/re-apply/status, seed, trigger, and concurrency (#1–#5 + seed + trigger/concurrency); static evidence is not live proof.

## Threat Matrix

| Boundary | Status | Safe/failure behavior and planned evidence |
|---|---|---|
| Secrets | Applicable | Static scan rejects secret-bearing literals; failure blocks apply. |
| Shell | N/A | No shell integration or subprocess boundary is changed. |
| SQL injection | N/A | Static hand-authored DDL has no runtime interpolation. |
| Documentation-like paths | N/A | No executable documentation paths are changed. |
| Git selection | N/A | Design performs no VCS automation. |
| Commit state | Applicable, apply-owned | Apply preserves staged, `commit -a`, and empty-index semantics; RED coverage belongs to that gate. |
| Push / PR commands | N/A | No push or PR automation. |

## Migration / Rollout

One additive migration and one commit; preserve #1–#4 and `migration_lock.toml`. Rollback is `git revert` of that commit. No feature flag, seed, or data backfill.

## Open Questions

None.
