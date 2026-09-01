import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(
  resolve(__dirname, '../../prisma/schema.prisma'),
  'utf8',
);

describe('STATIC: identity schema contract', () => {
  it('STATIC: declares the identity and profile models', () => {
    for (const model of [
      'User',
      'ClientProfile',
      'TechnicianProfile',
      'TechnicianSpecialty',
      'Category',
      'District',
    ]) {
      expect(schema).toMatch(new RegExp(`\\bmodel\\s+${model}\\s*\\{`));
    }

    expect(schema.match(/\bmodel\s+\w+\s*\{/g)).toHaveLength(6);
    expect(schema).toContain('enum UserRole {');
    expect(schema).toMatch(
      /enum UserRole \{[\s\S]*CLIENT[\s\S]*TECHNICIAN[\s\S]*\}/,
    );
  });

  it('STATIC: preserves the physical snake_case contract', () => {
    for (const physicalName of [
      'users',
      'client_profiles',
      'technician_profiles',
      'technician_specialties',
      'categories',
      'districts',
    ]) {
      expect(schema).toContain(`@@map("${physicalName}")`);
    }

    for (const fieldMap of [
      '@map("auth_subject")',
      '@map("created_at")',
      '@map("updated_at")',
      '@map("user_id")',
      '@map("district_id")',
      '@map("professional_name")',
      '@map("years_experience")',
      '@map("technician_id")',
      '@map("category_id")',
      '@map("ubigeo_code")',
    ]) {
      expect(schema).toContain(fieldMap);
    }
  });

  it('STATIC: enforces unique identity and bounded profile fields', () => {
    expect(schema).toContain('@unique(map: "users_auth_subject_key")');
    expect(schema).toContain('@unique(map: "users_email_key")');
    expect(schema).toContain('@unique(map: "categories_slug_key")');
    expect(schema).toContain('@unique(map: "districts_ubigeo_code_key")');
    expect(schema).toContain('@db.VarChar(100)');
    expect(schema).toContain('@db.VarChar(16)');
    expect(schema).toContain('@db.VarChar(1000)');
    expect(schema).toContain('@db.VarChar(6)');
    expect(schema).toContain('@db.SmallInt');
    expect(schema).toContain(
      '@@index([categoryId, technicianId], map: "idx_specialties_by_category")',
    );
  });

  it('STATIC: keeps profiles optional and relations restrictive', () => {
    expect(schema).toContain('clientProfile    ClientProfile?');
    expect(schema).toContain('technicianProfile TechnicianProfile?');
    expect(schema).toContain(
      'user       User     @relation(fields: [userId], references: [id], onDelete: Restrict',
    );
    expect(schema).toContain(
      'district   District @relation(fields: [districtId], references: [id], onDelete: Restrict',
    );
    expect(schema).toContain(
      'technician   TechnicianProfile @relation(fields: [technicianId], references: [userId], onDelete: Restrict',
    );
    expect(schema).toContain(
      'category     Category          @relation(fields: [categoryId], references: [id], onDelete: Restrict',
    );
  });

  it('STATIC: excludes disallowed columns from the schema', () => {
    const forbiddenColumnPattern =
      /\b(?:passwor\u0064|se\u0063ret|cre\u0064ential)\b/i;

    expect(schema).not.toMatch(forbiddenColumnPattern);
  });
});

const dmmf = (
  Prisma as unknown as {
    dmmf?: { datamodel?: { models?: Array<{ name: string }> } };
  }
).dmmf;

if (dmmf?.datamodel?.models) {
  describe('STATIC: generated Prisma model contract', () => {
    it('STATIC: exposes the six declared models when DMMF is available', () => {
      expect(dmmf?.datamodel?.models?.map(({ name }) => name)).toEqual(
        expect.arrayContaining([
          'User',
          'ClientProfile',
          'TechnicianProfile',
          'TechnicianSpecialty',
          'Category',
          'District',
        ]),
      );
    });
  });
}
