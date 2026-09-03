import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = {
  vercel: 'vercel.json',
  railway: 'apps/api/railway.json',
  bootstrap: 'supabase/bootstrap.sql',
  quality: '.github/workflows/quality.yml',
  production: '.github/workflows/deploy-production.yml',
  preview: '.github/workflows/preview.yml',
  apiEnv: 'apps/api/.env.example',
  webEnv: 'apps/web/.env.example',
  environments: 'docs/environments.md',
  deployment: 'docs/deployment.md',
};

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await read(relativePath));
}

async function readWorkflow(relativePath) {
  return parseYaml(await read(relativePath));
}

function stepIndex(steps, label) {
  return steps.findIndex((step) => step.name?.toLowerCase().includes(label));
}

function withoutAllowedPlaceholders(text) {
  return text
    .replace(/\$\{\{[\s\S]*?\}\}/g, '')
    .replace(/YOUR_[A-Z0-9_]+/g, '')
    .replace(/<token>/gi, '');
}

function secretPatterns() {
  return [
    /-----BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY-----/i,
    /\b(?:sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}/i,
    /postgres(?:ql)?:\/\/[^\s/:@]+:[^\s@]+@/i,
    /(?:service_role|anon|secret|token|password)[ \t]*[:=][ \t]*["']?[A-Za-z0-9+/=_-]{20,}/i,
  ];
}

describe('provider configuration', () => {
  it('parses both committed provider JSON files', async () => {
    const vercel = await readJson(files.vercel);
    const railway = await readJson(files.railway);

    expect(vercel).toMatchObject({
      version: 2,
      framework: 'nextjs',
      installCommand: 'npm ci',
      buildCommand: 'npm run build:web',
      outputDirectory: 'apps/web/.next',
    });
    expect(railway).toMatchObject({
      build: {
        builder: 'NIXPACKS',
      },
      deploy: {
        startCommand: 'node dist/main.js',
        healthcheckPath: '/health/ready',
        healthcheckTimeout: 100,
        restartPolicyType: 'ON_FAILURE',
        restartPolicyMaxRetries: 10,
      },
    });
  });

  it('keeps Supabase bootstrap private and rerunnable', async () => {
    const bootstrap = await read(files.bootstrap);

    expect(bootstrap).toContain(
      '-- Provider bootstrap separate from Prisma domain migrations.',
    );
    expect(bootstrap).toMatch(
      /values \('request-images', 'request-images', false\)/,
    );
    expect(bootstrap).toMatch(/on conflict \(id\) do update/i);
    expect(bootstrap).toMatch(/do \$\$/i);
    expect(bootstrap.match(/if not exists/gi)).toHaveLength(4);
    expect(bootstrap.match(/to service_role/gi)).toHaveLength(4);
    expect(bootstrap).not.toMatch(/to (public|anon)/i);
    expect(bootstrap).not.toMatch(/public\s*=\s*true/i);
    for (const pattern of secretPatterns()) {
      expect(withoutAllowedPlaceholders(bootstrap)).not.toMatch(pattern);
    }
  });
});

describe('workflow contracts', () => {
  it('exposes quality as a reusable workflow without removing triggers', async () => {
    const quality = await readWorkflow(files.quality);

    expect(quality.on).toHaveProperty('workflow_call');
    expect(quality.on).toHaveProperty('push');
    expect(quality.on).toHaveProperty('pull_request');
    expect(quality.jobs.quality.steps.at(-1).name).toBe(
      'Deployment static validation',
    );
    expect(quality.jobs.quality.steps.at(-1).run).toBe(
      'npm run test:deployment',
    );
  });

  it('requires quality and serializes the production release', async () => {
    const production = await readWorkflow(files.production);
    const release = production.jobs.release;
    const steps = release.steps;

    expect(production.on).toHaveProperty('workflow_dispatch');
    expect(production.jobs['quality-reuse'].uses).toBe(
      './.github/workflows/quality.yml',
    );
    expect(release.needs).toBe('quality-reuse');
    expect(release.concurrency).toEqual({
      group: 'production-release',
      'cancel-in-progress': false,
    });
    expect(release.if).toContain("github.ref == 'refs/heads/main'");
    expect(release.if).toContain("github.event_name == 'workflow_dispatch'");
    expect(production.on.workflow_dispatch.inputs.seed.default).toBe(false);
    expect(production.on.workflow_dispatch.inputs.seed.type).toBe('boolean');

    const migration = stepIndex(steps, 'apply prisma migrations once');
    const seed = stepIndex(steps, 'seed catalog');
    const railway = stepIndex(steps, 'promote api on railway');
    const vercel = stepIndex(steps, 'deploy web on vercel');
    const smoke = stepIndex(steps, 'smoke checks');

    expect(migration).toBeGreaterThanOrEqual(0);
    expect(seed).toBeGreaterThan(migration);
    expect(railway).toBeGreaterThan(seed);
    expect(vercel).toBeGreaterThan(railway);
    expect(smoke).toBeGreaterThan(vercel);
    expect(steps[migration].env.DIRECT_URL).toContain('secrets.DIRECT_URL');
    expect(steps[seed].if).toBe('inputs.seed == true');
    expect(steps[railway].env.RAILWAY_TOKEN).toContain('secrets.RAILWAY_TOKEN');
    expect(steps[vercel].env.VERCEL_TOKEN).toContain('secrets.VERCEL_TOKEN');
    expect(steps[smoke].run).toContain('/health/live');
    expect(steps[smoke].run).toContain('/health/ready');
    expect(steps[smoke].run).toContain('response.status !== 200');
  });

  it('skips previews audibly and only proceeds for isolated resources', async () => {
    const preview = await readWorkflow(files.preview);
    const source = await read(files.preview);

    expect(preview.on).toHaveProperty('pull_request');
    expect(preview.jobs.preflight.outputs.proceed).toContain(
      'steps.credentials.outputs.proceed',
    );
    expect(source).toContain('PREVIEW SKIPPED');
    expect(source).toContain('GITHUB_STEP_SUMMARY');
    expect(source).toContain('proceed=false');
    expect(source).toContain('PREVIEW_RESOURCE_CLASS" != "isolated"');
    expect(preview.jobs['provider-preview-validation'].needs).toBe('preflight');
    expect(preview.jobs['provider-preview-validation'].if).toContain(
      "needs.preflight.outputs.proceed == 'true'",
    );
    expect(source).not.toMatch(/PRODUCTION_/i);
    expect(source).not.toMatch(/request-images/i);
    expect(source).not.toMatch(/production-release/i);
  });
});

describe('environment documentation and hygiene', () => {
  it('documents the current and future environment names honestly', async () => {
    const apiEnv = await read(files.apiEnv);
    const webEnv = await read(files.webEnv);
    const matrix = await read(files.environments);

    for (const name of [
      'NODE_ENV',
      'PORT',
      'HOST',
      'LOG_LEVEL',
      'DATABASE_URL',
      'DIRECT_URL',
    ]) {
      expect(apiEnv).toContain(`${name}=`);
      expect(matrix).toContain(`\`${name}\``);
    }
    for (const name of [
      'AUTH_ISSUER_URL',
      'AUTH_JWKS_URL',
      'STORAGE_SERVICE_KEY',
      'STORAGE_BUCKET_NAME',
    ]) {
      expect(apiEnv).toContain(`# ${name}=`);
      expect(matrix).toContain(`\`${name}\``);
    }
    expect(webEnv).toContain('# No variables are consumed');
    expect(webEnv).toContain('# API_ORIGIN=');
    expect(webEnv).toContain('# NEXT_PUBLIC_APP_ENV=');
    expect(matrix).toContain('Preview');
    expect(matrix).toContain('Production');
    expect(matrix).toContain('Server-only');
    expect(matrix).toContain('public');
  });

  it('contains every required runbook chapter and pending gate', async () => {
    const deployment = await read(files.deployment);

    for (const heading of [
      '## 1. Supabase provisioning',
      '## 2. Railway provisioning',
      '## 3. Vercel provisioning',
      '## 4. GitHub administration',
      '## 5. Production release procedure',
      '## 6. Migration and seed evidence',
      '## 7. Preview procedure',
      '## 8. Rollback',
      '## 9. Evidence record template',
      '## 10. Pending gates',
    ]) {
      expect(deployment).toContain(heading);
    }
    expect(deployment).toContain('Evidence-closure procedure');
    expect(deployment).toContain('Re-apply idempotency');
    expect(deployment).toContain('DIRECT_URL');
    expect(deployment).toContain('RAILWAY_TOKEN');
    expect(deployment).toContain('VERCEL_TOKEN');
    expect(deployment).toContain('1. **Supabase project** — PENDING.');
    expect(deployment).toContain(
      '6. **Deploy/preview live execution** — PENDING.',
    );
  });

  it('rejects credential-like literals from deployment-owned files', async () => {
    const targets = [
      files.vercel,
      files.railway,
      files.bootstrap,
      files.quality,
      files.production,
      files.preview,
      files.apiEnv,
      files.webEnv,
      files.environments,
      files.deployment,
    ];

    for (const relativePath of targets) {
      const content = withoutAllowedPlaceholders(await read(relativePath));
      for (const pattern of secretPatterns()) {
        expect(content, `${relativePath} matched ${pattern}`).not.toMatch(
          pattern,
        );
      }
    }
  });
});
