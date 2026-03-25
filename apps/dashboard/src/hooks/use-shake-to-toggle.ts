import { useCallback, useEffect, useRef, useState } from 'react';

const SHAKE_ENABLED_KEY = 'contracking_shake_enabled';
const SHAKE_THRESHOLD = 30;
const SHAKE_HITS_REQUIRED = 3;
const SHAKE_WINDOW_MILLISECONDS = 800;
const SHAKE_COOLDOWN_MILLISECONDS = 2000;

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

type UseShakeToToggleParams = {
  onShake: () => void;
};

export function useShakeToToggle({ onShake }: UseShakeToToggleParams) {
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem(SHAKE_ENABLED_KEY) === '1');
  const lastShakeRef = useRef(0);
  const hitsRef = useRef<number[]>([]);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const isSupported = 'DeviceMotionEvent' in window;
  const needsPermission = !!(DeviceMotionEvent as DeviceMotionEventWithPermission).requestPermission;

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const MotionEvent = DeviceMotionEvent as DeviceMotionEventWithPermission;
    if (!MotionEvent.requestPermission) return true;
    try {
      const result = await MotionEvent.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    if (needsPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }
    localStorage.setItem(SHAKE_ENABLED_KEY, '1');
    setIsEnabled(true);
    return true;
  }, [needsPermission, requestPermission]);

  const disable = useCallback(() => {
    localStorage.setItem(SHAKE_ENABLED_KEY, '0');
    setIsEnabled(false);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    if (!isSupported) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const magnitude = Math.sqrt((acceleration.x ?? 0) ** 2 + (acceleration.y ?? 0) ** 2 + (acceleration.z ?? 0) ** 2);
      if (magnitude < SHAKE_THRESHOLD) return;

      const now = Date.now();
      const isCooldown = now - lastShakeRef.current < SHAKE_COOLDOWN_MILLISECONDS;
      if (isCooldown) return;

      hitsRef.current = hitsRef.current.filter((timestamp) => now - timestamp < SHAKE_WINDOW_MILLISECONDS);
      hitsRef.current.push(now);

      if (hitsRef.current.length < SHAKE_HITS_REQUIRED) return;

      hitsRef.current = [];
      lastShakeRef.current = now;
      onShakeRef.current();
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isEnabled, isSupported]);

  return { isSupported, isEnabled, needsPermission, enable, disable };
}
