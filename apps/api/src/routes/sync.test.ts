import { describe, expect, test } from 'bun:test';
import { handleGetMySession, handleSync, handleSyncSession } from './sync';

const SESSION_COOKIE = 'contracking_session=session-1';

const USER_ROW = {
  id: 'user-1',
  email: 'user@example.com',
  name: null,
  created_at: new Date().toISOString(),
};

const AUTH_SESSION_ROW = {
  id: 'session-1',
  user_id: 'user-1',
  expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

const TRACKING_SESSION_ROW = {
  id: 'tracking-1',
  user_id: 'user-1',
  public_id: 'public-1',
  patient_name: null,
  gestational_week: null,
  started_at: new Date().toISOString(),
  ended_at: null,
  timezone: 'America/Sao_Paulo',
};

function makeDatabase({
  sessionRow = AUTH_SESSION_ROW,
  userRow = USER_ROW,
  userTrackingSessionRow = TRACKING_SESSION_ROW as unknown,
  contractionRows = [] as unknown[],
  eventRows = [] as unknown[],
} = {}) {
  return {
    prepare: (query: string) => ({
      bind: (..._args: unknown[]) => ({
        first: () => {
          if (query.includes('tracking_sessions WHERE user_id')) return Promise.resolve(userTrackingSessionRow);
          if (query.includes('sessions WHERE id')) return Promise.resolve(sessionRow);
          if (query.includes('users WHERE id')) return Promise.resolve(userRow);
          return Promise.resolve(null);
        },
        run: () => Promise.resolve({ success: true }),
        all: () => {
          if (query.includes('contractions WHERE user_id')) return Promise.resolve({ results: contractionRows });
          if (query.includes('events WHERE user_id')) return Promise.resolve({ results: eventRows });
          return Promise.resolve({ results: [] });
        },
      }),
    }),
    batch: (_statements: unknown[]) => Promise.resolve([]),
  } as unknown as D1Database;
}

function makeEnvironment(database: D1Database = makeDatabase()) {
  return {
    DATABASE: database,
    RESEND_API_KEY: 'test-key',
    DASHBOARD_URL: 'http://localhost:3000',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  };
}

function makeRequest(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: SESSION_COOKIE,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeUnauthenticatedRequest(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const SYNC_BODY = {
  patientName: null,
  gestationalWeek: null,
  timezone: 'America/Sao_Paulo',
  startedAt: new Date().toISOString(),
  contractions: [
    {
      id: 'c1',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      intensity: 'moderate',
      position: null,
      notes: null,
    },
  ],
  events: [
    {
      id: 'e1',
      type: 'note',
      value: 'test',
      occurredAt: new Date().toISOString(),
    },
  ],
};

const LEGACY_SYNC_BODY = { ...SYNC_BODY, id: 'tracking-1' };

describe('handleSync', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('POST', 'http://localhost/sync', SYNC_BODY);
    const response = await handleSync({
      request,
      env: makeEnvironment(database) as never,
    });
    expect(response.status).toBe(401);
  });

  test('returns session response for existing user session', async () => {
    const request = makeRequest('POST', 'http://localhost/sync', SYNC_BODY);
    const response = await handleSync({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(200);

    const body = await response.json<{
      session: unknown;
      contractions: unknown[];
      events: unknown[];
      stats: unknown;
    }>();
    expect(body.session).toBeDefined();
    expect(body.stats).toBeDefined();
  });

  test('creates new session when user has no sessions', async () => {
    const database = makeDatabase({ userTrackingSessionRow: null });
    const originalPrepare = database.prepare.bind(database);
    let insertCalled = false;
    database.prepare = (query: string) => {
      const result = originalPrepare(query);
      if (query.includes('INSERT INTO tracking_sessions')) {
        insertCalled = true;
        return {
          ...result,
          bind: (...args: unknown[]) => ({
            ...result.bind(...args),
            run: () => Promise.resolve({ success: true }),
          }),
        };
      }
      if (query.includes('tracking_sessions WHERE user_id') && insertCalled) {
        return {
          ...result,
          bind: (...args: unknown[]) => ({
            ...result.bind(...args),
            first: () => Promise.resolve(TRACKING_SESSION_ROW),
          }),
        };
      }
      return result;
    };

    const request = makeRequest('POST', 'http://localhost/sync', SYNC_BODY);
    const response = await handleSync({
      request,
      env: makeEnvironment(database) as never,
    });
    expect(response.status).toBe(200);
  });

  test('handles empty contractions and events', async () => {
    const emptyBody = { ...SYNC_BODY, contractions: [], events: [] };
    const request = makeRequest('POST', 'http://localhost/sync', emptyBody);
    const response = await handleSync({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(200);
  });
});

describe('handleGetMySession', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('GET', 'http://localhost/my-session');
    const response = await handleGetMySession({
      request,
      env: makeEnvironment(database) as never,
    });
    expect(response.status).toBe(401);
  });

  test('returns null session when user has no sessions', async () => {
    const database = makeDatabase({ userTrackingSessionRow: null });
    const request = makeRequest('GET', 'http://localhost/my-session');
    const response = await handleGetMySession({
      request,
      env: makeEnvironment(database) as never,
    });
    expect(response.status).toBe(200);

    const body = await response.json<{ session: unknown; contractions: unknown[]; events: unknown[] }>();
    expect(body.session).toBeNull();
    expect(body.contractions).toEqual([]);
    expect(body.events).toEqual([]);
  });

  test('returns session with data when user has a session', async () => {
    const request = makeRequest('GET', 'http://localhost/my-session');
    const response = await handleGetMySession({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(200);

    const body = await response.json<{
      session: unknown;
      contractions: unknown[];
      events: unknown[];
      stats: unknown;
    }>();
    expect(body.session).toBeDefined();
    expect(body.stats).toBeDefined();
  });
});

describe('handleSyncSession (legacy)', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('POST', 'http://localhost/sessions/tracking-1/sync', LEGACY_SYNC_BODY);
    const response = await handleSyncSession({
      request,
      env: makeEnvironment(database) as never,
      sessionId: 'tracking-1',
    });
    expect(response.status).toBe(401);
  });

  test('returns session response with synced data for existing session', async () => {
    const request = makeRequest('POST', 'http://localhost/sessions/tracking-1/sync', LEGACY_SYNC_BODY);
    const response = await handleSyncSession({ request, env: makeEnvironment() as never, sessionId: 'tracking-1' });
    expect(response.status).toBe(200);

    const body = await response.json<{
      session: unknown;
      contractions: unknown[];
      events: unknown[];
      stats: unknown;
    }>();
    expect(body.session).toBeDefined();
    expect(body.stats).toBeDefined();
  });

  test('handles empty contractions and events', async () => {
    const emptyBody = { ...LEGACY_SYNC_BODY, contractions: [], events: [] };
    const request = makeRequest('POST', 'http://localhost/sessions/tracking-1/sync', emptyBody);
    const response = await handleSyncSession({ request, env: makeEnvironment() as never, sessionId: 'tracking-1' });
    expect(response.status).toBe(200);
  });
});
