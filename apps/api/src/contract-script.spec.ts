import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

type ArtifactPair = {
  name: string;
  trackedPath: string;
  generatedPath: string;
};
type DiffOutcome = { breakingDifferencesFound: boolean };
let contractScript: {
  findStaleArtifacts: (pairs: ArtifactPair[]) => string[];
  compareOpenApiDocuments: (
    base: string,
    current: string,
    locations?: { base?: string; current?: string },
  ) => Promise<DiffOutcome>;
};

const openApiFixture = (paths: Record<string, object>, schemas = {}) =>
  JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Fixture', version: '1.0.0' },
    paths,
    components: { schemas },
  });

describe('contract orchestration helpers', () => {
  beforeAll(async () => {
    // @ts-expect-error The root orchestration script is an intentionally untyped ESM boundary.
    contractScript = await import('../../../scripts/contract.mjs');
  });

  it('detects stale tracked artifacts without replacing them', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'contract-stale-test-'));
    const tracked = path.join(directory, 'openapi.json');
    const generated = path.join(directory, 'generated-openapi.json');

    try {
      writeFileSync(tracked, '{"version":"tracked"}\n');
      writeFileSync(generated, '{"version":"generated"}\n');

      expect(
        contractScript.findStaleArtifacts([
          {
            name: 'apps/api/openapi.json',
            trackedPath: tracked,
            generatedPath: generated,
          },
        ]),
      ).toEqual(['apps/api/openapi.json']);
      expect(readFileSync(tracked, 'utf8')).toBe('{"version":"tracked"}\n');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('ignores CRLF differences while preserving real stale changes', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'contract-crlf-test-'));
    const tracked = path.join(directory, 'openapi.json');
    const generated = path.join(directory, 'generated-openapi.json');

    try {
      writeFileSync(tracked, '{\r\n  "version": "same"\r\n}\r\n');
      writeFileSync(generated, '{\n  "version": "same"\n}\n');

      expect(
        contractScript.findStaleArtifacts([
          {
            name: 'apps/api/openapi.json',
            trackedPath: tracked,
            generatedPath: generated,
          },
        ]),
      ).toEqual([]);

      writeFileSync(generated, '{\n  "version": "different"\n}\n');

      expect(
        contractScript.findStaleArtifacts([
          {
            name: 'apps/api/openapi.json',
            trackedPath: tracked,
            generatedPath: generated,
          },
        ]),
      ).toEqual(['apps/api/openapi.json']);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('classifies a removed path as breaking through the Node API', async () => {
    const base = openApiFixture({
      '/health': { get: { responses: { '200': { description: 'OK' } } } },
    });
    const current = openApiFixture({});
    const directory = mkdtempSync(path.join(tmpdir(), 'contract-diff-test-'));
    const basePath = path.join(directory, 'base.json');
    const currentPath = path.join(directory, 'current.json');

    try {
      writeFileSync(basePath, base);
      writeFileSync(currentPath, current);
      const outcome = await contractScript.compareOpenApiDocuments(
        readFileSync(basePath, 'utf8'),
        readFileSync(currentPath, 'utf8'),
        {
          base: pathToFileURL(basePath).href,
          current: pathToFileURL(currentPath).href,
        },
      );

      expect(outcome.breakingDifferencesFound).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('allows an additive optional property through the Node API', async () => {
    const base = openApiFixture(
      {
        '/health': { get: { responses: { '200': { description: 'OK' } } } },
      },
      {
        Health: { type: 'object', properties: { status: { type: 'string' } } },
      },
    );
    const current = openApiFixture(
      {
        '/health': { get: { responses: { '200': { description: 'OK' } } } },
      },
      {
        Health: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            detail: { type: 'string' },
          },
        },
      },
    );
    const directory = mkdtempSync(path.join(tmpdir(), 'contract-diff-test-'));
    const basePath = path.join(directory, 'base.json');
    const currentPath = path.join(directory, 'current.json');

    try {
      writeFileSync(basePath, base);
      writeFileSync(currentPath, current);
      const outcome = await contractScript.compareOpenApiDocuments(
        readFileSync(basePath, 'utf8'),
        readFileSync(currentPath, 'utf8'),
        {
          base: pathToFileURL(basePath).href,
          current: pathToFileURL(currentPath).href,
        },
      );

      expect(outcome.breakingDifferencesFound).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
