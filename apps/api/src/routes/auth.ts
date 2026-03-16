import type { UserRow } from '@contracking/shared';
import { MAGIC_LINK_EXPIRATION_MINUTES, SESSION_MAX_AGE_SECONDS } from '@contracking/shared';
import { Resend } from 'resend';
import {
  DELETE_SESSION,
  INSERT_MAGIC_LINK_TOKEN,
  INSERT_SESSION,
  INSERT_USER,
  MARK_TOKEN_USED,
  SELECT_MAGIC_LINK_BY_OTP,
  SELECT_MAGIC_LINK_TOKEN,
  SELECT_USER_BY_EMAIL,
} from '../db/queries';
import { MagicLinkEmail } from '../email/magic-link';
import { getAuthenticatedUser } from '../middleware/auth';
import { isMagicLinkRateLimited } from '../middleware/rate-limit';
import type { Environment } from '../types';
import { jsonResponse } from '../utils';

const SESSION_COOKIE_NAME = 'contracking_session';
const EMAIL_FROM = 'Contracking <noreply@updates.dhyegocalota.com.br>';
const EMAIL_SUBJECT = 'Acesse o Contracking';
const MINUTES_TO_SECONDS = 60;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type MagicLinkTokenRow = {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
};

async function verifyTurnstileToken({
  token,
  secretKey,
  remoteIp,
}: {
  token: string;
  secretKey: string;
  remoteIp: string | null;
}): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secretKey);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
  const data = await response.json<{ success: boolean }>();
  return data.success;
}

export async function handleMagicLink({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const body = await request.json<{ email?: string; turnstileToken?: string }>();
  const { email, turnstileToken } = body;

  if (!email) return jsonResponse({ error: 'email is required' }, 400);
  if (!turnstileToken) return jsonResponse({ error: 'captcha is required' }, 400);

  const remoteIp = request.headers.get('CF-Connecting-IP');
  const isTurnstileValid = await verifyTurnstileToken({
    token: turnstileToken,
    secretKey: env.TURNSTILE_SECRET_KEY,
    remoteIp,
  });
  if (!isTurnstileValid) return jsonResponse({ error: 'captcha verification failed' }, 403);

  let userRow = await env.DATABASE.prepare(SELECT_USER_BY_EMAIL).bind(email).first<UserRow>();

  if (!userRow) {
    const userId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.DATABASE.prepare(INSERT_USER).bind(userId, email, null, createdAt).run();
    userRow = { id: userId, email, name: null, created_at: createdAt };
  }

  const isRateLimited = await isMagicLinkRateLimited({ userId: userRow.id, database: env.DATABASE });
  if (isRateLimited) return jsonResponse({ error: 'too many requests' }, 429);

  const token = crypto.randomUUID();
  const tokenId = crypto.randomUUID();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRATION_MINUTES * MINUTES_TO_SECONDS * 1000).toISOString();

  const createdAt = new Date().toISOString();
  await env.DATABASE.prepare(INSERT_MAGIC_LINK_TOKEN).bind(tokenId, userRow.id, token, otp, expiresAt, createdAt).run();

  const verifyUrl = `${env.DASHBOARD_URL}/auth/verify?token=${token}`;
  const resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: EMAIL_SUBJECT,
    react: MagicLinkEmail({ verifyUrl, otp }),
  });

  return jsonResponse({ success: true });
}

export async function handleVerifyOtp({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const body = await request.json<{ email?: string; otp?: string }>();
  const { email, otp } = body;

  if (!email || !otp) return jsonResponse({ error: 'email and otp are required' }, 400);

  const userRow = await env.DATABASE.prepare(SELECT_USER_BY_EMAIL).bind(email).first<UserRow>();
  if (!userRow) return jsonResponse({ error: 'invalid_otp' }, 401);

  const tokenRow = await env.DATABASE.prepare(SELECT_MAGIC_LINK_BY_OTP)
    .bind(userRow.id, otp, new Date().toISOString())
    .first<MagicLinkTokenRow>();

  if (!tokenRow) return jsonResponse({ error: 'invalid_otp' }, 401);

  await env.DATABASE.prepare(MARK_TOKEN_USED).bind(new Date().toISOString(), tokenRow.id).run();

  const sessionId = crypto.randomUUID();
  const sessionExpiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await env.DATABASE.prepare(INSERT_SESSION).bind(sessionId, tokenRow.user_id, sessionExpiresAt).run();

  const dashboardHost = new URL(env.DASHBOARD_URL).hostname;
  const cookieDomain = dashboardHost.split('.').slice(-3).join('.');
  const cookie = `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; Domain=.${cookieDomain}`;

  const response = jsonResponse({ sessionId });
  const cloned = new Response(response.body, response);
  cloned.headers.set('Set-Cookie', cookie);
  return cloned;
}

export async function handleVerify({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) return Response.redirect(`${env.DASHBOARD_URL}/auth/verify?error=invalid_token`, 302);

  const tokenRow = await env.DATABASE.prepare(SELECT_MAGIC_LINK_TOKEN).bind(token).first<MagicLinkTokenRow>();

  if (!tokenRow) return Response.redirect(`${env.DASHBOARD_URL}/auth/verify?error=invalid_token`, 302);
  if (tokenRow.used_at) return Response.redirect(`${env.DASHBOARD_URL}/auth/verify?error=token_used`, 302);

  const isExpired = new Date(tokenRow.expires_at) < new Date();
  if (isExpired) return Response.redirect(`${env.DASHBOARD_URL}/auth/verify?error=token_expired`, 302);

  await env.DATABASE.prepare(MARK_TOKEN_USED).bind(new Date().toISOString(), tokenRow.id).run();

  const sessionId = crypto.randomUUID();
  const sessionExpiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await env.DATABASE.prepare(INSERT_SESSION).bind(sessionId, tokenRow.user_id, sessionExpiresAt).run();

  const dashboardHost = new URL(env.DASHBOARD_URL).hostname;
  const cookieDomain = dashboardHost.split('.').slice(-3).join('.');
  const cookie = `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; Domain=.${cookieDomain}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${env.DASHBOARD_URL}?auth_token=${sessionId}`,
      'Set-Cookie': cookie,
    },
  });
}

export async function handleMe({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthenticated' }, 401);
  return jsonResponse(user);
}

export async function handleLogout({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie');
  const sessionCookie = cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (sessionCookie) {
    const sessionId = sessionCookie.split('=')[1];
    if (sessionId) await env.DATABASE.prepare(DELETE_SESSION).bind(sessionId).run();
  }

  const dashboardHost = new URL(env.DASHBOARD_URL).hostname;
  const cookieDomain = dashboardHost.split('.').slice(-3).join('.');
  const clearCookie = `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0; Domain=.${cookieDomain}`;
  const response = jsonResponse({ success: true });
  const cloned = new Response(response.body, response);
  cloned.headers.set('Set-Cookie', clearCookie);

  return cloned;
}
