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
