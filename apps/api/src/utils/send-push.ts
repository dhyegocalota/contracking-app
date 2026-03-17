import type { PushNotificationPayload, PushSubscriptionRow } from '@contracking/shared';
import { DELETE_PUSH_SUBSCRIPTION, UPDATE_PUSH_SUBSCRIPTION_LAST_USED } from '../db/queries';

type VapidHeaderParams = {
  audience: string;
  subject: string;
  publicKey: string;
  privateKey: string;
};

type EncryptParams = {
  payload: string;
  p256dh: string;
  auth: string;
};

type SendPushParams = {
  subscription: PushSubscriptionRow;
  payload: PushNotificationPayload;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  database: D1Database;
};

function base64UrlToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function hkdfExtract(salt: Uint8Array, inputKeyingMaterial: Uint8Array): Promise<Uint8Array> {
  const saltKey = await crypto.subtle.importKey(
    'raw',
    salt.length > 0 ? salt : new Uint8Array(32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, inputKeyingMaterial));
}

async function hkdfExpand(pseudoRandomKey: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    pseudoRandomKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const infoWithCounter = new Uint8Array([...info, 1]);
  const outputKeyingMaterial = new Uint8Array(await crypto.subtle.sign('HMAC', key, infoWithCounter));
  return outputKeyingMaterial.slice(0, length);
}

async function hkdf(
  salt: Uint8Array,
  inputKeyingMaterial: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const pseudoRandomKey = await hkdfExtract(salt, inputKeyingMaterial);
  return hkdfExpand(pseudoRandomKey, info, length);
}

export async function buildVapidHeaders({
  audience,
  subject,
  publicKey,
  privateKey,
}: VapidHeaderParams): Promise<{
  Authorization: string;
  'Crypto-Key': string;
}> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { aud: audience, exp: now + 86400, sub: subject };

  const encodedHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(jwtPayload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const publicKeyBytes = base64UrlToUint8Array(publicKey);

  const jsonWebKey: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKey,
    x: uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33)),
    y: uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65)),
  };

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    jsonWebKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(unsignedToken),
  );

  const derSignature = new Uint8Array(signature);
  const r = derSignature.slice(0, 32);
  const s = derSignature.slice(32, 64);
  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array([...r, ...s]));

  const token = `${unsignedToken}.${encodedSignature}`;

  return {
    Authorization: `vapid t=${token}, k=${publicKey}`,
    'Crypto-Key': `p256ecdsa=${publicKey}`,
  };
}

export async function encryptPayload({
  payload,
  p256dh,
  auth,
}: EncryptParams): Promise<{
  body: ArrayBuffer;
  headers: { 'Content-Encoding': string; 'Content-Type': string };
}> {
  const clientPublicKey = base64UrlToUint8Array(p256dh);
  const authSecret = base64UrlToUint8Array(auth);

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey),
  );

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      serverKeyPair.privateKey,
      256,
    ),
  );

  const inputKeyingMaterialInfo = new TextEncoder().encode('WebPush: info\0');
  const inputKeyingMaterialInput = new Uint8Array([
    ...inputKeyingMaterialInfo,
    ...clientPublicKey,
    ...serverPublicKeyRaw,
  ]);
  const inputKeyingMaterial = await hkdf(authSecret, sharedSecret, inputKeyingMaterialInput, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const contentEncryptionKeyInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const contentEncryptionKey = await hkdf(salt, inputKeyingMaterial, contentEncryptionKeyInfo, 16);

  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = await hkdf(salt, inputKeyingMaterial, nonceInfo, 12);

  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array([...payloadBytes, 2]);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, paddedPayload.length + 16 + 1);

  const headerBytes = new Uint8Array([
    ...salt,
    ...recordSize,
    serverPublicKeyRaw.length,
    ...serverPublicKeyRaw,
  ]);

  const body = new Uint8Array([...headerBytes, ...encrypted]);

  return {
    body: body.buffer,
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
    },
  };
}

export async function sendPush({
  subscription,
  payload,
  vapidPublicKey,
  vapidPrivateKey,
  vapidSubject,
  database,
}: SendPushParams): Promise<boolean> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const vapidHeaders = await buildVapidHeaders({
    audience,
    subject: vapidSubject,
    publicKey: vapidPublicKey,
    privateKey: vapidPrivateKey,
  });

  const encrypted = await encryptPayload({
    payload: JSON.stringify(payload),
    p256dh: subscription.key_p256dh,
    auth: subscription.key_auth,
  });

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      ...vapidHeaders,
      ...encrypted.headers,
      TTL: '86400',
    },
    body: encrypted.body,
  });

  if (response.status === 404 || response.status === 410) {
    await database.prepare(DELETE_PUSH_SUBSCRIPTION).bind(subscription.id).run();
    return false;
  }

  if (response.ok) {
    await database
      .prepare(UPDATE_PUSH_SUBSCRIPTION_LAST_USED)
      .bind(new Date().toISOString(), subscription.id)
      .run();
  }

  return response.ok;
}
