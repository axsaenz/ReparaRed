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
