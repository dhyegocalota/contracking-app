import type { ContractionRow } from '@contracking/shared';
import { mapContractionRow } from '../db/mappers';
import { DELETE_CONTRACTION, INSERT_CONTRACTION, SELECT_CONTRACTION, UPDATE_CONTRACTION } from '../db/queries';
import { getAuthenticatedUser } from '../middleware/auth';
import type { Environment } from '../types';
import { jsonResponse } from '../utils';

type HandlerParams = { request: Request; env: Environment; sessionId?: string; contractionId?: string };

export async function handleCreateContraction({ request, env }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await env.DATABASE.prepare(INSERT_CONTRACTION).bind(id, user.id, startedAt).run();

  const row = await env.DATABASE.prepare(SELECT_CONTRACTION).bind(id).first<ContractionRow>();
  return jsonResponse(mapContractionRow(row!), 201);
}

export async function handleUpdateContraction({ request, env, contractionId }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const contractionRow = await env.DATABASE.prepare(SELECT_CONTRACTION).bind(contractionId).first<ContractionRow>();
  if (!contractionRow) return jsonResponse({ error: 'not found' }, 404);

  const isNotOwner = contractionRow.user_id !== user.id;
  if (isNotOwner) return jsonResponse({ error: 'not found' }, 404);

  const body = await request.json<{
    startedAt?: string;
    endedAt?: string;
    intensity?: string;
    position?: string;
    notes?: string;
  }>();

  await env.DATABASE.prepare(UPDATE_CONTRACTION)
    .bind(
      body.startedAt ?? contractionRow.started_at,
      body.endedAt ?? contractionRow.ended_at,
      body.intensity ?? contractionRow.intensity,
      body.position ?? contractionRow.position,
      body.notes ?? contractionRow.notes,
      contractionId,
    )
    .run();

  const updated = await env.DATABASE.prepare(SELECT_CONTRACTION).bind(contractionId).first<ContractionRow>();
  return jsonResponse(mapContractionRow(updated!));
}

export async function handleDeleteContraction({ request, env, contractionId }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const contractionRow = await env.DATABASE.prepare(SELECT_CONTRACTION).bind(contractionId).first<ContractionRow>();
  if (!contractionRow) return jsonResponse({ error: 'not found' }, 404);

  const isNotOwner = contractionRow.user_id !== user.id;
  if (isNotOwner) return jsonResponse({ error: 'not found' }, 404);

  await env.DATABASE.prepare(DELETE_CONTRACTION).bind(contractionId).run();
  return new Response(null, { status: 204 });
}
