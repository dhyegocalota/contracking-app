import type { Contraction } from '@contracking/shared';
import { Intensity, Position } from '@contracking/shared';
import { formatTimeWithDate } from '../utils/format-date';

type TimelineItemProps = {
  contraction: Contraction;
  previousContraction: Contraction | null;
  isNew?: boolean;
  onEdit?: (contraction: Contraction) => void;
  onDelete?: (id: string) => void;
};

const DOT_COLOR: Record<Intensity, { color: string; shadow?: string }> = {
  [Intensity.MILD]: { color: 'rgba(240,98,146,0.4)' },
  [Intensity.MODERATE]: { color: 'rgba(217,77,115,0.7)' },
  [Intensity.STRONG]: { color: '#b83a5e', shadow: '0 0 4px rgba(184,58,94,0.6)' },
};

const POSITION_LABEL: Record<Position, string> = {
  [Position.LYING]: 'deitada',
  [Position.SITTING]: 'sentada',
  [Position.STANDING]: 'em pé',
  [Position.WALKING]: 'andando',
  [Position.SQUATTING]: 'cócoras',
  [Position.BALL]: 'bola',
};

const MINI_BAR_WIDTH = 2.5;
const MINI_BAR_HEIGHTS: Record<Intensity, number[]> = {
  [Intensity.MILD]: [4],
  [Intensity.MODERATE]: [4, 7],
  [Intensity.STRONG]: [4, 7, 10],
};
const MINI_MAX_BAR_HEIGHT = 10;
const MINI_BAR_GAP = 2;

const INTENSITY_LABEL: Record<Intensity, string> = {
  [Intensity.MILD]: 'leve',
  [Intensity.MODERATE]: 'moderada',
  [Intensity.STRONG]: 'forte',
};

function computeDurationSeconds(startedAt: Date | string, endedAt: Date | string | null): number | null {
  if (!endedAt) return null;
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes}min`;
  return `${minutes}m${remainingSeconds}s`;
}

function computeIntervalSeconds(contraction: Contraction, previousContraction: Contraction | null): number | null {
  if (!previousContraction?.endedAt) return null;
  return Math.round(
    (new Date(contraction.startedAt).getTime() - new Date(previousContraction.endedAt).getTime()) / 1000,
  );
}

function formatInterval(intervalSeconds: number): string {
  const minutes = Math.floor(intervalSeconds / 60);
  const seconds = intervalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}min`;
  return `${minutes}m${seconds}s`;
}

type MiniBarsProps = {
  intensity: Intensity;
};

function MiniBars({ intensity }: MiniBarsProps) {
  const heights = MINI_BAR_HEIGHTS[intensity];
  const width = heights.length * MINI_BAR_WIDTH + (heights.length - 1) * MINI_BAR_GAP;

  return (
    <svg
      role="img"
      aria-label="intensidade"
      width={width}
      height={MINI_MAX_BAR_HEIGHT}
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      {heights.map((height, index) => (
        <rect
          key={height}
          x={index * (MINI_BAR_WIDTH + MINI_BAR_GAP)}
          y={MINI_MAX_BAR_HEIGHT - height}
          width={MINI_BAR_WIDTH}
          height={height}
          rx={1}
          fill="var(--text-muted)"
        />
      ))}
    </svg>
  );
}

export function TimelineItem({ contraction, previousContraction, isNew, onEdit, onDelete: _ }: TimelineItemProps) {
  const dotConfig = contraction.intensity ? DOT_COLOR[contraction.intensity] : { color: 'var(--text-muted)' };
  const durationSeconds = computeDurationSeconds(contraction.startedAt, contraction.endedAt);
  const intervalSeconds = computeIntervalSeconds(contraction, previousContraction);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onEdit ? () => onEdit(contraction) : undefined}
        disabled={!onEdit}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          cursor: onEdit ? 'pointer' : 'default',
          animation: isNew ? 'newItem 0.4s cubic-bezier(0.22,1,0.36,1)' : undefined,
        }}
      >
        <div
          className="rounded-full flex-shrink-0"
          style={{ width: 6, height: 6, background: dotConfig.color, boxShadow: dotConfig.shadow }}
        />
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatTimeWithDate(new Date(contraction.startedAt))}
          </span>
          <div className="flex items-center gap-1.5">
            {contraction.intensity && <MiniBars intensity={contraction.intensity} />}
            {contraction.intensity && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{INTENSITY_LABEL[contraction.intensity]}</span>
            )}
            {contraction.position && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{POSITION_LABEL[contraction.position]}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {durationSeconds !== null ? formatDuration(durationSeconds) : '—'}
          </span>
          <span style={{ fontSize: 8, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            duração
          </span>
        </div>
      </button>
      {intervalSeconds !== null && (
        <div className="flex items-center gap-2 py-1.5 px-4">
          <div style={{ width: 1, height: 8, background: 'var(--divider)', marginLeft: 2 }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatInterval(intervalSeconds)} de intervalo
          </span>
        </div>
      )}
    </div>
  );
}
