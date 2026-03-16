import type { EventRow } from '@contracking/shared';
import { mapEventRow } from '../db/mappers';
import { DELETE_EVENT, INSERT_EVENT, SELECT_EVENT } from '../db/queries';
import { getAuthenticatedUser } from '../middleware/auth';
import type { Environment } from '../types';
import { jsonResponse } from '../utils';

type HandlerParams = { request: Request; env: Environment; sessionId?: string; eventId?: string };

export async function handleCreateEvent({ request, env }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const body = await request.json<{ type: string; value?: string; occurredAt?: string }>();
  const id = crypto.randomUUID();
  const occurredAt = body.occurredAt ?? new Date().toISOString();

  await env.DATABASE.prepare(INSERT_EVENT)
    .bind(id, user.id, body.type, body.value ?? null, occurredAt)
    .run();

  const row = await env.DATABASE.prepare(SELECT_EVENT).bind(id).first<EventRow>();
  return jsonResponse(mapEventRow(row!), 201);
}

export async function handleDeleteEvent({ request, env, eventId }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const eventRow = await env.DATABASE.prepare(SELECT_EVENT).bind(eventId).first<EventRow>();
  if (!eventRow) return jsonResponse({ error: 'not found' }, 404);

  const isNotOwner = eventRow.user_id !== user.id;
  if (isNotOwner) return jsonResponse({ error: 'not found' }, 404);

  await env.DATABASE.prepare(DELETE_EVENT).bind(eventId).run();
  return new Response(null, { status: 204 });
}
