import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import OpenApiDiff from 'openapi-diff';
import SwaggerParser from '@apidevtools/swagger-parser';

const root = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.join(root, '..');
const apiDocument = path.join(workspace, 'apps', 'api', 'openapi.json');
const generatedClient = path.join(
  workspace,
  'packages',
  'api-client',
  'src',
  'generated.ts',
);

function runNpm(args, environment = {}) {
  const npmArgs = process.env.npm_execpath
    ? [process.env.npm_execpath, ...args]
    : ['npm', ...args];
  const result = spawnSync(
    process.env.npm_execpath ? process.execPath : 'npm',
    npmArgs,
    {
      cwd: workspace,
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, ...environment },
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `npm ${args.join(' ')} exited with status ${result.status}`,
    );
  }
}

function runNode(args, environment = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: workspace,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...environment },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${args.join(' ')} exited with status ${result.status}`);
  }
}

function readDocument(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

async function exportContract() {
  runNpm(['run', 'build:api']);
  runNode(['apps/api/scripts/export-openapi.mjs']);
}

function generateClient() {
  runNode([
    'node_modules/openapi-typescript/bin/cli.js',
    process.env.OPENAPI_INPUT_PATH ?? 'apps/api/openapi.json',
    '-o',
    process.env.GENERATED_CLIENT_OUTPUT_PATH ??
      'packages/api-client/src/generated.ts',
  ]);
}

async function validateContract() {
  await SwaggerParser.validate(readDocument(apiDocument));
  console.log('OpenAPI document is valid.');
}

export function findStaleArtifacts(artifactPairs) {
  // Git autocrlf checkouts differ across platforms; generated output is LF, so freshness ignores line endings.
  const normalizeLineEndings = (content) => content.replace(/\r\n?/g, '\n');

  return artifactPairs
    .filter(
      ({ trackedPath, generatedPath }) =>
        !existsSync(trackedPath) ||
        !existsSync(generatedPath) ||
        normalizeLineEndings(readFileSync(trackedPath, 'utf8')) !==
          normalizeLineEndings(readFileSync(generatedPath, 'utf8')),
    )
    .map(({ name }) => name);
}

function assertFreshArtifacts(artifactPairs) {
  const staleArtifacts = findStaleArtifacts(artifactPairs);
  if (staleArtifacts.length > 0) {
    throw new Error(
      `Stale contract artifacts:\n${staleArtifacts
        .map((artifact) => `- ${artifact}`)
        .join('\n')}`,
    );
  }
}

function checkFreshness() {
  const temporaryDirectory = mkdtempSync(
    path.join(tmpdir(), 'reparared-contract-'),
  );
  const temporaryDocument = path.join(temporaryDirectory, 'openapi.json');
  const temporaryClient = path.join(temporaryDirectory, 'generated.ts');

  try {
    const environment = {
      OPENAPI_OUTPUT_PATH: temporaryDocument,
      OPENAPI_INPUT_PATH: temporaryDocument,
      GENERATED_CLIENT_OUTPUT_PATH: temporaryClient,
    };
    runNpm(['run', 'contract:export'], environment);
    runNpm(['run', 'contract:generate'], environment);
    assertFreshArtifacts([
      {
        name: 'apps/api/openapi.json',
        trackedPath: apiDocument,
        generatedPath: temporaryDocument,
      },
      {
        name: 'packages/api-client/src/generated.ts',
        trackedPath: generatedClient,
        generatedPath: temporaryClient,
      },
    ]);
    runNpm(['run', 'contract:validate']);
    runNpm(['run', 'typecheck']);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function checkStale() {
  const result = spawnSync(
    'git',
    [
      'diff',
      '--exit-code',
      '--',
      'apps/api/openapi.json',
      'packages/api-client/src/generated.ts',
    ],
    { cwd: workspace, stdio: 'inherit', shell: false },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('Tracked contract artifacts are stale.');
  }
}

function readGitDocument(reference) {
  const result = spawnSync(
    'git',
    ['show', `${reference}:apps/api/openapi.json`],
    {
      cwd: workspace,
      encoding: 'utf8',
      shell: false,
    },
  );

  return result.status === 0 && result.stdout ? result.stdout : undefined;
}

function readBaseDocument() {
  const baseRef = process.env.GITHUB_BASE_REF;
  const references = baseRef ? [`origin/${baseRef}`, 'HEAD^'] : ['HEAD^'];

  for (const reference of references) {
    const document = readGitDocument(reference);
    if (document) return document;
  }

  return undefined;
}

export async function compareOpenApiDocuments(
  baseContent,
  currentContent,
  locations = {},
) {
  return OpenApiDiff.diffSpecs({
    sourceSpec: {
      content: baseContent,
      location: locations.base ?? 'base-openapi.json',
      format: 'openapi3',
    },
    destinationSpec: {
      content: currentContent,
      location: locations.current ?? 'openapi.json',
      format: 'openapi3',
    },
  });
}

async function diffContract() {
  const base = readBaseDocument();
  if (!base) {
    console.log(
      'OpenAPI compatibility: FIRST-BASELINE skip (no base document exists).',
    );
    return;
  }

  const outcome = await compareOpenApiDocuments(
    base,
    readFileSync(apiDocument, 'utf8'),
    {
      base: 'base-openapi.json',
      current: 'apps/api/openapi.json',
    },
  );
  if (outcome.breakingDifferencesFound) {
    const details = outcome.breakingDifferences
      .map(({ code, entity }) => `${code} (${entity})`)
      .join(', ');
    throw new Error(
      `OpenAPI compatibility: breaking changes detected: ${details}`,
    );
  }
  console.log('OpenAPI compatibility: no breaking changes detected.');
}

const command = process.argv[2];
const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  try {
    if (command === 'export') await exportContract();
    else if (command === 'generate') generateClient();
    else if (command === 'validate') await validateContract();
    else if (command === 'check') checkFreshness();
    else if (command === 'stale') checkStale();
    else if (command === 'diff') await diffContract();
    else throw new Error(`Unknown contract command: ${command ?? '(missing)'}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
