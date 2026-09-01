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

describe('STATIC: request and image schema contract', () => {
  it('STATIC: declares the request persistence enums and models', () => {
    expect(schema).toContain('enum RequestStatus {');
    expect(schema).toMatch(
      /enum RequestStatus \{[\s\S]*DRAFT[\s\S]*PUBLISHED[\s\S]*ASSIGNED[\s\S]*CANCELLED[\s\S]*\}/,
    );
    expect(schema).toContain('enum UploadReservationStatus {');
    expect(schema).toMatch(
      /enum UploadReservationStatus \{[\s\S]*RESERVED[\s\S]*CONFIRMED[\s\S]*\}/,
    );

    for (const name of ['Request', 'UploadReservation', 'RequestImage']) {
      expect(schema).toMatch(new RegExp(`\\bmodel\\s+${name}\\s*\\{`));
    }

    expect(schema.match(/\bmodel\s+\w+\s*\{/g)).toHaveLength(12);
    expect(schema).toContain(
      '// Recorded implementation choice: sources require a status but do not enumerate it.',
    );
  });

  it('STATIC: preserves the mapped physical names and metadata bounds', () => {
    for (const physicalName of [
      'requests',
      'upload_reservations',
      'request_images',
    ]) {
      expect(schema).toContain(`@@map("${physicalName}")`);
    }

    for (const fieldMap of [
      '@map("client_id")',
      '@map("category_id")',
      '@map("district_id")',
      '@map("preferred_at")',
      '@map("published_at")',
      '@map("cancelled_at")',
      '@map("cancelled_by_user_id")',
      '@map("cancellation_reason")',
      '@map("created_at")',
      '@map("updated_at")',
      '@map("request_id")',
      '@map("object_key")',
      '@map("declared_byte_size")',
      '@map("declared_content_type")',
      '@map("expires_at")',
      '@map("confirmed_at")',
      '@map("mime_type")',
      '@map("byte_size")',
    ]) {
      expect(schema).toContain(fieldMap);
    }

    expect(model('Request')).toMatch(/\btitle\s+String\s+@db\.VarChar\(120\)/);
    expect(model('Request')).toMatch(
      /\bdescription\s+String\s+@db\.VarChar\(2000\)/,
    );
    expect(model('Request')).toMatch(
      /\bcancellationReason\s+String\?\s+@db\.VarChar\(500\)/,
    );
    expect(model('UploadReservation')).toMatch(
      /\bdeclaredContentType\s+String\s+@db\.VarChar\(100\)/,
    );
    expect(model('RequestImage')).toMatch(
      /\bmimeType\s+String\s+@db\.VarChar\(50\)/,
    );
  });

  it('STATIC: keeps required and optional temporal and cancellation fields', () => {
    expect(model('Request')).toMatch(
      /\bpreferredAt\s+DateTime\s+@map\("preferred_at"\)\s+@db\.Timestamptz\(6\)/,
    );
    expect(model('Request')).toMatch(
      /\bstatus\s+RequestStatus\s+@default\(DRAFT\)/,
    );
    expect(model('Request')).toMatch(
      /\bpublishedAt\s+DateTime\?\s+@map\("published_at"\)\s+@db\.Timestamptz\(6\)/,
    );
    expect(model('Request')).toMatch(
      /\bcancelledAt\s+DateTime\?\s+@map\("cancelled_at"\)\s+@db\.Timestamptz\(6\)/,
    );
    expect(model('Request')).toMatch(
      /\bcancelledByUserId\s+String\?\s+@db\.Uuid\s+@map\("cancelled_by_user_id"\)/,
    );
    expect(model('Request')).toMatch(
      /\bcancellationReason\s+String\?\s+@db\.VarChar\(500\)\s+@map\("cancellation_reason"\)/,
    );

    expect(model('UploadReservation')).toMatch(
      /\bstatus\s+UploadReservationStatus\s+@default\(RESERVED\)/,
    );
    expect(model('UploadReservation')).toMatch(
      /\bexpiresAt\s+DateTime\s+@map\("expires_at"\)\s+@db\.Timestamptz\(6\)/,
    );
    expect(model('UploadReservation')).toMatch(
      /\bconfirmedAt\s+DateTime\?\s+@map\("confirmed_at"\)\s+@db\.Timestamptz\(6\)/,
    );
    expect(model('UploadReservation')).not.toMatch(
      /\b(?:createdAt|updatedAt)\b/,
    );
  });

  it('STATIC: declares restrictive relations and reverse relation fields', () => {
    for (const relation of [
      'client             ClientProfile            @relation(fields: [clientId], references: [userId], onDelete: Restrict, map: "requests_client_id_fkey")',
      'category           Category                 @relation(fields: [categoryId], references: [id], onDelete: Restrict, map: "requests_category_id_fkey")',
      'district           District                 @relation(fields: [districtId], references: [id], onDelete: Restrict, map: "requests_district_id_fkey")',
      'cancelledBy        User?                    @relation("RequestCancellationActor", fields: [cancelledByUserId], references: [id], onDelete: Restrict, map: "requests_cancelled_by_user_id_fkey")',
      'request             Request                 @relation(fields: [requestId], references: [id], onDelete: Restrict, map: "upload_reservations_request_id_fkey")',
      'request   Request @relation(fields: [requestId], references: [id], onDelete: Restrict, map: "request_images_request_id_fkey")',
    ]) {
      expect(schema).toContain(relation);
    }

    for (const reverseRelation of [
      'cancelledRequests Request[]        @relation("RequestCancellationActor")',
      'requests   Request[]',
      'requests    Request[]',
      'requests       Request[]',
    ]) {
      expect(schema).toContain(reverseRelation);
    }
  });

  it('STATIC: declares the locked unique and directed indexes', () => {
    for (const unique of [
      '@unique(map: "upload_reservations_object_key_key")',
      '@unique(map: "request_images_object_key_key")',
      '@@unique([requestId, position], map: "request_images_request_id_position_key")',
    ]) {
      expect(schema).toContain(unique);
    }

    expect(schema).toContain(
      '@@index([status(sort: Asc), categoryId(sort: Asc), publishedAt(sort: Desc), id(sort: Asc)], map: "idx_requests_status_category_published")',
    );
    expect(schema).toContain(
      '@@index([clientId(sort: Asc), publishedAt(sort: Desc), id(sort: Asc)], map: "idx_requests_client_published")',
    );
    expect(schema).toContain(
      '@@index([requestId, status], map: "idx_upload_reservations_request_status")',
    );
  });

  it('STATIC: excludes sensitive columns and stored URL or path literals', () => {
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
    expect(model('Request')).not.toMatch(
      /\b(?:passwor\u0064|se\u0063ret|cre\u0064ential)\b/i,
    );
    expect(model('UploadReservation')).not.toMatch(
      /\b(?:passwor\u0064|se\u0063ret|cre\u0064ential)\b/i,
    );
    expect(model('RequestImage')).not.toMatch(
      /\b(?:passwor\u0064|se\u0063ret|cre\u0064ential)\b/i,
    );
  });
});
