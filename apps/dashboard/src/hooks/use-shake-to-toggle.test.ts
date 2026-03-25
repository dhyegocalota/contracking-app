import { describe, expect, test } from 'bun:test';

const SHAKE_THRESHOLD = 30;
const SHAKE_HITS_REQUIRED = 3;
const SHAKE_WINDOW_MILLISECONDS = 800;
const SHAKE_COOLDOWN_MILLISECONDS = 2000;

function computeMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x ** 2 + y ** 2 + z ** 2);
}

function simulateShakeSequence({
  hits,
  cooldownStart,
}: {
  hits: number[];
  cooldownStart: number;
}): boolean {
  const now = hits[hits.length - 1]!;
  const isCooldown = now - cooldownStart < SHAKE_COOLDOWN_MILLISECONDS;
  if (isCooldown) return false;

  const recentHits = hits.filter((timestamp) => now - timestamp < SHAKE_WINDOW_MILLISECONDS);
  return recentHits.length >= SHAKE_HITS_REQUIRED;
}

describe('shake detection', () => {
  test('gravity alone does not trigger (magnitude ~9.8)', () => {
    const magnitude = computeMagnitude(0, 0, 9.8);
    expect(magnitude).toBeLessThan(SHAKE_THRESHOLD);
  });

  test('strong shake exceeds threshold', () => {
    const magnitude = computeMagnitude(20, 20, 15);
    expect(magnitude).toBeGreaterThan(SHAKE_THRESHOLD);
  });

  test('single hit does not trigger', () => {
    expect(simulateShakeSequence({ hits: [5000], cooldownStart: 0 })).toBe(false);
  });

  test('two hits do not trigger', () => {
    expect(simulateShakeSequence({ hits: [5000, 5200], cooldownStart: 0 })).toBe(false);
  });

  test('three hits within window triggers', () => {
    expect(simulateShakeSequence({ hits: [5000, 5300, 5600], cooldownStart: 0 })).toBe(true);
  });

  test('three hits spread too far apart does not trigger', () => {
    expect(simulateShakeSequence({ hits: [5000, 6000, 7000], cooldownStart: 0 })).toBe(false);
  });

  test('does not trigger during cooldown', () => {
    expect(simulateShakeSequence({ hits: [5000, 5200, 5400], cooldownStart: 4000 })).toBe(false);
  });

  test('triggers after cooldown expires', () => {
    expect(simulateShakeSequence({ hits: [7000, 7200, 7400], cooldownStart: 4000 })).toBe(true);
  });

  test('magnitude computation is correct', () => {
    expect(computeMagnitude(3, 4, 0)).toBeCloseTo(5, 5);
    expect(computeMagnitude(0, 0, 0)).toBe(0);
  });
});
