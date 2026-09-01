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
