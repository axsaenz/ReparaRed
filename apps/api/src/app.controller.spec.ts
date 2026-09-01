import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns the application status', () => {
    expect(new AppController().getRoot()).toEqual({ status: 'ok' });
  });
});
