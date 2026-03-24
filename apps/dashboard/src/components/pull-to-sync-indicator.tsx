import { RefreshCw } from 'lucide-react';

const THRESHOLD_PIXELS = 80;

type PullToSyncIndicatorProps = {
  pullDistance: number;
  isSyncing: boolean;
};

export function PullToSyncIndicator({ pullDistance, isSyncing }: PullToSyncIndicatorProps) {
  const isVisible = pullDistance > 0 || isSyncing;
  if (!isVisible) return null;

  const progress = Math.min(pullDistance / THRESHOLD_PIXELS, 1);
  const rotation = progress * 360;
  const isReady = progress >= 1;

  return (
    <div
      className="flex justify-center overflow-hidden"
      style={{
        height: pullDistance,
        transition: isSyncing ? 'height 0.3s ease' : 'none',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          opacity: Math.min(progress * 1.5, 1),
        }}
      >
        <RefreshCw
          size={18}
          style={{
            color: isReady || isSyncing ? 'var(--accent)' : 'var(--text-muted)',
            transform: `rotate(${rotation}deg)`,
            transition: isSyncing ? 'none' : 'color 0.2s',
            animation: isSyncing ? 'spin 0.8s linear infinite' : undefined,
          }}
        />
      </div>
    </div>
  );
}
