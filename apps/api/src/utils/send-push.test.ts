import { describe, expect, test } from 'bun:test';
import { buildVapidHeaders, encryptPayload } from './send-push';

describe('buildVapidHeaders', () => {
  test('returns valid Authorization and Crypto-Key headers', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign'],
    );
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const privateKeyBase64 = privateKeyJwk.d!;

    const headers = await buildVapidHeaders({
      audience: 'https://fcm.googleapis.com',
      subject: 'mailto:test@example.com',
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
    });

    expect(headers.Authorization).toStartWith('vapid t=');
    expect(headers['Crypto-Key']).toStartWith('p256ecdsa=');
  });
});

describe('encryptPayload', () => {
  test('returns encrypted buffer with correct content encoding headers', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    );
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const p256dh = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const authBytes = crypto.getRandomValues(new Uint8Array(16));
    const auth = btoa(String.fromCharCode(...authBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await encryptPayload({
      payload: JSON.stringify({ title: 'Test', body: 'Hello' }),
      p256dh,
      auth,
    });

    expect(result.body).toBeInstanceOf(ArrayBuffer);
    expect(result.body.byteLength).toBeGreaterThan(0);
    expect(result.headers['Content-Encoding']).toBe('aes128gcm');
  });
});
