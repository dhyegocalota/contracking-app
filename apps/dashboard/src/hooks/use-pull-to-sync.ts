import { useCallback, useRef, useState } from 'react';

const PULL_THRESHOLD_PIXELS = 80;
const MAX_PULL_PIXELS = 120;
const RESET_DELAY_MILLISECONDS = 600;

type UsePullToSyncParams = {
  onSync: () => Promise<unknown>;
  enabled?: boolean;
};

type UsePullToSyncResult = {
  pullDistance: number;
  isSyncing: boolean;
  handlers: {
    onTouchStart: (event: React.TouchEvent) => void;
    onTouchMove: (event: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
};

export function usePullToSync({ onSync, enabled = true }: UsePullToSyncParams): UsePullToSyncResult {
  const [pullDistance, setPullDistance] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) return;
      if (isSyncing) return;
      if (window.scrollY > 0) return;
      startYRef.current = event.touches[0]!.clientY;
      pullingRef.current = false;
    },
    [enabled, isSyncing],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) return;
      if (isSyncing) return;
      if (window.scrollY > 0) {
        setPullDistance(0);
        pullingRef.current = false;
        return;
      }

      const currentY = event.touches[0]!.clientY;
      const delta = currentY - startYRef.current;

      if (delta <= 0) {
        setPullDistance(0);
        pullingRef.current = false;
        return;
      }

      pullingRef.current = true;
      const dampened = Math.min(delta * 0.5, MAX_PULL_PIXELS);
      setPullDistance(dampened);
    },
    [enabled, isSyncing],
  );

  const handleTouchEnd = useCallback(() => {
    if (!pullingRef.current) return;

    if (pullDistance >= PULL_THRESHOLD_PIXELS) {
      setIsSyncing(true);
      setPullDistance(PULL_THRESHOLD_PIXELS * 0.5);
      onSync().finally(() => {
        setIsSyncing(false);
        setPullDistance(0);
      });
      return;
    }

    setPullDistance(0);
    setTimeout(() => {
      pullingRef.current = false;
    }, RESET_DELAY_MILLISECONDS);
  }, [pullDistance, onSync]);

  return {
    pullDistance,
    isSyncing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
