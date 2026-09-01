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

describe('STATIC: service and review schema contract', () => {
  it('STATIC: declares the exact service status enum and twelve models', () => {
    const statusEnum = schema.match(/enum ServiceStatus\s*\{([\s\S]*?)\n\}/);

    expect(
      statusEnum?.[1]
        .match(/^\s*[A-Z_]+\s*$/gm)
        ?.map((member) => member.trim()),
    ).toEqual([
      'SCHEDULED',
      'IN_PROGRESS',
      'AWAITING_CONFIRMATION',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(schema.match(/\bmodel\s+\w+\s*\{/g)).toHaveLength(12);

    for (const modelName of ['Service', 'Review']) {
      expect(schema).toContain(`model ${modelName} {`);
    }
    for (const physicalName of ['services', 'reviews']) {
      expect(schema).toContain(`@@map("${physicalName}")`);
    }
  });

  it('STATIC: declares the exact service fields, defaults, and mappings', () => {
    const service = model('Service');

    for (const field of [
      'id                 String        @id(map: "services_pkey") @default(uuid()) @db.Uuid',
      'requestId          String        @unique(map: "services_request_id_key") @db.Uuid @map("request_id")',
      'selectedQuoteId    String        @unique(map: "services_selected_quote_id_key") @db.Uuid @map("selected_quote_id")',
      'scheduledAt        DateTime      @map("scheduled_at") @db.Timestamptz(6)',
      'status             ServiceStatus @default(SCHEDULED)',
      'cancelledAt        DateTime?     @map("cancelled_at") @db.Timestamptz(6)',
      'cancelledByUserId  String?       @db.Uuid @map("cancelled_by_user_id")',
      'cancellationReason String?       @db.VarChar(500) @map("cancellation_reason")',
      'createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)',
      'updatedAt          DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)',
    ]) {
      expect(service).toContain(field);
    }
  });

  it('STATIC: declares the composite quote relation and directed service index', () => {
    const service = model('Service');
    const quote = model('Quote');

    expect(quote).toContain(
      '@@unique([id, requestId], map: "quotes_id_request_id_key")',
    );
    expect(service).toContain(
      'request            Request       @relation(fields: [requestId], references: [id], onDelete: Restrict, map: "services_request_id_fkey")',
    );
    expect(service).toContain(
      'selectedQuote      Quote         @relation(fields: [selectedQuoteId, requestId], references: [id, requestId], onDelete: Restrict, map: "services_selected_quote_id_request_id_fkey")',
    );
    expect(service).toContain(
      '@@unique([selectedQuoteId, requestId], map: "services_selected_quote_id_request_id_key")',
    );
    expect(service).toContain(
      '@@index([status, createdAt(sort: Desc), id], map: "idx_services_status_created")',
    );
  });

  it('STATIC: declares cancellation relations and reverse fields', () => {
    const service = model('Service');

    expect(service).toContain(
      'cancelledBy        User?         @relation("ServiceCancellationActor", fields: [cancelledByUserId], references: [id], onDelete: Restrict, map: "services_cancelled_by_user_id_fkey")',
    );
    expect(schema).toContain(
      'cancelledServices Service[]         @relation("ServiceCancellationActor")',
    );
    expect(schema).toContain('service            Service?');
    expect(schema).toContain('service      Service?');
    expect(schema).toContain('review             Review?');
  });

  it('STATIC: declares the bounded, immutable review shape', () => {
    const review = model('Review');

    for (const field of [
      'id        String   @id(map: "reviews_pkey") @default(uuid()) @db.Uuid',
      'serviceId String   @unique(map: "reviews_service_id_key") @db.Uuid @map("service_id")',
      'clientId  String   @db.Uuid @map("client_id")',
      'rating    Int      @db.Integer',
      'comment   String?  @db.VarChar(1000)',
      'createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)',
      'service   Service  @relation(fields: [serviceId], references: [id], onDelete: Restrict, map: "reviews_service_id_fkey")',
      'client    User     @relation(fields: [clientId], references: [id], onDelete: Restrict, map: "reviews_client_id_fkey")',
    ]) {
      expect(review).toContain(field);
    }

    expect(review).not.toMatch(/\bupdatedAt\b/);
    expect(review).not.toMatch(/\b(?:technician|average|score)\b/i);
    expect(schema).toContain('reviews           Review[]');
  });

  it('STATIC: excludes sensitive and stored URL literals', () => {
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

    expect(schema).not.toMatch(forbiddenLiteralPattern);
    expect(model('Service')).not.toMatch(forbiddenLiteralPattern);
    expect(model('Review')).not.toMatch(forbiddenLiteralPattern);
  });
});
