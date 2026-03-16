import type { ContractionRow, EventRow, TrackingSessionRow } from '@contracking/shared';
import { calculateSessionStats } from '@contracking/shared';
import { mapContractionRow, mapEventRow, mapTrackingSessionRow } from '../db/mappers';
import {
  DELETE_TRACKING_SESSION,
  INSERT_TRACKING_SESSION,
  SELECT_CONTRACTIONS_BY_USER,
  SELECT_EVENTS_BY_USER,
  SELECT_TRACKING_SESSION,
  SELECT_TRACKING_SESSIONS_BY_USER,
  UPDATE_TRACKING_SESSION,
} from '../db/queries';
import { getAuthenticatedUser } from '../middleware/auth';
import type { Environment } from '../types';
import { jsonResponse } from '../utils';

type HandlerParams = { request: Request; env: Environment; sessionId?: string };

export async function handleCreateSession({ request, env }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const body = await request.json<{ patientName?: string; gestationalWeek?: number; timezone?: string }>();
  const id = crypto.randomUUID();
  const publicId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await env.DATABASE.prepare(INSERT_TRACKING_SESSION)
    .bind(
      id,
      user.id,
      publicId,
      body.patientName ?? null,
      body.gestationalWeek ?? null,
      startedAt,
      body.timezone ?? null,
    )
    .run();

  const row = await env.DATABASE.prepare(SELECT_TRACKING_SESSION).bind(id).first<TrackingSessionRow>();
  return jsonResponse(mapTrackingSessionRow(row!), 201);
}

export async function handleListSessions({ request, env }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const { results } = await env.DATABASE.prepare(SELECT_TRACKING_SESSIONS_BY_USER)
    .bind(user.id)
    .all<TrackingSessionRow>();
  return jsonResponse(results.map(mapTrackingSessionRow));
}

export async function handleGetSession({ request, env, sessionId }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const sessionRow = await env.DATABASE.prepare(SELECT_TRACKING_SESSION).bind(sessionId).first<TrackingSessionRow>();
  const isNotFound = !sessionRow || sessionRow.user_id !== user.id;
  if (isNotFound) return jsonResponse({ error: 'not found' }, 404);

  const session = mapTrackingSessionRow(sessionRow);

  const [{ results: contractionRows }, { results: eventRows }] = await Promise.all([
    env.DATABASE.prepare(SELECT_CONTRACTIONS_BY_USER).bind(user.id).all<ContractionRow>(),
    env.DATABASE.prepare(SELECT_EVENTS_BY_USER).bind(user.id).all<EventRow>(),
  ]);

  const contractions = contractionRows.map(mapContractionRow);
  const events = eventRows.map(mapEventRow);
  const stats = calculateSessionStats({ contractions, events });

  return jsonResponse({ session, contractions, events, stats });
}

export async function handleUpdateSession({ request, env, sessionId }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const sessionRow = await env.DATABASE.prepare(SELECT_TRACKING_SESSION).bind(sessionId).first<TrackingSessionRow>();
  const isNotFound = !sessionRow || sessionRow.user_id !== user.id;
  if (isNotFound) return jsonResponse({ error: 'not found' }, 404);

  const body = await request.json<{
    patientName?: string;
    gestationalWeek?: number;
    endedAt?: string;
    timezone?: string;
  }>();

  await env.DATABASE.prepare(UPDATE_TRACKING_SESSION)
    .bind(
      body.patientName ?? sessionRow.patient_name,
      body.gestationalWeek ?? sessionRow.gestational_week,
      body.endedAt ?? sessionRow.ended_at,
      body.timezone ?? sessionRow.timezone,
      sessionId,
    )
    .run();

  const updated = await env.DATABASE.prepare(SELECT_TRACKING_SESSION).bind(sessionId).first<TrackingSessionRow>();
  return jsonResponse(mapTrackingSessionRow(updated!));
}

export async function handleDeleteSession({ request, env, sessionId }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const sessionRow = await env.DATABASE.prepare(SELECT_TRACKING_SESSION).bind(sessionId).first<TrackingSessionRow>();
  const isNotFound = !sessionRow || sessionRow.user_id !== user.id;
  if (isNotFound) return jsonResponse({ error: 'not found' }, 404);

  await env.DATABASE.prepare(DELETE_TRACKING_SESSION).bind(sessionId).run();
  return new Response(null, { status: 204 });
}
