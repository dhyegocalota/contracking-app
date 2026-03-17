import { describe, expect, test } from 'bun:test';
import { PUSH_SUBSCRIPTION_STORAGE_KEY } from '@contracking/shared';

describe('push subscription storage', () => {
  test('PUSH_SUBSCRIPTION_STORAGE_KEY is defined', () => {
    expect(PUSH_SUBSCRIPTION_STORAGE_KEY).toBe('contracking_push_subscribed');
  });
});

describe('base64url encoding for applicationServerKey', () => {
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
  }

  test('converts base64url to Uint8Array', () => {
    const input = 'SGVsbG8';
    const result = urlBase64ToUint8Array(input);
    expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  test('handles padding correctly', () => {
    const input = 'YQ';
    const result = urlBase64ToUint8Array(input);
    expect(result).toEqual(new Uint8Array([97]));
  });
});
