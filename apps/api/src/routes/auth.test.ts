import { describe, expect, mock, test } from 'bun:test';
import { MAGIC_LINK_EXPIRATION_MINUTES, MAGIC_LINK_MAX_SENDS_PER_WINDOW } from '@contracking/shared';

const MINUTES_TO_MILLISECONDS = 60 * 1000;

mock.module('resend', () => ({
  Resend: class {
    emails = {
      send: () => Promise.resolve({ id: 'email-1' }),
    };
  },
}));

const originalFetch = globalThis.fetch;

function mockTurnstileSuccess() {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('turnstile')) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };
}

function mockTurnstileFailure() {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('turnstile')) {
      return new Response(JSON.stringify({ success: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };
}

const { handleMagicLink, handleVerify, handleLogout } = await import('./auth');

function makeBind(firstResult: unknown) {
  return () => ({
    bind: () => ({
      first: () => Promise.resolve(firstResult),
      run: () => Promise.resolve({ success: true }),
    }),
  });
}

function makeDatabase({
  userRow = null,
  tokenRow = null,
  countRow = { count: 0 },
}: {
  userRow?: unknown;
  tokenRow?: unknown;
  countRow?: { count: number };
} = {}): D1Database {
  return {
    prepare: (query: string) => {
      const isCount = query.includes('COUNT(*)');
      const isTokenSelect = query.includes('magic_link_tokens') && query.startsWith('SELECT') && !isCount;
      const isUserSelect = query.includes('users') && query.startsWith('SELECT');

      if (isCount) return makeBind(countRow)();
      if (isTokenSelect) return makeBind(tokenRow)();
      if (isUserSelect) return makeBind(userRow)();

      return {
        bind: () => ({
          first: () => Promise.resolve(null),
          run: () => Promise.resolve({ success: true }),
        }),
      };
    },
  } as unknown as D1Database;
}

function makeEnvironment(database: D1Database = makeDatabase()) {
  return {
    DATABASE: database,
    RESEND_API_KEY: 'test-resend-key',
    DASHBOARD_URL: 'http://localhost:3000',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  };
}

const EXISTING_USER_ROW = {
  id: 'user-1',
  email: 'test@example.com',
  name: null,
  created_at: new Date().toISOString(),
};

const VALID_TOKEN_ROW = {
  id: 'token-1',
  user_id: 'user-1',
  token: 'valid-token',
  expires_at: new Date(Date.now() + MAGIC_LINK_EXPIRATION_MINUTES * MINUTES_TO_MILLISECONDS).toISOString(),
  used_at: null,
};

describe('handleMagicLink', () => {
  test('returns 400 when email is missing', async () => {
    mockTurnstileSuccess();
    const request = new Request('http://localhost/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ turnstileToken: 'valid-token' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await handleMagicLink({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(400);
  });

  test('returns 400 when turnstile token is missing', async () => {
    const request = new Request('http://localhost/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await handleMagicLink({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(400);
  });

  test('returns 403 when turnstile verification fails', async () => {
    mockTurnstileFailure();
    const request = new Request('http://localhost/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', turnstileToken: 'bad-token' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await handleMagicLink({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(403);
  });

  test('returns 429 when rate limited', async () => {
    mockTurnstileSuccess();
    const database = makeDatabase({
      userRow: EXISTING_USER_ROW,
      countRow: { count: MAGIC_LINK_MAX_SENDS_PER_WINDOW },
    });

    const request = new Request('http://localhost/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', turnstileToken: 'valid-token' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await handleMagicLink({ request, env: makeEnvironment(database) as never });
    expect(response.status).toBe(429);
  });

  test('returns 200 with success true for valid email', async () => {
    mockTurnstileSuccess();
    const database = makeDatabase({ userRow: EXISTING_USER_ROW });

    const request = new Request('http://localhost/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', turnstileToken: 'valid-token' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await handleMagicLink({ request, env: makeEnvironment(database) as never });
    expect(response.status).toBe(200);

    const body = await response.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });
});

describe('handleVerify', () => {
  test('redirects to invalid_token error when token is missing', async () => {
    const request = new Request('http://localhost/auth/verify');

    const response = await handleVerify({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('http://localhost:3000/auth/verify?error=invalid_token');
  });

  test('redirects to invalid_token error when token is not found', async () => {
    const database = makeDatabase({ tokenRow: null });

    const request = new Request('http://localhost/auth/verify?token=invalid');
    const response = await handleVerify({ request, env: makeEnvironment(database) as never });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('http://localhost:3000/auth/verify?error=invalid_token');
  });

  test('redirects to token_used error when token is already used', async () => {
    const database = makeDatabase({
      tokenRow: { ...VALID_TOKEN_ROW, used_at: new Date().toISOString() },
    });

    const request = new Request('http://localhost/auth/verify?token=valid-token');
    const response = await handleVerify({ request, env: makeEnvironment(database) as never });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('http://localhost:3000/auth/verify?error=token_used');
  });

  test('redirects to token_expired error when token is expired', async () => {
    const database = makeDatabase({
      tokenRow: { ...VALID_TOKEN_ROW, expires_at: new Date(Date.now() - 1000).toISOString() },
    });

    const request = new Request('http://localhost/auth/verify?token=valid-token');
    const response = await handleVerify({ request, env: makeEnvironment(database) as never });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('http://localhost:3000/auth/verify?error=token_expired');
  });

  test('redirects with Set-Cookie and auth_token on valid token', async () => {
    const database = makeDatabase({ tokenRow: VALID_TOKEN_ROW });

    const request = new Request('http://localhost/auth/verify?token=valid-token');
    const response = await handleVerify({ request, env: makeEnvironment(database) as never });
    expect(response.status).toBe(302);
    const location = response.headers.get('Location')!;
    expect(location).toStartWith('http://localhost:3000?auth_token=');
    expect(response.headers.get('Set-Cookie')).toContain('contracking_session=');
  });
});

describe('handleLogout', () => {
  test('clears session cookie and returns success', async () => {
    const request = new Request('http://localhost/auth/logout', {
      method: 'POST',
      headers: { Cookie: 'contracking_session=session-1' },
    });

    const response = await handleLogout({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');

    const body = await response.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  test('succeeds without a session cookie', async () => {
    const request = new Request('http://localhost/auth/logout', { method: 'POST' });
    const response = await handleLogout({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(200);
  });
});
