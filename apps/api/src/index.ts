import { handleCorsPreflight, withCors } from './middleware/cors';
import { handleScheduled } from './scheduled';
import { handleLogout, handleMagicLink, handleMe, handleVerify, handleVerifyOtp } from './routes/auth';
import { handleCreateContraction, handleDeleteContraction, handleUpdateContraction } from './routes/contractions';
import { handleCreateEvent, handleDeleteEvent } from './routes/events';
import { handleGetPublicSession, handlePollPublicSession } from './routes/public';
import { handleGetVapidKey, handleSubscribe, handleUnsubscribe } from './routes/push';
import {
  handleCreateSession,
  handleDeleteSession,
  handleGetSession,
  handleListSessions,
  handleUpdateSession,
} from './routes/sessions';
import { handleGetMySession, handleSync, handleSyncSession } from './routes/sync';
import type { Environment } from './types';
import { jsonResponse } from './utils';

const SESSION_ID_PATTERN = /^\/sessions\/([^/]+)$/;
const CONTRACTION_ID_PATTERN = /^\/contractions\/([^/]+)$/;
const EVENT_ID_PATTERN = /^\/events\/([^/]+)$/;
const SESSION_CONTRACTIONS_PATTERN = /^\/sessions\/([^/]+)\/contractions$/;
const SESSION_EVENTS_PATTERN = /^\/sessions\/([^/]+)\/events$/;
const SESSION_SYNC_PATTERN = /^\/sessions\/([^/]+)\/sync$/;
const PUBLIC_ID_PATTERN = /^\/public\/([^/]+)$/;
const PUBLIC_POLL_PATTERN = /^\/public\/([^/]+)\/poll$/;

export default {
  async scheduled(_event: ScheduledEvent, env: Environment, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },

  async fetch(request: Request, env: Environment): Promise<Response> {
    const preflight = handleCorsPreflight({ request, env });
    if (preflight) return preflight;

    const { pathname } = new URL(request.url);
    const { method } = request;
    const origin = env.DASHBOARD_URL;

    let response: Response;

    if (pathname === '/api-version' && method === 'GET') {
      response = jsonResponse({ version: env.API_VERSION ?? 'dev' });
    } else if (pathname === '/auth/magic-link' && method === 'POST') {
      response = await handleMagicLink({ request, env });
    } else if (pathname === '/auth/verify-otp' && method === 'POST') {
      response = await handleVerifyOtp({ request, env });
    } else if (pathname === '/auth/verify' && method === 'GET') {
      response = await handleVerify({ request, env });
    } else if (pathname === '/auth/me' && method === 'GET') {
      response = await handleMe({ request, env });
    } else if (pathname === '/auth/logout' && method === 'POST') {
      response = await handleLogout({ request, env });
    } else if ((pathname === '/sync' || pathname === '/s') && (method === 'POST' || method === 'GET')) {
      response = await handleSync({ request, env });
    } else if (pathname === '/my-session' && method === 'GET') {
      response = await handleGetMySession({ request, env });
    } else if (pathname === '/sessions' && method === 'POST') {
      response = await handleCreateSession({ request, env });
    } else if (pathname === '/sessions' && method === 'GET') {
      response = await handleListSessions({ request, env });
    } else if (SESSION_CONTRACTIONS_PATTERN.test(pathname) && method === 'POST') {
      const sessionId = SESSION_CONTRACTIONS_PATTERN.exec(pathname)![1];
      response = await handleCreateContraction({ request, env, sessionId });
    } else if (SESSION_EVENTS_PATTERN.test(pathname) && method === 'POST') {
      const sessionId = SESSION_EVENTS_PATTERN.exec(pathname)![1];
      response = await handleCreateEvent({ request, env, sessionId });
    } else if (SESSION_SYNC_PATTERN.test(pathname) && method === 'POST') {
      const sessionId = SESSION_SYNC_PATTERN.exec(pathname)![1];
      response = await handleSyncSession({ request, env, sessionId });
    } else if (SESSION_ID_PATTERN.test(pathname) && method === 'GET') {
      const sessionId = SESSION_ID_PATTERN.exec(pathname)![1];
      response = await handleGetSession({ request, env, sessionId });
    } else if (SESSION_ID_PATTERN.test(pathname) && method === 'PATCH') {
      const sessionId = SESSION_ID_PATTERN.exec(pathname)![1];
      response = await handleUpdateSession({ request, env, sessionId });
    } else if (SESSION_ID_PATTERN.test(pathname) && method === 'DELETE') {
      const sessionId = SESSION_ID_PATTERN.exec(pathname)![1];
      response = await handleDeleteSession({ request, env, sessionId });
    } else if (CONTRACTION_ID_PATTERN.test(pathname) && method === 'PATCH') {
      const contractionId = CONTRACTION_ID_PATTERN.exec(pathname)![1];
      response = await handleUpdateContraction({ request, env, contractionId });
    } else if (CONTRACTION_ID_PATTERN.test(pathname) && method === 'DELETE') {
      const contractionId = CONTRACTION_ID_PATTERN.exec(pathname)![1];
      response = await handleDeleteContraction({ request, env, contractionId });
    } else if (EVENT_ID_PATTERN.test(pathname) && method === 'DELETE') {
      const eventId = EVENT_ID_PATTERN.exec(pathname)![1];
      response = await handleDeleteEvent({ request, env, eventId });
    } else if (PUBLIC_POLL_PATTERN.test(pathname) && method === 'GET') {
      const publicId = PUBLIC_POLL_PATTERN.exec(pathname)![1];
      response = await handlePollPublicSession({ request, env, publicId });
    } else if (PUBLIC_ID_PATTERN.test(pathname) && method === 'GET') {
      const publicId = PUBLIC_ID_PATTERN.exec(pathname)![1];
      response = await handleGetPublicSession({ request, env, publicId });
    } else if (pathname === '/push/vapid-key' && method === 'GET') {
      response = await handleGetVapidKey({ request, env });
    } else if (pathname === '/push/subscribe' && method === 'POST') {
      response = await handleSubscribe({ request, env });
    } else if (pathname === '/push/unsubscribe' && method === 'DELETE') {
      response = await handleUnsubscribe({ request, env });
    } else {
      response = jsonResponse({ message: 'not found' }, 404);
    }

    return withCors({ response, origin });
  },
};
