import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../prisma/migrations/20260901000002_quotes/migration.sql',
  ),
  'utf8',
);

describe('STATIC: quote migration contract', () => {
  it('STATIC: creates the exact enum, table, and required columns', () => {
    expect(migration).toContain(
      "CREATE TYPE \"QuoteStatus\" AS ENUM ('SUBMITTED', 'WITHDRAWN', 'SELECTED', 'CLOSED');",
    );
    expect(migration.match(/CREATE TABLE/g)).toHaveLength(1);
    expect(migration).toContain('CREATE TABLE "quotes"');

    for (const column of [
      '"id" UUID NOT NULL DEFAULT gen_random_uuid()',
      '"request_id" UUID NOT NULL',
      '"technician_id" UUID NOT NULL',
      '"amount" NUMERIC(8,2) NOT NULL',
      '"currency" VARCHAR(3) NOT NULL',
      '"description" VARCHAR(1000) NOT NULL',
      '"available_at" TIMESTAMPTZ(6) NOT NULL',
      '"status" "QuoteStatus" NOT NULL DEFAULT \'SUBMITTED\'',
      '"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      '"updated_at" TIMESTAMPTZ(6) NOT NULL',
    ]) {
      expect(migration).toContain(column);
    }
  });

  it('STATIC: contains the exact named checks and predicates', () => {
    for (const predicate of [
      'CONSTRAINT "quotes_amount_check" CHECK ("amount" >= 0.01 AND "amount" <= 999999.99)',
      'CONSTRAINT "quotes_currency_check" CHECK ("currency" = \'PEN\')',
      'CONSTRAINT "quotes_description_check" CHECK (char_length(trim("description")) BETWEEN 10 AND 1000)',
    ]) {
      expect(migration).toContain(predicate);
    }
  });

  it('STATIC: retains named unique and directed indexes', () => {
    expect(migration).toContain('CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "quotes_request_id_technician_id_key" ON "quotes"("request_id", "technician_id");',
    );
    expect(migration).toContain(
      'CREATE INDEX "idx_quotes_technician_created" ON "quotes"("technician_id" ASC, "created_at" DESC, "id" ASC);',
    );
    expect(migration).toContain(
      'CREATE INDEX "idx_quotes_request_created" ON "quotes"("request_id" ASC, "created_at" DESC, "id" ASC);',
    );
  });

  it('STATIC: declares exactly two restrictive cascading foreign keys', () => {
    for (const foreignKey of [
      '"quotes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id")',
      '"quotes_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technician_profiles"("user_id")',
    ]) {
      expect(migration).toContain(foreignKey);
    }

    expect(migration.match(/ADD CONSTRAINT "[^"]+" FOREIGN KEY/g)).toHaveLength(
      2,
    );
    expect(migration.match(/ON DELETE RESTRICT/g)).toHaveLength(2);
    expect(migration.match(/ON UPDATE CASCADE/g)).toHaveLength(2);
  });

  it('STATIC: excludes seed rows, functions, triggers, and sensitive literals', () => {
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).not.toMatch(/\bCREATE\s+FUNCTION\b/i);
    expect(migration).not.toMatch(/\bCREATE\s+TRIGGER\b/i);

    const forbiddenLiteralPattern = new RegExp(
      [
        String.raw`\bpostgres(?:ql)?\u003a\u002f\u002f`,
        String.raw`\bhttps?\u003a\u002f\u002f`,
        String.raw`\b(?:passwor\u0064|se\u0063ret|cre\u0064ential)\b`,
        String.raw`\bsigne\u0064(?:_\u0075\u0072\u006c|\u0020url)\b`,
        String.raw`(?:^["'])\u002f(?:users|uploads|private)\u002f`,
      ].join('|'),
      'i',
    );

    expect(migration).not.toMatch(forbiddenLiteralPattern);
  });
});
