import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(
  resolve(__dirname, '../../prisma/schema.prisma'),
  'utf8',
);

const model = (name: string) => {
  const match = schema.match(
    new RegExp(`\\bmodel\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
  );

  expect(match).not.toBeNull();
  return match?.[1] ?? '';
};

describe('STATIC: quote schema contract', () => {
  it('STATIC: declares the twelfth model and exact quote status enum', () => {
    expect(schema.match(/\bmodel\s+\w+\s*\{/g)).toHaveLength(12);
    expect(schema).toContain('model Quote {');

    const statusEnum = schema.match(/enum QuoteStatus\s*\{([\s\S]*?)\n\}/);
    expect(
      statusEnum?.[1].match(/^\s*[A-Z]+\s*$/gm)?.map((member) => member.trim()),
    ).toEqual(['SUBMITTED', 'WITHDRAWN', 'SELECTED', 'CLOSED']);
  });

  it('STATIC: preserves the mapped quote fields and exact types', () => {
    const quote = model('Quote');

    for (const field of [
      'id           String            @id(map: "quotes_pkey") @default(uuid()) @db.Uuid',
      'requestId    String            @db.Uuid @map("request_id")',
      'technicianId String            @db.Uuid @map("technician_id")',
      'amount       Decimal           @db.Decimal(8, 2)',
      'currency     String            @db.VarChar(3)',
      'description  String            @db.VarChar(1000)',
      'availableAt  DateTime          @map("available_at") @db.Timestamptz(6)',
      'status       QuoteStatus       @default(SUBMITTED)',
      'createdAt    DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)',
      'updatedAt    DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)',
    ]) {
      expect(quote).toContain(field);
    }

    expect(schema).toContain('@@map("quotes")');
  });

  it('STATIC: declares restrictive relations and reverse quote fields', () => {
    const quote = model('Quote');

    expect(quote).toContain(
      'request      Request           @relation(fields: [requestId], references: [id], onDelete: Restrict, map: "quotes_request_id_fkey")',
    );
    expect(quote).toContain(
      'technician   TechnicianProfile @relation(fields: [technicianId], references: [userId], onDelete: Restrict, map: "quotes_technician_id_fkey")',
    );
    expect(model('Request')).toMatch(/\bquotes\s+Quote\[\]/);
    expect(model('TechnicianProfile')).toMatch(/\bquotes\s+Quote\[\]/);
  });

  it('STATIC: retains the named pair unique and directed indexes', () => {
    const quote = model('Quote');

    expect(quote).toContain(
      '@@unique([requestId, technicianId], map: "quotes_request_id_technician_id_key")',
    );
    expect(quote).toContain(
      '@@index([technicianId, createdAt(sort: Desc), id], map: "idx_quotes_technician_created")',
    );
    expect(quote).toContain(
      '@@index([requestId, createdAt(sort: Desc), id], map: "idx_quotes_request_created")',
    );
  });

  it('STATIC: excludes sensitive and stored URL literals', () => {
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

    expect(schema).not.toMatch(forbiddenLiteralPattern);
    expect(model('Quote')).not.toMatch(forbiddenLiteralPattern);
  });
});
