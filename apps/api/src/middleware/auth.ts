import type { User, UserRow } from '@contracking/shared';
import { mapUserRow } from '../db/mappers';
import { SELECT_SESSION, SELECT_USER_BY_ID } from '../db/queries';
import type { Environment } from '../types';

const SESSION_COOKIE_NAME = 'contracking_session';
const BEARER_PREFIX = 'Bearer ';

function extractSessionIdFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const sessionCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) return null;
  return sessionCookie.split('=')[1] ?? null;
}

function extractSessionIdFromHeader(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith(BEARER_PREFIX)) return null;
  return authorization.slice(BEARER_PREFIX.length) || null;
}

export async function getAuthenticatedUser({
  request,
  env,
  bodyAuthToken,
}: {
  request: Request;
  env: Environment;
  bodyAuthToken?: string;
}): Promise<User | null> {
  const sessionId = extractSessionIdFromCookie(request) ?? extractSessionIdFromHeader(request) ?? bodyAuthToken ?? null;
  if (!sessionId) return null;

  const sessionRow = await env.DATABASE.prepare(SELECT_SESSION)
    .bind(sessionId)
    .first<{ id: string; user_id: string; expires_at: string }>();
  if (!sessionRow) return null;

  const isExpired = new Date(sessionRow.expires_at) < new Date();
  if (isExpired) return null;

  const userRow = await env.DATABASE.prepare(SELECT_USER_BY_ID).bind(sessionRow.user_id).first<UserRow>();
  if (!userRow) return null;

  return mapUserRow(userRow);
}
