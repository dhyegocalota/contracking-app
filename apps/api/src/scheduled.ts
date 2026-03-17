import type { ContractionRow, PushSubscriptionRow } from '@contracking/shared';
import {
  CONTRACTION_MAX_DURATION_SECONDS,
  CONTRACTION_TIMEOUT_SECONDS,
  CONTRACTION_WARNING_SECONDS,
  PushNotificationType,
} from '@contracking/shared';
import {
  INSERT_PUSH_NOTIFICATION_LOG,
  SELECT_ACTIVE_CONTRACTIONS_PAST_THRESHOLD,
  SELECT_PUSH_NOTIFICATION_LOG,
  SELECT_PUSH_SUBSCRIPTIONS_BY_USER,
} from './db/queries';
import type { Environment } from './types';
import { sendPush } from './utils/send-push';

type NotificationLevel = 'timeout' | 'warning' | 'max';

const NOTIFICATION_BODIES: Record<NotificationLevel, string> = {
  timeout: 'Contração longa! Esqueceu de parar?',
  warning: 'Contração ativa há 3 minutos! Toque para parar.',
  max: 'Contração parada automaticamente após 5 minutos.',
};

function getNotificationLevel(elapsedSeconds: number): NotificationLevel | null {
  if (elapsedSeconds >= CONTRACTION_MAX_DURATION_SECONDS) return 'max';
  if (elapsedSeconds >= CONTRACTION_WARNING_SECONDS) return 'warning';
  if (elapsedSeconds >= CONTRACTION_TIMEOUT_SECONDS) return 'timeout';
  return null;
}

export async function handleScheduled(env: Environment): Promise<void> {
  const thresholdTime = new Date(Date.now() - CONTRACTION_TIMEOUT_SECONDS * 1000).toISOString();
  console.log('[cron] threshold:', thresholdTime);

  const { results: activeContractions } = await env.DATABASE.prepare(SELECT_ACTIVE_CONTRACTIONS_PAST_THRESHOLD)
    .bind(thresholdTime)
    .all<ContractionRow & { public_id: string }>();

  console.log('[cron] active contractions:', activeContractions.length);

  await Promise.all(
    activeContractions.map(async (contraction) => {
      const elapsedSeconds = (Date.now() - new Date(contraction.started_at).getTime()) / 1000;
      const level = getNotificationLevel(elapsedSeconds);
      console.log('[cron] contraction', contraction.id, 'elapsed:', Math.round(elapsedSeconds), 's, level:', level);
      if (!level) return;

      const existingLog = await env.DATABASE.prepare(SELECT_PUSH_NOTIFICATION_LOG).bind(contraction.id, level).first();
      if (existingLog) {
        console.log('[cron] already notified', contraction.id, level);
        return;
      }

      const { results: subscriptions } = await env.DATABASE.prepare(SELECT_PUSH_SUBSCRIPTIONS_BY_USER)
        .bind(contraction.user_id)
        .all<PushSubscriptionRow>();

      console.log('[cron] sending push to', subscriptions.length, 'subscriptions for', level);

      const pushResults = await Promise.allSettled(
        subscriptions.map((subscription) =>
          sendPush({
            subscription,
            payload: {
              title: 'Contracking',
              body: NOTIFICATION_BODIES[level],
              url: '/',
              type: PushNotificationType.LONG_CONTRACTION,
            },
            vapidPublicKey: env.VAPID_PUBLIC_KEY,
            vapidPrivateKey: env.VAPID_PRIVATE_KEY,
            vapidSubject: env.VAPID_SUBJECT,
            database: env.DATABASE,
          }),
        ),
      );

      pushResults.forEach((result, index) => {
        if (result.status === 'rejected') console.error('[cron] push failed:', index, result.reason);
        if (result.status === 'fulfilled') console.log('[cron] push result:', index, result.value);
      });

      await env.DATABASE.prepare(INSERT_PUSH_NOTIFICATION_LOG).bind(crypto.randomUUID(), contraction.id, level).run();
      console.log('[cron] logged notification', contraction.id, level);
    }),
  );
}
