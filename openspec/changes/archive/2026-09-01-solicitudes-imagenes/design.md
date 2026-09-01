# Design: Request and Image Persistence

## Technical Approach

Add three normalized Prisma models and two enums, preserving the existing PostgreSQL snake_case/UUID conventions. Migration #3 is hand-authored for named checks, restrictive foreign keys, sort-directed indexes, and the reserved-expiry partial index. Database checks enforce same-row metadata/state integrity; later API transactions own authorization, legal transitions, Storage verification, and the aggregate image-capacity lock.

## Architecture Decisions

| Option | Tradeoff | Decision and rationale |
|---|---|---|
| Nullable vs required `preferredAt` | Nullable drafts are more permissive; required data makes every request complete. | **Required** `TIMESTAMPTZ(6)`. It is a core request field; the later publish command still validates that it is future-dated. No volatile database “future” check. |
| Enum/status trigger vs API lifecycle | Triggers add SQL and overlap with later locked commands. | Use `RequestStatus` and the recorded `RESERVED`/`CONFIRMED` enum, plus same-row checks only. `ASSIGNED`/`CANCELLED` transition legality remains API-owned. |
| `Int` vs `BigInt`; content length | BigInt is unnecessary for the 5 MiB bound; shorter content columns may reject valid declared headers. | Use `Int` for both byte counts; `declaredContentType VARCHAR(100)` and image `mimeType VARCHAR(50)`. |
| Index ordering | Descending publication order serves newest-first reads; UUID tie-breaking has no business order. | `(status ASC, category_id ASC, published_at DESC, id ASC)` and `(client_id ASC, published_at DESC, id ASC)`; names are frozen below. |
| Cascade vs restrict | Cascades can erase business records unexpectedly. | All six new foreign keys use `ON DELETE RESTRICT ON UPDATE CASCADE`; cleanup explicitly removes temporary children first. |

## Schema (normative)

The following is the complete resulting `schema.prisma`; existing physical fields are unchanged and only the shown reverse relation fields are added.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  CLIENT
  TECHNICIAN
}

enum RequestStatus {
  DRAFT
  PUBLISHED
  ASSIGNED
  CANCELLED
}

// Recorded implementation choice: sources require a status but do not enumerate it.
enum UploadReservationStatus {
  RESERVED
  CONFIRMED
}

model User {
  id               String            @id(map: "users_pkey") @default(uuid()) @db.Uuid
  authSubject      String            @unique(map: "users_auth_subject_key") @map("auth_subject")
  email            String            @unique(map: "users_email_key")
  role             UserRole
  createdAt        DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  clientProfile    ClientProfile?
  technicianProfile TechnicianProfile?
  cancelledRequests Request[]        @relation("RequestCancellationActor")

  @@map("users")
}

model ClientProfile {
  userId     String   @id(map: "client_profiles_pkey") @db.Uuid @map("user_id")
  name       String   @db.VarChar(100)
  phone      String   @db.VarChar(16)
  districtId String   @db.Uuid @map("district_id")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  user       User     @relation(fields: [userId], references: [id], onDelete: Restrict, map: "client_profiles_user_id_fkey")
  district   District @relation(fields: [districtId], references: [id], onDelete: Restrict, map: "client_profiles_district_id_fkey")
  requests   Request[]

  @@map("client_profiles")
}

model TechnicianProfile {
  userId          String               @id(map: "technician_profiles_pkey") @db.Uuid @map("user_id")
  professionalName String              @db.VarChar(100) @map("professional_name")
  description     String               @db.VarChar(1000)
  phone           String               @db.VarChar(16)
  yearsExperience Int                  @db.SmallInt @map("years_experience")
  createdAt       DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)
  user            User                 @relation(fields: [userId], references: [id], onDelete: Restrict, map: "technician_profiles_user_id_fkey")
  specialties     TechnicianSpecialty[]

  @@map("technician_profiles")
}

model TechnicianSpecialty {
  technicianId String            @db.Uuid @map("technician_id")
  categoryId   String            @db.Uuid @map("category_id")
  createdAt    DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  technician   TechnicianProfile @relation(fields: [technicianId], references: [userId], onDelete: Restrict, map: "technician_specialties_technician_id_fkey")
  category     Category          @relation(fields: [categoryId], references: [id], onDelete: Restrict, map: "technician_specialties_category_id_fkey")

  @@id([technicianId, categoryId], map: "technician_specialties_pkey")
  @@index([categoryId, technicianId], map: "idx_specialties_by_category")
  @@map("technician_specialties")
}

model Category {
  id          String               @id(map: "categories_pkey") @default(uuid()) @db.Uuid
  slug        String               @unique(map: "categories_slug_key")
  name        String
  active      Boolean              @default(true)
  specialties TechnicianSpecialty[]
  requests    Request[]

  @@map("categories")
}

model District {
  id            String          @id(map: "districts_pkey") @default(uuid()) @db.Uuid
  ubigeo        String          @unique(map: "districts_ubigeo_code_key") @map("ubigeo_code") @db.VarChar(6)
  name          String
  province      String
  department     String
  active         Boolean         @default(true)
  clientProfiles ClientProfile[]
  requests       Request[]

  @@map("districts")
}

model Request {
  id                 String                   @id(map: "requests_pkey") @default(uuid()) @db.Uuid
  clientId           String                   @db.Uuid @map("client_id")
  categoryId         String                   @db.Uuid @map("category_id")
  districtId         String                   @db.Uuid @map("district_id")
  title              String                   @db.VarChar(120)
  description        String                   @db.VarChar(2000)
  preferredAt        DateTime                 @map("preferred_at") @db.Timestamptz(6)
  status             RequestStatus            @default(DRAFT)
  publishedAt        DateTime?                @map("published_at") @db.Timestamptz(6)
  cancelledAt        DateTime?                @map("cancelled_at") @db.Timestamptz(6)
  cancelledByUserId   String?                  @db.Uuid @map("cancelled_by_user_id")
  cancellationReason String?                  @db.VarChar(500) @map("cancellation_reason")
  createdAt          DateTime                 @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime                 @updatedAt @map("updated_at") @db.Timestamptz(6)
  client             ClientProfile            @relation(fields: [clientId], references: [userId], onDelete: Restrict, map: "requests_client_id_fkey")
  category           Category                 @relation(fields: [categoryId], references: [id], onDelete: Restrict, map: "requests_category_id_fkey")
  district           District                 @relation(fields: [districtId], references: [id], onDelete: Restrict, map: "requests_district_id_fkey")
  cancelledBy        User?                    @relation("RequestCancellationActor", fields: [cancelledByUserId], references: [id], onDelete: Restrict, map: "requests_cancelled_by_user_id_fkey")
  uploadReservations UploadReservation[]
  images             RequestImage[]

  @@index([status(sort: Asc), categoryId(sort: Asc), publishedAt(sort: Desc), id(sort: Asc)], map: "idx_requests_status_category_published")
  @@index([clientId(sort: Asc), publishedAt(sort: Desc), id(sort: Asc)], map: "idx_requests_client_published")
  @@map("requests")
}

model UploadReservation {
  id                 String                  @id(map: "upload_reservations_pkey") @default(uuid()) @db.Uuid
  requestId          String                  @db.Uuid @map("request_id")
  objectKey          String                  @unique(map: "upload_reservations_object_key_key") @map("object_key")
  declaredByteSize   Int                     @db.Integer @map("declared_byte_size")
  declaredContentType String                 @db.VarChar(100) @map("declared_content_type")
  status             UploadReservationStatus @default(RESERVED)
  expiresAt          DateTime                @map("expires_at") @db.Timestamptz(6)
  confirmedAt        DateTime?               @map("confirmed_at") @db.Timestamptz(6)
  request            Request                 @relation(fields: [requestId], references: [id], onDelete: Restrict, map: "upload_reservations_request_id_fkey")

  @@index([requestId, status], map: "idx_upload_reservations_request_status")
  @@map("upload_reservations")
}

model RequestImage {
  id        String  @id(map: "request_images_pkey") @default(uuid()) @db.Uuid
  requestId String  @db.Uuid @map("request_id")
  objectKey String  @unique(map: "request_images_object_key_key") @map("object_key")
  mimeType  String  @db.VarChar(50) @map("mime_type")
  byteSize  Int     @db.Integer @map("byte_size")
  position  Int     @db.Integer
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  request   Request @relation(fields: [requestId], references: [id], onDelete: Restrict, map: "request_images_request_id_fkey")

  @@unique([requestId, position], map: "request_images_request_id_position_key")
  @@map("request_images")
}
```

## Migration #3 (normative SQL)

```sql
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ASSIGNED', 'CANCELLED');
CREATE TYPE "UploadReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED');

CREATE TABLE "requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "district_id" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "preferred_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "cancelled_by_user_id" UUID,
  "cancellation_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "requests_title_check" CHECK (char_length(trim("title")) BETWEEN 5 AND 120),
  CONSTRAINT "requests_description_check" CHECK (char_length(trim("description")) BETWEEN 20 AND 2000),
  CONSTRAINT "requests_cancellation_reason_check" CHECK ("cancellation_reason" IS NULL OR char_length(trim("cancellation_reason")) BETWEEN 10 AND 500),
  CONSTRAINT "requests_state_consistency" CHECK (("status" = 'DRAFT' AND "published_at" IS NULL) OR ("status" IN ('PUBLISHED', 'ASSIGNED', 'CANCELLED') AND "published_at" IS NOT NULL)),
  CONSTRAINT "requests_cancellation_consistency" CHECK (("cancelled_at" IS NULL AND "cancelled_by_user_id" IS NULL AND "cancellation_reason" IS NULL) OR ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND "cancelled_by_user_id" IS NOT NULL AND "cancellation_reason" IS NOT NULL))
);

CREATE TABLE "upload_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "object_key" TEXT NOT NULL,
  "declared_byte_size" INTEGER NOT NULL,
  "declared_content_type" VARCHAR(100) NOT NULL,
  "status" "UploadReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "confirmed_at" TIMESTAMPTZ(6),
  CONSTRAINT "upload_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "upload_reservations_state_consistency" CHECK (("status" = 'RESERVED' AND "confirmed_at" IS NULL) OR ("status" = 'CONFIRMED' AND "confirmed_at" IS NOT NULL)),
  CONSTRAINT "upload_reservations_declared_size_check" CHECK ("declared_byte_size" > 0)
);

CREATE TABLE "request_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "object_key" TEXT NOT NULL,
  "mime_type" VARCHAR(50) NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "request_images_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "request_images_mime_check" CHECK ("mime_type" IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT "request_images_byte_size_check" CHECK ("byte_size" > 0 AND "byte_size" <= 5242880),
  CONSTRAINT "request_images_position_check" CHECK ("position" >= 1)
);

CREATE UNIQUE INDEX "upload_reservations_object_key_key" ON "upload_reservations"("object_key");
CREATE UNIQUE INDEX "request_images_object_key_key" ON "request_images"("object_key");
CREATE UNIQUE INDEX "request_images_request_id_position_key" ON "request_images"("request_id", "position");
CREATE INDEX "idx_requests_status_category_published" ON "requests"("status" ASC, "category_id" ASC, "published_at" DESC, "id" ASC);
CREATE INDEX "idx_requests_client_published" ON "requests"("client_id" ASC, "published_at" DESC, "id" ASC);
CREATE INDEX "idx_upload_reservations_request_status" ON "upload_reservations"("request_id", "status");
CREATE INDEX "idx_reservations_reserved_expires" ON "upload_reservations"("expires_at") WHERE "status" = 'RESERVED';

ALTER TABLE "requests"
  ADD CONSTRAINT "requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "requests_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "requests_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "upload_reservations"
  ADD CONSTRAINT "upload_reservations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "request_images"
  ADD CONSTRAINT "request_images_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

The SQL has **six** new restrictive foreign keys: client, category, district, cancellation actor, reservation request, and image request (eleven across migration #2 and #3, including the five historical keys). The enumerated new relationships total six; a seventh FK would be unrequested redundancy. Reservations intentionally have no created/updated pair. No future-date check, trigger, cross-row count check, seed row, signed URL, or Storage operation is included.

## Data Flow

```text
Later API validation ──→ UploadReservation (declared metadata, expiry)
        │                         │ confirmed object
        └──────────────→ RequestImage (verified metadata)
Request draft ──publish transaction/lock──→ Request status and publication fields
```

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Static schema | Models/enums, mappings, required/optional fields, relations, defaults, named uniques/indexes, and absence of password-like columns | `apps/api/src/database/request-image-schema.spec.ts`, matching existing `STATIC` Vitest contracts; DMMF assertions optional. |
| Static migration | Exact checks, both enums, three tables, named PKs/uniques/indexes, directions, partial predicate, six `ON DELETE RESTRICT`/`ON UPDATE CASCADE` pairs, and no `INSERT` | `apps/api/src/database/request-image-migration.spec.ts`; all assertions labeled `STATIC`. |
| Quality/live gate | Prisma validity/generation, diff review, configured lint/typecheck/test/build; migration apply→re-apply→status plus seed | Live PostgreSQL gate remains **UNSATISFIED / RECORDED PENDING**; offline evidence must not claim executed-SQL proof. |

## Verification Commands

Run from `apps/api` with `DIRECT_URL` supplied only by a disposable environment variable (for example, `$env:DIRECT_URL = $env:TEMP_DIRECT_URL`; never commit its value):

```text
npm exec -- prisma validate
npm run prisma:generate
npm exec -- prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script
npm test
npm run typecheck
npm run lint
npm run build
```

Review the declarative portion of the diff against migration `20260901000001_requests_images/migration.sql`, retaining the intentional partial index as explicit SQL. From the repository root, also run `npm run format:check`. Do not run the pending live gate without disposable PostgreSQL.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add enums/models and reverse relations; preserve existing physical fields. |
| `apps/api/prisma/migrations/20260901000001_requests_images/migration.sql` | Create | Migration #3 normative DDL, named constraints/indexes, and no rows. |
| `apps/api/src/database/request-image-schema.spec.ts` | Create | `STATIC` schema contract. |
| `apps/api/src/database/request-image-migration.spec.ts` | Create | `STATIC` migration contract. |
| All other files | Unchanged | No manifests, lockfile, catalog, or migration-lock changes. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and planned RED test |
|---|---|---|
| Secrets/literals | Applicable | Migration/models contain no URLs, credentials, signed URLs, or user paths; static scan fails on forbidden literals in both contract suites. |
| Shell commands | N/A — npm scripts are unchanged; commands are verification-only. | No production shell boundary or RED test. |
| SQL injection | N/A — migration is static DDL with no runtime input. | Exact-text contracts protect the intended predicates; no injection surface is introduced. |
| Documentation-like paths | N/A — no executable documentation or classification change. | No task or RED test. |
| Git repository selection | N/A — no repository/cwd automation. | No task or RED test. |
| Commit state | N/A — commit ownership belongs to apply. | Apply owns one-commit state; no design-phase VCS command or RED test. |
| Push state | N/A — no push automation. | No task or RED test. |
| PR commands | N/A — no PR automation. | No task or RED test. |

## Migration / Rollout

Apply as one migration and one implementation commit; no feature flag or backfill is needed because migration #3 inserts zero rows. Rollback is a revert of that commit, removing the schema, migration, and two contracts. Any disposable database rollback must follow the repository migration tool rather than ad hoc destructive SQL.

## Open Questions

None. `preferredAt` is required, reservation declared size is `Int`, and declared content type is `VARCHAR(100)` by this design.
