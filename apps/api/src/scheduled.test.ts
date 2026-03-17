import { describe, expect, test } from 'bun:test';
import {
  CONTRACTION_MAX_DURATION_SECONDS,
  CONTRACTION_TIMEOUT_SECONDS,
  CONTRACTION_WARNING_SECONDS,
  PushNotificationType,
} from '@contracking/shared';

describe('contraction threshold detection', () => {
  function getNotificationLevel(elapsedSeconds: number): string | null {
    if (elapsedSeconds >= CONTRACTION_MAX_DURATION_SECONDS) return 'max';
    if (elapsedSeconds >= CONTRACTION_WARNING_SECONDS) return 'warning';
    if (elapsedSeconds >= CONTRACTION_TIMEOUT_SECONDS) return 'timeout';
    return null;
  }

  function getNotificationType(elapsedSeconds: number): PushNotificationType | null {
    if (elapsedSeconds >= CONTRACTION_TIMEOUT_SECONDS) return PushNotificationType.LONG_CONTRACTION;
    return null;
  }

  test('under 120s returns null', () => {
    expect(getNotificationLevel(100)).toBeNull();
  });

  test('120s returns timeout', () => {
    expect(getNotificationLevel(120)).toBe('timeout');
  });

  test('180s returns warning', () => {
    expect(getNotificationLevel(180)).toBe('warning');
  });

  test('300s returns max', () => {
    expect(getNotificationLevel(300)).toBe('max');
  });

  test('all levels map to LONG_CONTRACTION type', () => {
    expect(getNotificationType(120)).toBe(PushNotificationType.LONG_CONTRACTION);
    expect(getNotificationType(180)).toBe(PushNotificationType.LONG_CONTRACTION);
    expect(getNotificationType(300)).toBe(PushNotificationType.LONG_CONTRACTION);
  });
});
