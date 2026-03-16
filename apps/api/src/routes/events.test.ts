import { describe, expect, test } from 'bun:test';
import { handleCreateEvent, handleDeleteEvent } from './events';

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

const EVENT_ROW = {
  id: 'event-1',
  user_id: 'user-1',
  type: 'dilation',
  value: '4cm',
  occurred_at: new Date().toISOString(),
};

function makeDatabase({ sessionRow = AUTH_SESSION_ROW, userRow = USER_ROW, eventRow = EVENT_ROW as unknown } = {}) {
  return {
    prepare: (query: string) => ({
      bind: (..._args: unknown[]) => ({
        first: () => {
          if (query.includes('events WHERE id')) return Promise.resolve(eventRow);
          if (query.includes('sessions WHERE id')) return Promise.resolve(sessionRow);
          if (query.includes('users WHERE id')) return Promise.resolve(userRow);
          return Promise.resolve(null);
        },
        run: () => Promise.resolve({ success: true }),
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

describe('handleCreateEvent', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('POST', 'http://localhost/events');
    const response = await handleCreateEvent({
      request,
      env: makeEnvironment(database) as never,
    });
    expect(response.status).toBe(401);
  });

  test('returns 201 with created event', async () => {
    const request = makeRequest('POST', 'http://localhost/events', {
      type: 'dilation',
      value: '4cm',
    });
    const response = await handleCreateEvent({ request, env: makeEnvironment() as never });
    expect(response.status).toBe(201);

    const body = await response.json<{ id: string }>();
    expect(body.id).toBeDefined();
  });
});

describe('handleDeleteEvent', () => {
  test('returns 401 when not authenticated', async () => {
    const database = makeDatabase({ sessionRow: null as unknown });
    const request = makeUnauthenticatedRequest('DELETE', 'http://localhost/events/event-1');
    const response = await handleDeleteEvent({ request, env: makeEnvironment(database) as never, eventId: 'event-1' });
    expect(response.status).toBe(401);
  });

  test('returns 404 when event not found', async () => {
    const database = makeDatabase({ eventRow: null });
    const request = makeRequest('DELETE', 'http://localhost/events/event-1');
    const response = await handleDeleteEvent({ request, env: makeEnvironment(database) as never, eventId: 'event-1' });
    expect(response.status).toBe(404);
  });

  test('returns 404 when event belongs to another user', async () => {
    const database = makeDatabase({ eventRow: { ...EVENT_ROW, user_id: 'other-user' } });
    const request = makeRequest('DELETE', 'http://localhost/events/event-1');
    const response = await handleDeleteEvent({ request, env: makeEnvironment(database) as never, eventId: 'event-1' });
    expect(response.status).toBe(404);
  });

  test('returns 204 on success', async () => {
    const request = makeRequest('DELETE', 'http://localhost/events/event-1');
    const response = await handleDeleteEvent({ request, env: makeEnvironment() as never, eventId: 'event-1' });
    expect(response.status).toBe(204);
  });
});
