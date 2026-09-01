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
