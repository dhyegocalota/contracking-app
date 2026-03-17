import { PUSH_SUBSCRIPTION_STORAGE_KEY, type PushSubscriptionType } from '@contracking/shared';
import { useCallback, useEffect, useState } from 'react';
import { fetchVapidKey, subscribePush, unsubscribePush } from '../api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

type UsePushSubscriptionOptions = {
  type: PushSubscriptionType;
  publicId?: string;
  turnstileToken?: string;
};

export function usePushSubscription({ type, publicId, turnstileToken }: UsePushSubscriptionOptions) {
  const [isSubscribed, setIsSubscribed] = useState(() => localStorage.getItem(PUSH_SUBSCRIPTION_STORAGE_KEY) === type);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('PushManager' in window && 'serviceWorker' in navigator);
  }, []);

  const subscribe = useCallback(async () => {
    if (!('PushManager' in window)) return;
    if (localStorage.getItem(PUSH_SUBSCRIPTION_STORAGE_KEY) === type) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const { publicKey } = await fetchVapidKey();
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const subscriptionJson = subscription.toJSON();
    await subscribePush({
      endpoint: subscriptionJson.endpoint!,
      keys: {
        p256dh: subscriptionJson.keys!.p256dh!,
        auth: subscriptionJson.keys!.auth!,
      },
      type,
      publicId,
      turnstileToken,
    });

    localStorage.setItem(PUSH_SUBSCRIPTION_STORAGE_KEY, type);
    setIsSubscribed(true);
  }, [type, publicId, turnstileToken]);

  const unsubscribe = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const subscriptionJson = subscription.toJSON();
    await unsubscribePush({
      endpoint: subscriptionJson.endpoint!,
      authKey: subscriptionJson.keys!.auth!,
    });

    await subscription.unsubscribe();
    localStorage.removeItem(PUSH_SUBSCRIPTION_STORAGE_KEY);
    setIsSubscribed(false);
  }, []);

  return { isSubscribed, isSupported, subscribe, unsubscribe };
}
