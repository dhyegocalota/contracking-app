import type { Contraction } from '@contracking/shared';
import {
  CONTRACTION_MAX_DURATION_SECONDS,
  CONTRACTION_TIMEOUT_SECONDS,
  CONTRACTION_WARNING_SECONDS,
} from '@contracking/shared';
import { useEffect, useRef } from 'react';

const NOTIFICATION_CHECK_INTERVAL_MILLISECONDS = 5000;

type NotificationLevel = 'timeout' | 'warning' | 'max';

type ServiceWorkerMessageType = 'CONTRACTION_STARTED' | 'CONTRACTION_STOPPED';

type UseNotificationsOptions = {
  activeContraction: Contraction | null;
  onAutoStop: (contractionId: string) => void;
};

function requestPermissionIfNeeded(): void {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(body: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification('Contracking', { body });
}

function notifyServiceWorker(type: ServiceWorkerMessageType): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({ type });
  });
}

const NOTIFICATION_BODIES: Record<NotificationLevel, string> = {
  timeout: 'Contração longa! Esqueceu de parar?',
  warning: 'Contração ativa há 3 minutos! Toque para parar.',
  max: 'Contração parada automaticamente após 5 minutos.',
};

const NOTIFICATION_THRESHOLDS: Record<NotificationLevel, number> = {
  timeout: CONTRACTION_TIMEOUT_SECONDS * 1000,
  warning: CONTRACTION_WARNING_SECONDS * 1000,
  max: CONTRACTION_MAX_DURATION_SECONDS * 1000,
};

export function useNotifications({ activeContraction, onAutoStop }: UseNotificationsOptions) {
  const notifiedLevels = useRef(new Map<string, Set<NotificationLevel>>());
  const onAutoStopRef = useRef(onAutoStop);
  onAutoStopRef.current = onAutoStop;

  useEffect(() => {
    if (!activeContraction) {
      notifyServiceWorker('CONTRACTION_STOPPED');
      return;
    }
    requestPermissionIfNeeded();
    notifyServiceWorker('CONTRACTION_STARTED');
  }, [activeContraction]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'AUTO_STOP' && activeContraction) {
        onAutoStopRef.current(activeContraction.id);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [activeContraction]);

  useEffect(() => {
    if (!activeContraction) return;

    const checkTimeout = () => {
      const elapsed = Date.now() - new Date(activeContraction.startedAt).getTime();
      const notified = notifiedLevels.current.get(activeContraction.id) ?? new Set<NotificationLevel>();

      const levels: NotificationLevel[] = ['timeout', 'warning', 'max'];
      for (const level of levels) {
        if (notified.has(level)) continue;
        if (elapsed < NOTIFICATION_THRESHOLDS[level]) continue;
        notified.add(level);
        notifiedLevels.current.set(activeContraction.id, notified);
        sendNotification(NOTIFICATION_BODIES[level]);
        if (level === 'max') onAutoStopRef.current(activeContraction.id);
      }
    };

    checkTimeout();
    const intervalId = setInterval(checkTimeout, NOTIFICATION_CHECK_INTERVAL_MILLISECONDS);
    return () => clearInterval(intervalId);
  }, [activeContraction]);
}
