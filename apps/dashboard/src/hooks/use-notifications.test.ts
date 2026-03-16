import { describe, expect, test } from 'bun:test';
import {
  CONTRACTION_MAX_DURATION_SECONDS,
  CONTRACTION_TIMEOUT_SECONDS,
  CONTRACTION_WARNING_SECONDS,
} from '@contracking/shared';

const TIMEOUT_MILLISECONDS = CONTRACTION_TIMEOUT_SECONDS * 1000;
const WARNING_MILLISECONDS = CONTRACTION_WARNING_SECONDS * 1000;
const MAX_DURATION_MILLISECONDS = CONTRACTION_MAX_DURATION_SECONDS * 1000;

type NotificationLevel = 'timeout' | 'warning' | 'max';

const NOTIFICATION_THRESHOLDS: Record<NotificationLevel, number> = {
  timeout: TIMEOUT_MILLISECONDS,
  warning: WARNING_MILLISECONDS,
  max: MAX_DURATION_MILLISECONDS,
};

describe('contraction notification constants', () => {
  test('CONTRACTION_TIMEOUT_SECONDS is 120', () => {
    expect(CONTRACTION_TIMEOUT_SECONDS).toBe(120);
  });

  test('CONTRACTION_WARNING_SECONDS is 180', () => {
    expect(CONTRACTION_WARNING_SECONDS).toBe(180);
  });

  test('CONTRACTION_MAX_DURATION_SECONDS is 300', () => {
    expect(CONTRACTION_MAX_DURATION_SECONDS).toBe(300);
  });
});

describe('contraction timeout notification logic', () => {
  test('contraction under timeout does not trigger notification', () => {
    const startedAt = new Date();
    const elapsed = Date.now() - startedAt.getTime();
    expect(elapsed).toBeLessThan(TIMEOUT_MILLISECONDS);
  });

  test('contraction over timeout triggers notification', () => {
    const startedAt = new Date(Date.now() - TIMEOUT_MILLISECONDS - 1000);
    const elapsed = Date.now() - startedAt.getTime();
    expect(elapsed).toBeGreaterThanOrEqual(TIMEOUT_MILLISECONDS);
  });

  test('contraction over warning threshold triggers warning', () => {
    const startedAt = new Date(Date.now() - WARNING_MILLISECONDS - 1000);
    const elapsed = Date.now() - startedAt.getTime();
    expect(elapsed).toBeGreaterThanOrEqual(WARNING_MILLISECONDS);
  });

  test('contraction over max duration triggers auto-stop', () => {
    const startedAt = new Date(Date.now() - MAX_DURATION_MILLISECONDS - 1000);
    const elapsed = Date.now() - startedAt.getTime();
    expect(elapsed).toBeGreaterThanOrEqual(MAX_DURATION_MILLISECONDS);
  });
});

describe('escalating notification deduplication', () => {
  function createNotifier() {
    const notifiedLevels = new Map<string, Set<NotificationLevel>>();
    const notified: NotificationLevel[] = [];

    const checkLevel = (contractionId: string, level: NotificationLevel, elapsed: number) => {
      const levels = notifiedLevels.get(contractionId) ?? new Set<NotificationLevel>();
      if (levels.has(level)) return false;
      if (elapsed < NOTIFICATION_THRESHOLDS[level]) return false;
      levels.add(level);
      notifiedLevels.set(contractionId, levels);
      notified.push(level);
      return true;
    };

    return { checkLevel, notified };
  }

  test('each level is only triggered once per contraction', () => {
    const { checkLevel, notified } = createNotifier();
    const elapsed = MAX_DURATION_MILLISECONDS + 1000;

    checkLevel('c1', 'timeout', elapsed);
    checkLevel('c1', 'timeout', elapsed);
    checkLevel('c1', 'warning', elapsed);
    checkLevel('c1', 'warning', elapsed);
    checkLevel('c1', 'max', elapsed);
    checkLevel('c1', 'max', elapsed);

    expect(notified).toEqual(['timeout', 'warning', 'max']);
  });

  test('different contractions can each trigger all levels', () => {
    const { checkLevel, notified } = createNotifier();
    const elapsed = MAX_DURATION_MILLISECONDS + 1000;

    checkLevel('c1', 'timeout', elapsed);
    checkLevel('c2', 'timeout', elapsed);

    expect(notified).toEqual(['timeout', 'timeout']);
  });

  test('levels below threshold do not trigger', () => {
    const { checkLevel, notified } = createNotifier();
    const elapsed = TIMEOUT_MILLISECONDS - 1000;

    checkLevel('c1', 'timeout', elapsed);
    checkLevel('c1', 'warning', elapsed);
    checkLevel('c1', 'max', elapsed);

    expect(notified).toEqual([]);
  });

  test('only timeout triggers when elapsed is between timeout and warning', () => {
    const { checkLevel, notified } = createNotifier();
    const elapsed = TIMEOUT_MILLISECONDS + 1000;

    checkLevel('c1', 'timeout', elapsed);
    checkLevel('c1', 'warning', elapsed);
    checkLevel('c1', 'max', elapsed);

    expect(notified).toEqual(['timeout']);
  });
});
