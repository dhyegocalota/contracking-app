import { describe, expect, test } from 'bun:test';

const PULL_THRESHOLD_PIXELS = 80;
const MAX_PULL_PIXELS = 120;

function computeDampenedPull(delta: number): number {
  if (delta <= 0) return 0;
  return Math.min(delta * 0.5, MAX_PULL_PIXELS);
}

function shouldTriggerSync(pullDistance: number): boolean {
  return pullDistance >= PULL_THRESHOLD_PIXELS;
}

describe('pull to sync dampening', () => {
  test('returns 0 for negative delta', () => {
    expect(computeDampenedPull(-10)).toBe(0);
  });

  test('returns 0 for zero delta', () => {
    expect(computeDampenedPull(0)).toBe(0);
  });

  test('dampens by 50%', () => {
    expect(computeDampenedPull(100)).toBe(50);
  });

  test('caps at max pull distance', () => {
    expect(computeDampenedPull(500)).toBe(MAX_PULL_PIXELS);
  });

  test('dampens small pull', () => {
    expect(computeDampenedPull(40)).toBe(20);
  });
});

describe('sync trigger threshold', () => {
  test('does not trigger below threshold', () => {
    expect(shouldTriggerSync(79)).toBe(false);
  });

  test('triggers at exact threshold', () => {
    expect(shouldTriggerSync(80)).toBe(true);
  });

  test('triggers above threshold', () => {
    expect(shouldTriggerSync(100)).toBe(true);
  });

  test('does not trigger at zero', () => {
    expect(shouldTriggerSync(0)).toBe(false);
  });
});

describe('pull to sync integration', () => {
  test('user must pull 160px raw to trigger sync (dampened to 80px)', () => {
    const rawPull = 160;
    const dampened = computeDampenedPull(rawPull);
    expect(dampened).toBe(80);
    expect(shouldTriggerSync(dampened)).toBe(true);
  });

  test('pulling 140px raw is not enough (dampened to 70px)', () => {
    const rawPull = 140;
    const dampened = computeDampenedPull(rawPull);
    expect(dampened).toBe(70);
    expect(shouldTriggerSync(dampened)).toBe(false);
  });
});
