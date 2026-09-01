import { describe, expect, it } from 'vitest';
import RootLayout, { metadata } from './layout';
import HomePage from './page';

describe('web app baseline', () => {
  it('exposes metadata and callable app components', () => {
    expect(metadata.title).toBe('ReparaRed');
    expect(typeof RootLayout).toBe('function');
    expect(typeof HomePage).toBe('function');
  });
});
