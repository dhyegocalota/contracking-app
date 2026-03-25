import { useCallback, useEffect, useRef, useState } from 'react';

const WAKE_LOCK_ENABLED_KEY = 'contracking_wake_lock_enabled';

export function useWakeLock() {
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem(WAKE_LOCK_ENABLED_KEY) === '1');
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const isSupported = 'wakeLock' in navigator;

  const acquire = useCallback(async () => {
    if (!isSupported) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => setIsActive(false));
      setIsActive(true);
    } catch {
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setIsActive(false);
  }, []);

  const enable = useCallback(async () => {
    localStorage.setItem(WAKE_LOCK_ENABLED_KEY, '1');
    setIsEnabled(true);
    await acquire();
  }, [acquire]);

  const disable = useCallback(() => {
    localStorage.setItem(WAKE_LOCK_ENABLED_KEY, '0');
    setIsEnabled(false);
    release();
  }, [release]);

  useEffect(() => {
    if (!isEnabled) return;
    acquire();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEnabled, acquire, release]);

  return { isSupported, isEnabled, isActive, enable, disable };
}
