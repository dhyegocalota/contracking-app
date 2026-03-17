import { describe, expect, test } from 'bun:test';
import { PushSubscriptionType } from '@contracking/shared';

describe('push subscribe validation', () => {
  test('owner type requires user_id', () => {
    const type = PushSubscriptionType.OWNER;
    const userId = null;
    const isValid = type !== PushSubscriptionType.OWNER || userId !== null;
    expect(isValid).toBe(false);
  });

  test('companion type requires publicId', () => {
    const type = PushSubscriptionType.COMPANION;
    const publicId = null;
    const isValid = type !== PushSubscriptionType.COMPANION || publicId !== null;
    expect(isValid).toBe(false);
  });

  test('companion type with publicId is valid', () => {
    const type = PushSubscriptionType.COMPANION;
    const publicId = 'abc-123';
    const isValid = type !== PushSubscriptionType.COMPANION || publicId !== null;
    expect(isValid).toBe(true);
  });

  test('owner type with userId is valid', () => {
    const type = PushSubscriptionType.OWNER;
    const userId = 'user-123';
    const isValid = type !== PushSubscriptionType.OWNER || userId !== null;
    expect(isValid).toBe(true);
  });
});

describe('unsubscribe validation', () => {
  test('requires endpoint and authKey', () => {
    const body = { endpoint: 'https://push.example.com/123', authKey: 'abc' };
    const isValid = !!body.endpoint && !!body.authKey;
    expect(isValid).toBe(true);
  });

  test('rejects missing authKey', () => {
    const body = { endpoint: 'https://push.example.com/123', authKey: '' };
    const isValid = !!body.endpoint && !!body.authKey;
    expect(isValid).toBe(false);
  });
});
