import { describe, expect, it } from 'vitest';
import { isValidTraceId, resolveTraceId, TRACE_ID_PATTERN } from './trace-id';

describe('trace IDs', () => {
  it.each(['request-123', 'a_b.c-9', 'A'.repeat(128)])(
    'accepts bounded opaque value %s',
    (value) => {
      expect(isValidTraceId(value)).toBe(true);
      expect(resolveTraceId(value)).toBe(value);
    },
  );

  it.each([
    '',
    'A'.repeat(129),
    'with space',
    'line\nfeed',
    'control\u0000',
    ['array-value'],
  ])('replaces malformed value %s with a generated UUID', (value) => {
    const resolved = resolveTraceId(value);

    expect(isValidTraceId(resolved)).toBe(true);
    expect(resolved).not.toBe(value);
  });

  it('keeps the validation expression bounded and non-global', () => {
    expect(TRACE_ID_PATTERN.global).toBe(false);
    expect(TRACE_ID_PATTERN.test('safe-id')).toBe(true);
    expect(TRACE_ID_PATTERN.test('unsafe/id')).toBe(false);
  });
});
