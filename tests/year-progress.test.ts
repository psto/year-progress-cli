import { describe, it, expect } from 'vitest';
import { yearProgress } from '../src/index';

describe('yearProgress', () => {
  it('returns 0 on January 1st', () => {
    const date = new Date('2026-01-01T00:00:00');
    expect(yearProgress(date)).toBe(0);
  });

  it('returns 100 on December 31st 23:59:59', () => {
    const date = new Date('2026-12-31T23:59:59');
    expect(yearProgress(date)).toBe(100);
  });

  it('returns ~50 around July 2nd', () => {
    const date = new Date('2026-07-02T12:00:00');
    expect(yearProgress(date)).toBe(50);
  });

  it('returns ~25 around April 2nd', () => {
    const date = new Date('2026-04-02T00:00:00');
    expect(yearProgress(date)).toBe(25);
  });

  it('returns ~75 around October 2nd', () => {
    const date = new Date('2026-10-02T00:00:00');
    expect(yearProgress(date)).toBe(75);
  });

  it('returns 0 precisely on January 1st with precision 2', () => {
    const date = new Date('2026-01-01T00:00:00');
    expect(yearProgress(date, 2)).toBe(0);
  });

  it('returns a fractional number with precision 2', () => {
    const date = new Date('2026-07-02T12:00:00');
    const result = yearProgress(date, 2);
    expect(result).toBeGreaterThan(49);
    expect(result).toBeLessThan(51);
    expect(Number.isInteger(result)).toBe(false);
  });

  it('precision 0 equals default', () => {
    const date = new Date('2026-07-02T12:00:00');
    expect(yearProgress(date, 0)).toBe(yearProgress(date));
  });
});
