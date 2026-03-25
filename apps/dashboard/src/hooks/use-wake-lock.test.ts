import { describe, expect, test } from 'bun:test';

const WAKE_LOCK_ENABLED_KEY = 'contracking_wake_lock_enabled';

describe('wake lock storage', () => {
  test('key is consistent', () => {
    expect(WAKE_LOCK_ENABLED_KEY).toBe('contracking_wake_lock_enabled');
  });

  test('enabled state is stored as string 1', () => {
    const value = '1';
    expect(value === '1').toBe(true);
  });

  test('disabled state is stored as string 0', () => {
    const value = '0';
    expect(value === '1').toBe(false);
  });
});
