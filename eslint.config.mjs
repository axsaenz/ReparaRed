import { fileURLToPath } from 'node:url';
import path from 'node:path';
import nextTs from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';
import sharedEslintConfig from '@repara/config/eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const webFiles = ['apps/web/**/*.{ts,tsx}'];
const apiFiles = ['apps/api/**/*.{ts,tsx}'];
const scopedNextConfig = [...nextVitals, ...nextTs].map((config) => ({
  ...config,
  basePath: rootDir,
  files: webFiles,
}));

export default [
  ...sharedEslintConfig,
  ...scopedNextConfig,
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
    ],
  },
  {
    basePath: rootDir,
    files: ['**/*.{js,mjs,cjs}', 'packages/config/**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
    },
  },
  {
    basePath: rootDir,
    files: apiFiles,
    languageOptions: {
      sourceType: 'module',
    },
  },
];
