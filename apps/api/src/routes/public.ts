import type { ContractionRow, EventRow, TrackingSessionRow } from '@contracking/shared';
import { calculateSessionStats } from '@contracking/shared';
import { mapContractionRow, mapEventRow, mapTrackingSessionRow } from '../db/mappers';
import {
  SELECT_CONTRACTIONS_AFTER_TIMESTAMP,
  SELECT_CONTRACTIONS_BY_USER,
  SELECT_EVENTS_AFTER_TIMESTAMP,
  SELECT_EVENTS_BY_USER,
  SELECT_SESSION_BY_PUBLIC_ID,
} from '../db/queries';
import type { Environment } from '../types';
import { jsonResponse } from '../utils';

type HandlerParams = { request: Request; env: Environment; publicId?: string };

export async function handleGetPublicSession({ env, publicId }: HandlerParams): Promise<Response> {
  const sessionRow = await env.DATABASE.prepare(SELECT_SESSION_BY_PUBLIC_ID).bind(publicId).first<TrackingSessionRow>();
  if (!sessionRow) return jsonResponse({ error: 'not found' }, 404);

  const session = mapTrackingSessionRow(sessionRow);

  const [{ results: contractionRows }, { results: eventRows }] = await Promise.all([
    env.DATABASE.prepare(SELECT_CONTRACTIONS_BY_USER).bind(sessionRow.user_id).all<ContractionRow>(),
    env.DATABASE.prepare(SELECT_EVENTS_BY_USER).bind(sessionRow.user_id).all<EventRow>(),
  ]);

  const contractions = contractionRows.map(mapContractionRow);
  const events = eventRows.map(mapEventRow);
  const stats = calculateSessionStats({ contractions, events });

  return jsonResponse({ session, contractions, events, stats });
}

export async function handlePollPublicSession({ request, env, publicId }: HandlerParams): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const after = searchParams.get('after');
  if (!after) return jsonResponse({ error: 'after is required' }, 400);

  const sessionRow = await env.DATABASE.prepare(SELECT_SESSION_BY_PUBLIC_ID).bind(publicId).first<TrackingSessionRow>();
  if (!sessionRow) return jsonResponse({ error: 'not found' }, 404);

  const [
    { results: deltaContractionRows },
    { results: deltaEventRows },
    { results: allContractionRows },
    { results: allEventRows },
  ] = await Promise.all([
    env.DATABASE.prepare(SELECT_CONTRACTIONS_AFTER_TIMESTAMP).bind(sessionRow.user_id, after).all<ContractionRow>(),
    env.DATABASE.prepare(SELECT_EVENTS_AFTER_TIMESTAMP).bind(sessionRow.user_id, after).all<EventRow>(),
    env.DATABASE.prepare(SELECT_CONTRACTIONS_BY_USER).bind(sessionRow.user_id).all<ContractionRow>(),
    env.DATABASE.prepare(SELECT_EVENTS_BY_USER).bind(sessionRow.user_id).all<EventRow>(),
  ]);

  const contractions = deltaContractionRows.map(mapContractionRow);
  const events = deltaEventRows.map(mapEventRow);
  const allContractions = allContractionRows.map(mapContractionRow);
  const allEvents = allEventRows.map(mapEventRow);
  const stats = calculateSessionStats({ contractions: allContractions, events: allEvents });

  return jsonResponse({ contractions, events, stats });
}
