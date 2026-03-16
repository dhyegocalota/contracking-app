import { describe, expect, test } from 'bun:test';

function computeElapsedSeconds(startTime: number, now: number): number {
  return Math.floor((now - startTime) / 1000);
}

function computeStartTimeWithOffset(now: number, offsetSeconds: number): number {
  return now - offsetSeconds * 1000;
}

describe('timer elapsed seconds computation', () => {
  test('returns 0 when start and now are equal', () => {
    const now = Date.now();
    expect(computeElapsedSeconds(now, now)).toBe(0);
  });

  test('returns correct seconds for elapsed time', () => {
    const startTime = 1000000000000;
    const now = startTime + 45000;
    expect(computeElapsedSeconds(startTime, now)).toBe(45);
  });

  test('floors partial seconds', () => {
    const startTime = 1000000000000;
    const now = startTime + 59999;
    expect(computeElapsedSeconds(startTime, now)).toBe(59);
  });

  test('handles one minute elapsed', () => {
    const startTime = 1000000000000;
    const now = startTime + 60000;
    expect(computeElapsedSeconds(startTime, now)).toBe(60);
  });

  test('handles multiple minutes elapsed', () => {
    const startTime = 1000000000000;
    const now = startTime + 300000;
    expect(computeElapsedSeconds(startTime, now)).toBe(300);
  });
});

describe('startFrom offset computation', () => {
  test('startFrom 0 seconds produces same result as start', () => {
    const now = Date.now();
    const startTime = computeStartTimeWithOffset(now, 0);
    expect(computeElapsedSeconds(startTime, now)).toBe(0);
  });

  test('startFrom 60 seconds resumes at 60', () => {
    const now = Date.now();
    const startTime = computeStartTimeWithOffset(now, 60);
    expect(computeElapsedSeconds(startTime, now)).toBe(60);
  });

  test('startFrom 180 seconds resumes at 3 minutes', () => {
    const now = Date.now();
    const startTime = computeStartTimeWithOffset(now, 180);
    expect(computeElapsedSeconds(startTime, now)).toBe(180);
  });

  test('elapsed continues to grow after startFrom offset', () => {
    const pastNow = Date.now();
    const startTime = computeStartTimeWithOffset(pastNow, 120);
    const laterNow = pastNow + 30000;
    expect(computeElapsedSeconds(startTime, laterNow)).toBe(150);
  });
});
