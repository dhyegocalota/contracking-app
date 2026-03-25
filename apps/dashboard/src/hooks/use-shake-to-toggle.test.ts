import { describe, expect, test } from 'bun:test';

const SHAKE_THRESHOLD = 25;
const SHAKE_COOLDOWN_MILLISECONDS = 1000;

function computeMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x ** 2 + y ** 2 + z ** 2);
}

function shouldTriggerShake({
  magnitude,
  now,
  lastShakeTime,
}: {
  magnitude: number;
  now: number;
  lastShakeTime: number;
}): boolean {
  if (magnitude < SHAKE_THRESHOLD) return false;
  if (now - lastShakeTime < SHAKE_COOLDOWN_MILLISECONDS) return false;
  return true;
}

describe('shake detection', () => {
  test('gravity alone does not trigger (magnitude ~9.8)', () => {
    const magnitude = computeMagnitude(0, 0, 9.8);
    expect(shouldTriggerShake({ magnitude, now: 1000, lastShakeTime: 0 })).toBe(false);
  });

  test('strong shake triggers (magnitude > 25)', () => {
    const magnitude = computeMagnitude(15, 15, 15);
    expect(magnitude).toBeGreaterThan(SHAKE_THRESHOLD);
    expect(shouldTriggerShake({ magnitude, now: 2000, lastShakeTime: 0 })).toBe(true);
  });

  test('does not trigger during cooldown', () => {
    const magnitude = 30;
    expect(shouldTriggerShake({ magnitude, now: 500, lastShakeTime: 0 })).toBe(false);
  });

  test('triggers after cooldown expires', () => {
    const magnitude = 30;
    expect(shouldTriggerShake({ magnitude, now: 1500, lastShakeTime: 0 })).toBe(true);
  });

  test('magnitude computation is correct', () => {
    expect(computeMagnitude(3, 4, 0)).toBeCloseTo(5, 5);
    expect(computeMagnitude(0, 0, 0)).toBe(0);
    expect(computeMagnitude(1, 1, 1)).toBeCloseTo(Math.sqrt(3), 5);
  });
});
