import type { ContractionRow, EventRow, PushSubscriptionRow, TrackingSessionRow } from '@contracking/shared';
import { PushNotificationType, calculateSessionStats } from '@contracking/shared';
import { mapContractionRow, mapEventRow, mapTrackingSessionRow } from '../db/mappers';
import {
  DELETE_CONTRACTION,
  DELETE_EVENT,
  INSERT_TRACKING_SESSION,
  SELECT_CONTRACTIONS_BY_USER,
  SELECT_EVENTS_BY_USER,
  SELECT_PUSH_SUBSCRIPTIONS_BY_PUBLIC_ID,
  SELECT_USER_TRACKING_SESSION,
  UPSERT_CONTRACTION,
  UPSERT_EVENT,
} from '../db/queries';
import { sendPush } from '../utils/send-push';
import { getAuthenticatedUser } from '../middleware/auth';
import type { Environment } from '../types';
import { jsonResponse } from '../utils';

type SyncBody = {
  patientName: string | null;
  gestationalWeek: number | null;
  timezone: string;
  startedAt: string;
  contractions: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    intensity: string | null;
    position: string | null;
    notes: string | null;
  }[];
  events: {
    id: string;
    type: string;
    value: string | null;
    occurredAt: string;
  }[];
  deletedIds?: string[];
};

type LegacySyncBody = SyncBody & { id: string };

type HandlerParams = { request: Request; env: Environment; sessionId?: string };

async function syncUserData({
  env,
  userId,
  body,
}: {
  env: Environment;
  userId: string;
  body: SyncBody;
}): Promise<Response> {
  const contractionStatements = body.contractions.map((contraction) =>
    env.DATABASE.prepare(UPSERT_CONTRACTION).bind(
      contraction.id,
      userId,
      contraction.startedAt,
      contraction.endedAt ?? null,
      contraction.intensity ?? null,
      contraction.position ?? null,
      contraction.notes ?? null,
    ),
  );

  const eventStatements = body.events.map((event) =>
    env.DATABASE.prepare(UPSERT_EVENT).bind(event.id, userId, event.type, event.value ?? null, event.occurredAt),
  );

  const deleteContractionStatements = (body.deletedIds ?? []).map((id) =>
    env.DATABASE.prepare(DELETE_CONTRACTION).bind(id),
  );

  const deleteEventStatements = (body.deletedIds ?? []).map((id) => env.DATABASE.prepare(DELETE_EVENT).bind(id));

  const allStatements = [
    ...contractionStatements,
    ...eventStatements,
    ...deleteContractionStatements,
    ...deleteEventStatements,
  ];
  if (allStatements.length > 0) {
    await env.DATABASE.batch(allStatements);
  }

  let sessionRow = await env.DATABASE.prepare(SELECT_USER_TRACKING_SESSION).bind(userId).first<TrackingSessionRow>();

  if (!sessionRow) {
    const trackingSessionId = crypto.randomUUID();
    const publicId = crypto.randomUUID();
    await env.DATABASE.prepare(INSERT_TRACKING_SESSION)
      .bind(
        trackingSessionId,
        userId,
        publicId,
        body.patientName ?? null,
        body.gestationalWeek ?? null,
        body.startedAt,
        body.timezone ?? null,
      )
      .run();
    sessionRow = await env.DATABASE.prepare(SELECT_USER_TRACKING_SESSION).bind(userId).first<TrackingSessionRow>();
  }

  if (!sessionRow) return jsonResponse({ error: 'failed to resolve session' }, 500);

  const session = mapTrackingSessionRow(sessionRow);

  const [{ results: contractionRows }, { results: eventRows }] = await Promise.all([
    env.DATABASE.prepare(SELECT_CONTRACTIONS_BY_USER).bind(userId).all<ContractionRow>(),
    env.DATABASE.prepare(SELECT_EVENTS_BY_USER).bind(userId).all<EventRow>(),
  ]);

  const contractions = contractionRows.map(mapContractionRow);
  const events = eventRows.map(mapEventRow);
  const stats = calculateSessionStats({ contractions, events });

  return jsonResponse({ session, contractions, events, stats });
}

async function notifyCompanions({
  env,
  publicId,
  payload,
}: {
  env: Environment;
  publicId: string;
  payload: { title: string; body: string; url: string; type: PushNotificationType };
}): Promise<void> {
  const { results: subscriptions } = await env.DATABASE.prepare(SELECT_PUSH_SUBSCRIPTIONS_BY_PUBLIC_ID)
    .bind(publicId)
    .all<PushSubscriptionRow>();

  await Promise.all(
    subscriptions.map((subscription) =>
      sendPush({
        subscription,
        payload,
        vapidPublicKey: env.VAPID_PUBLIC_KEY,
        vapidPrivateKey: env.VAPID_PRIVATE_KEY,
        vapidSubject: env.VAPID_SUBJECT,
        database: env.DATABASE,
      }),
    ),
  );
}

export async function handleSync({ request, env }: HandlerParams): Promise<Response> {
  let body: SyncBody & { authToken?: string };

  const url = new URL(request.url);
  const encodedData = url.searchParams.get('d');

  if (encodedData) {
    try {
      body = JSON.parse(decodeURIComponent(atob(encodedData)));
    } catch {
      return jsonResponse({ error: 'invalid encoded data' }, 400);
    }
  } else {
    try {
      body = await request.json<SyncBody & { authToken?: string }>();
    } catch {
      return jsonResponse({ error: 'invalid request body' }, 400);
    }
  }

  const user = await getAuthenticatedUser({ request, env, bodyAuthToken: body.authToken });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  try {
    const response = await syncUserData({ env, userId: user.id, body });

    const sessionRow = await env.DATABASE.prepare(SELECT_USER_TRACKING_SESSION).bind(user.id).first<TrackingSessionRow>();
    if (sessionRow?.public_id) {
      const hasNewFinishedContractions = body.contractions.some((contraction) => contraction.endedAt !== null);
      if (hasNewFinishedContractions) {
        notifyCompanions({
          env,
          publicId: sessionRow.public_id,
          payload: {
            title: 'Contracking',
            body: 'Nova contração registrada',
            url: `/s/${sessionRow.public_id}`,
            type: PushNotificationType.NEW_CONTRACTION,
          },
        }).catch(() => {});
      }

      const responseData = await response.clone().json<{ stats: { alertFiveOneOne: boolean } }>();
      if (responseData.stats.alertFiveOneOne) {
        notifyCompanions({
          env,
          publicId: sessionRow.public_id,
          payload: {
            title: 'Contracking',
            body: 'Padrão 5-1-1 detectado! Considere ir à maternidade.',
            url: `/s/${sessionRow.public_id}`,
            type: PushNotificationType.FIVE_ONE_ONE,
          },
        }).catch(() => {});
      }
    }

    return response;
  } catch (syncError) {
    return jsonResponse({ error: 'sync failed', details: String(syncError) }, 500);
  }
}

export async function handleGetMySession({ request, env }: HandlerParams): Promise<Response> {
  const url = new URL(request.url);
  const encodedData = url.searchParams.get('d');

  if (encodedData) {
    let body: SyncBody & { authToken?: string };
    try {
      body = JSON.parse(decodeURIComponent(atob(encodedData)));
    } catch {
      return jsonResponse({ error: 'invalid encoded data' }, 400);
    }
    const user = await getAuthenticatedUser({ request, env, bodyAuthToken: body.authToken });
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
    return syncUserData({ env, userId: user.id, body });
  }

  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  const sessionRow = await env.DATABASE.prepare(SELECT_USER_TRACKING_SESSION).bind(user.id).first<TrackingSessionRow>();
  if (!sessionRow) {
    return jsonResponse({
      session: null,
      contractions: [],
      events: [],
      stats: {
        totalContractions: 0,
        averageDuration: 0,
        averageInterval: 0,
        regularity: null,
        alertFiveOneOne: false,
        lastDilation: null,
      },
    });
  }

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

export async function handleSyncSession({ request, env }: HandlerParams): Promise<Response> {
  const user = await getAuthenticatedUser({ request, env });
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  let body: LegacySyncBody;
  try {
    body = await request.json<LegacySyncBody>();
  } catch {
    return jsonResponse({ error: 'invalid request body' }, 400);
  }

  return syncUserData({ env, userId: user.id, body });
}
