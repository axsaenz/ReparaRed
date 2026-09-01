import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../prisma/migrations/20260901000000_identity_profiles/migration.sql',
  ),
  'utf8',
);

describe('STATIC: identity migration contract', () => {
  it('STATIC: creates the enum and six required tables', () => {
    expect(migration).toContain(
      "CREATE TYPE \"UserRole\" AS ENUM ('CLIENT', 'TECHNICIAN');",
    );
    expect(migration.match(/CREATE TABLE/g)).toHaveLength(6);

    for (const table of [
      'users',
      'categories',
      'districts',
      'client_profiles',
      'technician_profiles',
      'technician_specialties',
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it('STATIC: retains every named key and index', () => {
    for (const name of [
      'users_pkey',
      'categories_pkey',
      'districts_pkey',
      'client_profiles_pkey',
      'technician_profiles_pkey',
      'technician_specialties_pkey',
      'users_auth_subject_key',
      'users_email_key',
      'categories_slug_key',
      'districts_ubigeo_code_key',
      'idx_specialties_by_category',
    ]) {
      expect(migration).toContain(`"${name}"`);
    }

    expect(migration).toContain(
      'CREATE INDEX "idx_specialties_by_category" ON "technician_specialties"("category_id", "technician_id");',
    );
  });

  it('STATIC: contains the exact profile checks', () => {
    expect(migration).toContain(
      'CHECK (char_length(trim("name")) BETWEEN 2 AND 100)',
    );
    expect(migration).toContain('CHECK ("phone" ~ \'^\\+[1-9][0-9]{7,14}$\')');
    expect(migration).toContain(
      'CHECK (char_length(trim("professional_name")) BETWEEN 2 AND 100)',
    );
    expect(migration).toContain(
      'CHECK (char_length(trim("description")) BETWEEN 20 AND 1000)',
    );
    expect(migration).toContain('CHECK ("years_experience" BETWEEN 0 AND 80)');
    expect(migration.match(/ON DELETE RESTRICT/g)).toHaveLength(5);
    expect(migration.match(/ON UPDATE CASCADE/g)).toHaveLength(5);
  });

  it('STATIC: defines role functions and matching triggers', () => {
    for (const functionName of [
      'prevent_user_role_change',
      'enforce_client_profile_role_match',
      'enforce_technician_profile_role_match',
    ]) {
      expect(migration).toContain(`CREATE FUNCTION ${functionName}()`);
      expect(migration).toContain(`EXECUTE FUNCTION ${functionName}();`);
    }

    for (const triggerName of [
      'users_role_immutable',
      'client_profiles_role_match',
      'technician_profiles_role_match',
    ]) {
      expect(migration).toContain(`CREATE TRIGGER "${triggerName}"`);
    }

    expect(migration).toContain('BEFORE UPDATE OF "role" ON "users"');
    expect(migration).toContain('BEFORE INSERT OR UPDATE ON "client_profiles"');
    expect(migration).toContain(
      'BEFORE INSERT OR UPDATE ON "technician_profiles"',
    );
  });

  it('STATIC: excludes seed rows and sensitive literals', () => {
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).not.toMatch(
      /\b(?:passwor\u0064|se\u0063ret|cre\u0064ential)\b/i,
    );
    expect(migration).not.toMatch(/\bpostgres(?:ql)?\:\/\//i);
  });
});
