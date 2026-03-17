import { PushSubscriptionType } from '@contracking/shared';
import {
  DELETE_PUSH_SUBSCRIPTION_BY_ENDPOINT,
  SELECT_SESSION_BY_PUBLIC_ID,
  UPSERT_PUSH_SUBSCRIPTION,
} from '../db/queries';
import { getAuthenticatedUser } from '../middleware/auth';
import type { Environment } from '../types';
import { jsonResponse } from '../utils';

type HandlerParams = { request: Request; env: Environment };

export async function handleGetVapidKey({ env }: HandlerParams): Promise<Response> {
  return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY });
}

export async function handleSubscribe({ request, env }: HandlerParams): Promise<Response> {
  const body = await request.json<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    type: PushSubscriptionType;
    publicId?: string;
    turnstileToken?: string;
  }>();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth || !body.type) {
    return jsonResponse({ error: 'missing required fields' }, 400);
  }

  if (body.type === PushSubscriptionType.OWNER) {
    const user = await getAuthenticatedUser({ request, env });
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

    await env.DATABASE.prepare(UPSERT_PUSH_SUBSCRIPTION)
      .bind(crypto.randomUUID(), user.id, null, body.endpoint, body.keys.p256dh, body.keys.auth, body.type)
      .run();

    return jsonResponse({ subscribed: true });
  }

  if (body.type === PushSubscriptionType.COMPANION) {
    if (!body.publicId) return jsonResponse({ error: 'publicId required for companion' }, 400);
    if (!body.turnstileToken) return jsonResponse({ error: 'turnstile token required' }, 400);

    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: body.turnstileToken }),
    });
    const turnstileResult = await turnstileResponse.json<{ success: boolean }>();
    if (!turnstileResult.success) return jsonResponse({ error: 'turnstile verification failed' }, 400);

    const session = await env.DATABASE.prepare(SELECT_SESSION_BY_PUBLIC_ID).bind(body.publicId).first();
    if (!session) return jsonResponse({ error: 'session not found' }, 404);

    await env.DATABASE.prepare(UPSERT_PUSH_SUBSCRIPTION)
      .bind(crypto.randomUUID(), null, body.publicId, body.endpoint, body.keys.p256dh, body.keys.auth, body.type)
      .run();

    return jsonResponse({ subscribed: true });
  }

  return jsonResponse({ error: 'invalid subscription type' }, 400);
}

export async function handleUnsubscribe({ request, env }: HandlerParams): Promise<Response> {
  const body = await request.json<{ endpoint: string; authKey: string }>();

  if (!body.endpoint || !body.authKey) {
    return jsonResponse({ error: 'endpoint and authKey required' }, 400);
  }

  await env.DATABASE.prepare(DELETE_PUSH_SUBSCRIPTION_BY_ENDPOINT).bind(body.endpoint, body.authKey).run();
  return jsonResponse({ unsubscribed: true });
}
