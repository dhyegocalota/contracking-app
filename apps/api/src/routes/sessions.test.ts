import { describe, expect, test } from 'bun:test';
import {
  handleCreateSession,
  handleDeleteSession,
  handleGetSession,
  handleListSessions,
  handleUpdateSession,
} from './sessions';

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
  patient_name: 'Maria',
  gestational_week: 38,
  started_at: new Date().toISOString(),
  ended_at: null,
  timezone: null,
};

function makeDatabase({
  sessionRow = AUTH_SESSION_ROW,
  userRow = USER_ROW,
  trackingSessionRow = TRACKING_SESSION_ROW as unknown,
  trackingSessionRows = [TRACKING_SESSION_ROW],
  contractionRows = [] as unknown[],
  eventRows = [] as unknown[],
} = {}) {
  return {
    prepare: (query: string) => ({
      bind: (..._args: unknown[]) => ({
        first: () => {
          if (query.includes('tracking_sessions WHERE id')) return Promise.resolve(trackingSessionRow);
          if (query.includes('sessions WHERE id')) return Promise.resolve(sessionRow);
          if (query.includes('users WHERE id')) return Promise.resolve(userRow);
          return Promise.resolve(null);
        },
        run: () => Promise.resolve({ success: true }),
        all: () => {
          if (query.includes('tracking_sessions WHERE user_id'))
            return Promise.resolve({ results: trackingSessionRows });
          if (query.includes('contractions WHERE user_id')) return Promise.resolve({ results: contractionRows });
          if (query.includes('events WHERE user_id')) return Promise.resolve({ results: eventRows });
          return Promise.resolve({ results: [] });
        },
      }),
    }),
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

function makeUnauthenticatedRequest(method: string, url: string) {
  return new Request(url, { method });
}

describe('handleCreateSession', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('POST', 'http://localhost/sessions');
    const response = await handleCreateSession({ request, env: makeEnvironment(database) as never });
    expect(response.status).toBe(401);
  });

  test('returns 201 with created session', async () => {
    const request = makeRequest('POST', 'http://localhost/sessions', { patientName: 'Maria', gestationalWeek: 38 });
    const response = await handleCreateSession({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(201);

    const body = await response.json<{ id: string }>();
    expect(body.id).toBeDefined();
  });
});

describe('handleListSessions', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('GET', 'http://localhost/sessions');
    const response = await handleListSessions({ request, env: makeEnvironment(database) as never });
    expect(response.status).toBe(401);
  });

  test('returns array of sessions', async () => {
    const request = makeRequest('GET', 'http://localhost/sessions');
    const response = await handleListSessions({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(200);

    const body = await response.json<unknown[]>();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('handleGetSession', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('GET', 'http://localhost/sessions/tracking-1');
    const response = await handleGetSession({
      request,
      env: makeEnvironment(database) as never,
      sessionId: 'tracking-1',
    });
    expect(response.status).toBe(401);
  });

  test('returns 404 when tracking session not found', async () => {
    const database = makeDatabase({ trackingSessionRow: null });
    const request = makeRequest('GET', 'http://localhost/sessions/tracking-1');
    const response = await handleGetSession({
      request,
      env: makeEnvironment(database) as never,
      sessionId: 'tracking-1',
    });
    expect(response.status).toBe(404);
  });

  test('returns 404 when tracking session belongs to another user', async () => {
    const database = makeDatabase({ trackingSessionRow: { ...TRACKING_SESSION_ROW, user_id: 'other-user' } });
    const request = makeRequest('GET', 'http://localhost/sessions/tracking-1');
    const response = await handleGetSession({
      request,
      env: makeEnvironment(database) as never,
      sessionId: 'tracking-1',
    });
    expect(response.status).toBe(404);
  });

  test('returns session with contractions, events, and stats', async () => {
    const request = makeRequest('GET', 'http://localhost/sessions/tracking-1');
    const response = await handleGetSession({ request, env: makeEnvironment() as never, sessionId: 'tracking-1' });
    expect(response.status).toBe(200);

    const body = await response.json<{
      session: unknown;
      contractions: unknown[];
      events: unknown[];
      stats: unknown;
    }>();
    expect(body.session).toBeDefined();
    expect(Array.isArray(body.contractions)).toBe(true);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.stats).toBeDefined();
  });
});

describe('handleUpdateSession', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('PATCH', 'http://localhost/sessions/tracking-1');
    const response = await handleUpdateSession({
      request,
      env: makeEnvironment(database) as never,
      sessionId: 'tracking-1',
    });
    expect(response.status).toBe(401);
  });

  test('returns 404 when session not found', async () => {
    const database = makeDatabase({ trackingSessionRow: null });
    const request = makeRequest('PATCH', 'http://localhost/sessions/tracking-1', { patientName: 'Maria' });
    const response = await handleUpdateSession({
      request,
      env: makeEnvironment(database) as never,
      sessionId: 'tracking-1',
    });
    expect(response.status).toBe(404);
  });

  test('returns updated session', async () => {
    const request = makeRequest('PATCH', 'http://localhost/sessions/tracking-1', { patientName: 'Ana' });
    const response = await handleUpdateSession({ request, env: makeEnvironment() as never, sessionId: 'tracking-1' });
    expect(response.status).toBe(200);

    const body = await response.json<{ id: string }>();
    expect(body.id).toBeDefined();
  });
});

describe('handleDeleteSession', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('DELETE', 'http://localhost/sessions/tracking-1');
    const response = await handleDeleteSession({
      request,
      env: makeEnvironment(database) as never,
      sessionId: 'tracking-1',
    });
    expect(response.status).toBe(401);
  });

  test('returns 404 when session not found', async () => {
    const database = makeDatabase({ trackingSessionRow: null });
    const request = makeRequest('DELETE', 'http://localhost/sessions/tracking-1');
    const response = await handleDeleteSession({
      request,
      env: makeEnvironment(database) as never,
      sessionId: 'tracking-1',
    });
    expect(response.status).toBe(404);
  });

  test('returns 204 on success', async () => {
    const request = makeRequest('DELETE', 'http://localhost/sessions/tracking-1');
    const response = await handleDeleteSession({ request, env: makeEnvironment() as never, sessionId: 'tracking-1' });
    expect(response.status).toBe(204);
  });
});
