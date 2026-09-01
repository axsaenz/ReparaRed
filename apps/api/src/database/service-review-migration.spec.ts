import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../prisma/migrations/20260901000003_services_reviews/migration.sql',
  ),
  'utf8',
);

describe('STATIC: service and review migration contract', () => {
  it('STATIC: creates the exact enum and two persistence tables', () => {
    expect(migration).toContain(
      "CREATE TYPE \"ServiceStatus\" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED');",
    );
    expect(migration.match(/CREATE TABLE/g)).toHaveLength(2);
    expect(migration).toContain('CREATE TABLE "services"');
    expect(migration).toContain('CREATE TABLE "reviews"');
  });

  it('STATIC: declares the exact service columns and named constraints', () => {
    for (const column of [
      '"id" UUID NOT NULL DEFAULT gen_random_uuid()',
      '"request_id" UUID NOT NULL',
      '"selected_quote_id" UUID NOT NULL',
      '"scheduled_at" TIMESTAMPTZ(6) NOT NULL',
      '"status" "ServiceStatus" NOT NULL DEFAULT \'SCHEDULED\'',
      '"cancelled_at" TIMESTAMPTZ(6)',
      '"cancelled_by_user_id" UUID',
      '"cancellation_reason" VARCHAR(500)',
      '"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      '"updated_at" TIMESTAMPTZ(6) NOT NULL',
    ]) {
      expect(migration).toContain(column);
    }

    for (const name of [
      'services_pkey',
      'services_request_id_key',
      'services_selected_quote_id_key',
      'services_selected_quote_id_request_id_key',
      'idx_services_status_created',
    ]) {
      expect(migration).toContain(`"${name}"`);
    }
    expect(migration).toContain(
      'ALTER TABLE "quotes" ADD CONSTRAINT "quotes_id_request_id_key" UNIQUE ("id", "request_id");',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "services_selected_quote_id_request_id_key" ON "services"("selected_quote_id", "request_id");',
    );
    expect(migration).toContain(
      'CREATE INDEX "idx_services_status_created" ON "services"("status" ASC, "created_at" DESC, "id" ASC);',
    );
  });

  it('STATIC: enforces exact cancellation and rating predicates', () => {
    expect(migration).toContain(
      'CONSTRAINT "services_cancellation_reason_check" CHECK ("cancellation_reason" IS NULL OR char_length(trim("cancellation_reason")) BETWEEN 10 AND 500)',
    );
    expect(migration).toContain(
      'CONSTRAINT "services_state_consistency" CHECK (("cancelled_at" IS NULL AND "cancelled_by_user_id" IS NULL AND "cancellation_reason" IS NULL AND "status" <> \'CANCELLED\') OR ("cancelled_at" IS NOT NULL AND "cancelled_by_user_id" IS NOT NULL AND "cancellation_reason" IS NOT NULL AND "status" = \'CANCELLED\'))',
    );
    expect(migration).toContain(
      'CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5)',
    );
  });

  it('STATIC: declares five restrictive cascading foreign keys', () => {
    for (const foreignKey of [
      '"services_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id")',
      '"services_selected_quote_id_request_id_fkey" FOREIGN KEY ("selected_quote_id", "request_id") REFERENCES "quotes"("id", "request_id")',
      '"services_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id")',
      '"reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id")',
      '"reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id")',
    ]) {
      expect(migration).toContain(foreignKey);
    }

    expect(migration.match(/ADD CONSTRAINT "[^"]+" FOREIGN KEY/g)).toHaveLength(
      5,
    );
    expect(migration.match(/ON DELETE RESTRICT/g)).toHaveLength(5);
    expect(migration.match(/ON UPDATE CASCADE/g)).toHaveLength(5);
  });

  it('STATIC: keeps reviews createdAt-only and immutable', () => {
    const reviewTable = migration.match(
      /CREATE TABLE "reviews" \(([\s\S]*?)\n\);/,
    )?.[1];

    expect(reviewTable).toBeDefined();
    expect(reviewTable).toContain(
      '"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP',
    );
    expect(reviewTable).not.toContain('"updated_at"');
    expect(migration).toContain(
      'CREATE FUNCTION prevent_review_modification()',
    );
    expect(migration).toContain('CREATE TRIGGER "reviews_immutable"');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "reviews"');
    expect(migration).toContain(
      'EXECUTE FUNCTION prevent_review_modification();',
    );
  });

  it('STATIC: excludes seed rows, sensitive literals, and user paths', () => {
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);

    const forbiddenLiteralPattern = new RegExp(
      [
        String.raw`\bpostgres(?:ql)?\u003a\u002f\u002f`,
        String.raw`\bhttps?\u003a\u002f\u002f`,
        String.raw`\b(?:passwor\u0064|se\u0063ret|cre\u0064ential)\b`,
        String.raw`\bsigne\u0064(?:_\u0075\u0072\u006c|\u0020url)\b`,
        String.raw`(?:^|["'])\u002f(?:users|uploads|private)\u002f`,
      ].join('|'),
      'i',
    );

    expect(migration).not.toMatch(forbiddenLiteralPattern);
  });
});
