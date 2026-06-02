import { describe, expect, it } from 'vitest';

import { normalizeLayoutPercent } from './layout-persistence.js';

describe('normalizeLayoutPercent', () => {
  it('returns fallback when undefined', () => {
    expect(normalizeLayoutPercent(undefined, 25)).toBe(25);
  });

  it('passes through percentage values', () => {
    expect(normalizeLayoutPercent(42.5, 25)).toBe(42.5);
  });

  it('converts legacy pixel sidebar width to percent', () => {
    expect(normalizeLayoutPercent(260, 20)).toBeCloseTo(18.6, 1);
  });
});
