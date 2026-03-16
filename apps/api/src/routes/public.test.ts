import { describe, expect, test } from 'bun:test';
import { handleGetPublicSession, handlePollPublicSession } from './public';

const TRACKING_SESSION_ROW = {
  id: 'tracking-1',
  user_id: 'user-1',
  public_id: 'public-abc',
  patient_name: 'Maria',
  gestational_week: 38,
  started_at: new Date().toISOString(),
  ended_at: null,
  timezone: null,
};

function makeDatabase({
  trackingSessionRow = TRACKING_SESSION_ROW as unknown,
  contractionRows = [] as unknown[],
  eventRows = [] as unknown[],
} = {}) {
  return {
    prepare: (query: string) => ({
      bind: (..._args: unknown[]) => ({
        first: () => {
          if (query.includes('public_id')) return Promise.resolve(trackingSessionRow);
          return Promise.resolve(null);
        },
        all: () => {
          if (query.includes('contractions')) return Promise.resolve({ results: contractionRows });
          if (query.includes('events')) return Promise.resolve({ results: eventRows });
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

describe('handleGetPublicSession', () => {
  test('returns 404 when session not found', async () => {
    const database = makeDatabase({ trackingSessionRow: null });
    const request = new Request('http://localhost/public/nonexistent');
    const response = await handleGetPublicSession({
      request,
      env: makeEnvironment(database) as never,
      publicId: 'nonexistent',
    });
    expect(response.status).toBe(404);
  });

  test('returns session with contractions, events, and stats', async () => {
    const request = new Request('http://localhost/public/public-abc');
    const response = await handleGetPublicSession({ request, env: makeEnvironment() as never, publicId: 'public-abc' });
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

describe('handlePollPublicSession', () => {
  test('returns 400 when after param is missing', async () => {
    const request = new Request('http://localhost/public/public-abc/poll');
    const response = await handlePollPublicSession({
      request,
      env: makeEnvironment() as never,
      publicId: 'public-abc',
    });
    expect(response.status).toBe(400);
  });

  test('returns 404 when session not found', async () => {
    const database = makeDatabase({ trackingSessionRow: null });
    const after = new Date().toISOString();
    const request = new Request(`http://localhost/public/nonexistent/poll?after=${encodeURIComponent(after)}`);
    const response = await handlePollPublicSession({
      request,
      env: makeEnvironment(database) as never,
      publicId: 'nonexistent',
    });
    expect(response.status).toBe(404);
  });

  test('returns delta contractions, events, and full stats', async () => {
    const after = new Date(Date.now() - 1000).toISOString();
    const request = new Request(`http://localhost/public/public-abc/poll?after=${encodeURIComponent(after)}`);
    const response = await handlePollPublicSession({
      request,
      env: makeEnvironment() as never,
      publicId: 'public-abc',
    });
    expect(response.status).toBe(200);

    const body = await response.json<{ contractions: unknown[]; events: unknown[]; stats: unknown }>();
    expect(Array.isArray(body.contractions)).toBe(true);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.stats).toBeDefined();
  });
});
