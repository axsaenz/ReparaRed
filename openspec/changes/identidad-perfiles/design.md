# Design: Identity and Profiles

## Technical Approach

Extend the empty PostgreSQL baseline with Prisma 6.19.3 models using camelCase logical fields and named snake_case physical objects. Migration #2 is hand-authored to preserve Prisma-generated declarative DDL and add PostgreSQL checks/triggers that Prisma cannot express. The lazy `PrismaService`, CJS generator, dependencies, and runtime API remain unchanged.

```prisma
enum UserRole {
  CLIENT
  TECHNICIAN
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

  @@map("categories")
}

model District {
  id            String          @id(map: "districts_pkey") @default(uuid()) @db.Uuid
  ubigeo        String          @unique(map: "districts_ubigeo_code_key") @map("ubigeo_code") @db.VarChar(6)
  name          String
  province      String
  department    String
  active        Boolean         @default(true)
  clientProfiles ClientProfile[]

  @@map("districts")
}
```

## Architecture Decisions

| Decision | Options and tradeoff | Choice and rationale |
|---|---|---|
| Email uniqueness | Unique constraint/index; unique partial index; non-unique index | Unique `users_email_key`: normalized writes plus DB uniqueness are the final race-safe boundary. Auth remains authoritative; API item #12 maps duplicates safely. Partial uniqueness is unnecessary because email is required; non-unique permits corruption. |
| Catalog skeletons | Defer FKs; move tables to #6; create empty prerequisites | Create minimal `categories` and `districts` now so every FK is real. No timestamps, rows, seeds, reads, or active behavior; #6 follows #5. |
| Migration production | `prisma migrate dev`; hand-authored SQL | Hand-author the complete file because no live DB exists, matching Prisma’s declarative shape plus explicit checks/triggers. `migrate diff` reviews declarative coherence; static tests cover additions. |
| Cross-row rules | Row checks; premature count/activity logic; later operations | Keep “at least one specialty” and active-catalog enforcement out of this migration; row checks cannot safely count or inspect other rows. |

## Data Flow

Verified later identity input → API normalization → `users` insert (role once) → optional complete profile insert → FK/check/role trigger enforcement → specialty join insert. No credentials or catalog rows enter this change.

## Interfaces / Contracts

Prisma model/DMMF shape is the only new application contract. Keep `prisma-client-js` CJS behavior and the existing process-scoped service seam; no endpoint or runtime interface is added.

## Migration SQL

```sql
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'TECHNICIAN');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "auth_subject" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "districts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ubigeo_code" VARCHAR(6) NOT NULL,
  "name" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_profiles" (
  "user_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "phone" VARCHAR(16) NOT NULL,
  "district_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "client_profiles_name_check" CHECK (char_length(trim("name")) BETWEEN 2 AND 100),
  CONSTRAINT "client_profiles_phone_check" CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$')
);

CREATE TABLE "technician_profiles" (
  "user_id" UUID NOT NULL,
  "professional_name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "phone" VARCHAR(16) NOT NULL,
  "years_experience" SMALLINT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "technician_profiles_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "technician_profiles_professional_name_check" CHECK (char_length(trim("professional_name")) BETWEEN 2 AND 100),
  CONSTRAINT "technician_profiles_description_check" CHECK (char_length(trim("description")) BETWEEN 20 AND 1000),
  CONSTRAINT "technician_profiles_phone_check" CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$'),
  CONSTRAINT "technician_profiles_years_experience_check" CHECK ("years_experience" BETWEEN 0 AND 80)
);

CREATE TABLE "technician_specialties" (
  "technician_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technician_specialties_pkey" PRIMARY KEY ("technician_id", "category_id")
);

CREATE UNIQUE INDEX "users_auth_subject_key" ON "users"("auth_subject");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX "districts_ubigeo_code_key" ON "districts"("ubigeo_code");
CREATE INDEX "idx_specialties_by_category" ON "technician_specialties"("category_id", "technician_id");

ALTER TABLE "client_profiles"
  ADD CONSTRAINT "client_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "client_profiles_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "technician_profiles"
  ADD CONSTRAINT "technician_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "technician_specialties"
  ADD CONSTRAINT "technician_specialties_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technician_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "technician_specialties_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."role" <> OLD."role" THEN
    RAISE EXCEPTION 'User role is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "users_role_immutable"
BEFORE UPDATE OF "role" ON "users"
FOR EACH ROW
EXECUTE FUNCTION prevent_user_role_change();

CREATE FUNCTION enforce_client_profile_role_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actual_role "UserRole";
BEGIN
  SELECT "role" INTO actual_role FROM "users" WHERE "id" = NEW."user_id";
  IF actual_role IS DISTINCT FROM 'CLIENT'::"UserRole" THEN
    RAISE EXCEPTION 'Client profile requires CLIENT user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "client_profiles_role_match"
BEFORE INSERT OR UPDATE ON "client_profiles"
FOR EACH ROW
EXECUTE FUNCTION enforce_client_profile_role_match();

CREATE FUNCTION enforce_technician_profile_role_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actual_role "UserRole";
BEGIN
  SELECT "role" INTO actual_role FROM "users" WHERE "id" = NEW."user_id";
  IF actual_role IS DISTINCT FROM 'TECHNICIAN'::"UserRole" THEN
    RAISE EXCEPTION 'Technician profile requires TECHNICIAN user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "technician_profiles_role_match"
BEFORE INSERT OR UPDATE ON "technician_profiles"
FOR EACH ROW
EXECUTE FUNCTION enforce_technician_profile_role_match();
```

The SQL is deliberately static: it has no `INSERT INTO` statements and adds no extension. It mirrors Prisma’s tables, UUID defaults, timestamps, keys, unique indexes, and relations; checks and triggers are the explicit additions.

## Testing Strategy

| Layer | Concrete offline contract |
|---|---|
| Static schema | `apps/api/src/database/identity-schema.spec.ts` reads `schema.prisma`; asserts six models, enum members, maps, optional profile rows, required bounded fields, relations, unique email/auth subject, and absence of password/secret columns. Optional DMMF assertions run if `Prisma.dmmf` is available. |
| Static migration | `identity-migration.spec.ts` reads `migration.sql`; asserts exact named checks/predicates, both role functions/triggers, `ON DELETE RESTRICT`, all named keys/indexes including `idx_specialties_by_category` and email, and no `INSERT INTO`. Every result is labeled `STATIC`. |
| Quality | Run Vitest, lint, format check, typecheck, and build without a database. |

## Verification Commands

With a throwaway invocation-only `DIRECT_URL` (never committed), run `npm exec --workspace=@repara/api -- prisma validate --schema prisma/schema.prisma`; `npm exec --workspace=@repara/api -- prisma generate --schema prisma/schema.prisma`; and `npm exec --workspace=@repara/api -- prisma migrate diff --schema prisma/schema.prisma --from-empty --to-schema-datamodel prisma/schema.prisma`. Review the diff against the declarative migration portion, then run `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm run build`. Live apply/re-apply/status remains **UNSATISFIED** and must not be claimed offline.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Identity, profile, specialty, and empty catalog models. |
| `apps/api/prisma/migrations/20260901000000_identity_profiles/migration.sql` | Create | Versioned migration #2 and explicit PostgreSQL integrity rules. |
| `apps/api/src/database/identity-schema.spec.ts` | Create | Static schema/DMMF contracts. |
| `apps/api/src/database/identity-migration.spec.ts` | Create | Static migration-text contracts. |
| Other files | None | Baseline, provider lock, scripts, seam, and dependencies remain unchanged. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and planned RED test |
|---|---|---|
| Secrets/personal data | Applicable — email is personal data, not a secret | No credential column; schema test fails if password/secret fields appear. Later API code must never log email; logging is out of scope here. |
| Documentation-like paths | N/A — no execution/classification change | No test or task. |
| Git repository selection | N/A — no Git automation | No test or task. |
| Shell commands | N/A — npm scripts are unchanged; verification uses only a temporary env value | No test or task. |
| Commit state | N/A — commit ownership belongs to apply | No test or task. |
| SQL injection | N/A for injection — migration SQL is static and receives no user input; manual SQL remains review-only risk | Static text review only; no injection test. |
| Push/PR commands | N/A — no push or PR automation | No test or task. |

## Migration / Rollout

Apply after baseline as one migration and one commit. Rollback is a commit revert; there is no local data or seed to preserve. Item #6 must follow migration #2 for catalog data and reads.

## Open Questions

None expected.
