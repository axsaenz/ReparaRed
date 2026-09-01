import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../prisma/migrations/20260901000001_requests_images/migration.sql',
  ),
  'utf8',
);

describe('STATIC: request and image migration contract', () => {
  it('STATIC: creates the exact enums and three persistence tables', () => {
    expect(migration).toContain(
      "CREATE TYPE \"RequestStatus\" AS ENUM ('DRAFT', 'PUBLISHED', 'ASSIGNED', 'CANCELLED');",
    );
    expect(migration).toContain(
      "CREATE TYPE \"UploadReservationStatus\" AS ENUM ('RESERVED', 'CONFIRMED');",
    );
    expect(migration.match(/CREATE TABLE/g)).toHaveLength(3);

    for (const table of ['requests', 'upload_reservations', 'request_images']) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it('STATIC: contains every named check and exact predicate', () => {
    for (const predicate of [
      'CONSTRAINT "requests_title_check" CHECK (char_length(trim("title")) BETWEEN 5 AND 120)',
      'CONSTRAINT "requests_description_check" CHECK (char_length(trim("description")) BETWEEN 20 AND 2000)',
      'CONSTRAINT "requests_cancellation_reason_check" CHECK ("cancellation_reason" IS NULL OR char_length(trim("cancellation_reason")) BETWEEN 10 AND 500)',
      'CONSTRAINT "requests_state_consistency" CHECK (("status" = \'DRAFT\' AND "published_at" IS NULL) OR ("status" IN (\'PUBLISHED\', \'ASSIGNED\', \'CANCELLED\') AND "published_at" IS NOT NULL))',
      'CONSTRAINT "requests_cancellation_consistency" CHECK (("cancelled_at" IS NULL AND "cancelled_by_user_id" IS NULL AND "cancellation_reason" IS NULL) OR ("status" = \'CANCELLED\' AND "cancelled_at" IS NOT NULL AND "cancelled_by_user_id" IS NOT NULL AND "cancellation_reason" IS NOT NULL))',
      'CONSTRAINT "upload_reservations_state_consistency" CHECK (("status" = \'RESERVED\' AND "confirmed_at" IS NULL) OR ("status" = \'CONFIRMED\' AND "confirmed_at" IS NOT NULL))',
      'CONSTRAINT "upload_reservations_declared_size_check" CHECK ("declared_byte_size" > 0)',
      "CONSTRAINT \"request_images_mime_check\" CHECK (\"mime_type\" IN ('image/jpeg', 'image/png', 'image/webp'))",
      'CONSTRAINT "request_images_byte_size_check" CHECK ("byte_size" > 0 AND "byte_size" <= 5242880)',
      'CONSTRAINT "request_images_position_check" CHECK ("position" >= 1)',
    ]) {
      expect(migration).toContain(predicate);
    }
  });

  it('STATIC: retains named primary keys, unique indexes, and directions', () => {
    for (const name of [
      'requests_pkey',
      'upload_reservations_pkey',
      'request_images_pkey',
      'upload_reservations_object_key_key',
      'request_images_object_key_key',
      'request_images_request_id_position_key',
      'idx_requests_status_category_published',
      'idx_requests_client_published',
      'idx_upload_reservations_request_status',
      'idx_reservations_reserved_expires',
    ]) {
      expect(migration).toContain(`"${name}"`);
    }

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "upload_reservations_object_key_key" ON "upload_reservations"("object_key");',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "request_images_object_key_key" ON "request_images"("object_key");',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "request_images_request_id_position_key" ON "request_images"("request_id", "position");',
    );
    expect(migration).toContain(
      'CREATE INDEX "idx_requests_status_category_published" ON "requests"("status" ASC, "category_id" ASC, "published_at" DESC, "id" ASC);',
    );
    expect(migration).toContain(
      'CREATE INDEX "idx_requests_client_published" ON "requests"("client_id" ASC, "published_at" DESC, "id" ASC);',
    );
    expect(migration).toContain(
      'CREATE INDEX "idx_upload_reservations_request_status" ON "upload_reservations"("request_id", "status");',
    );
    expect(migration).toContain(
      'CREATE INDEX "idx_reservations_reserved_expires" ON "upload_reservations"("expires_at") WHERE "status" = \'RESERVED\';',
    );
  });

  it('STATIC: declares six restrictive cascading foreign keys', () => {
    for (const foreignKey of [
      '"requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("user_id")',
      '"requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id")',
      '"requests_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id")',
      '"requests_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id")',
      '"upload_reservations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id")',
      '"request_images_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id")',
    ]) {
      expect(migration).toContain(foreignKey);
    }

    expect(migration.match(/ADD CONSTRAINT "[^"]+" FOREIGN KEY/g)).toHaveLength(
      6,
    );
    expect(migration.match(/ON DELETE RESTRICT/g)).toHaveLength(6);
    expect(migration.match(/ON UPDATE CASCADE/g)).toHaveLength(6);
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
