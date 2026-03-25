import type { Contraction } from '@contracking/shared';
import { Intensity, Position } from '@contracking/shared';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { formatDuration, formatTimeWithDate } from '../utils/format-date';

type TimelineItemProps = {
  contraction: Contraction;
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

export function TimelineItem({ contraction, isNew, onEdit, onDelete: _ }: TimelineItemProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const dotConfig = contraction.intensity ? DOT_COLOR[contraction.intensity] : { color: 'var(--text-muted)' };
  const durationSeconds = computeDurationSeconds(contraction.startedAt, contraction.endedAt);
  const hasNotes = !!contraction.notes;

  const handleClick = () => {
    if (hasNotes && !notesExpanded) {
      setNotesExpanded(true);
      return;
    }
    if (onEdit) onEdit(contraction);
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleClick}
        disabled={!onEdit && !hasNotes}
        className="w-full flex flex-col rounded-[10px] text-left"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          cursor: onEdit || hasNotes ? 'pointer' : 'default',
          animation: isNew ? 'newItem 0.4s cubic-bezier(0.22,1,0.36,1)' : undefined,
        }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
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
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  {INTENSITY_LABEL[contraction.intensity]}
                </span>
              )}
              {contraction.position && (
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{POSITION_LABEL[contraction.position]}</span>
              )}
              {hasNotes && !notesExpanded && (
                <MessageSquare size={9} style={{ color: 'var(--text-faint)', marginLeft: 2 }} />
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
        </div>
        {hasNotes && notesExpanded && (
          <div className="px-3 pb-2.5" style={{ paddingLeft: 24, animation: 'fadeSlideUp 0.2s ease' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{contraction.notes}</p>
          </div>
        )}
      </button>
    </div>
  );
}
