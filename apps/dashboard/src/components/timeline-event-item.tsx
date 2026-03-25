import type { Event } from '@contracking/shared';
import { EventType } from '@contracking/shared';
import type { LucideIcon } from 'lucide-react';
import { Droplets, MessageSquare, Ruler, Utensils } from 'lucide-react';
import { formatTimeWithDate } from '../utils/format-date';

const EVENT_ICON: Record<EventType, LucideIcon> = {
  [EventType.WATER_BREAK]: Droplets,
  [EventType.MEAL]: Utensils,
  [EventType.DILATION]: Ruler,
  [EventType.NOTE]: MessageSquare,
};

const EVENT_LABEL: Record<EventType, string> = {
  [EventType.WATER_BREAK]: 'Bolsa',
  [EventType.MEAL]: 'Refeição',
  [EventType.DILATION]: 'Dilatação',
  [EventType.NOTE]: 'Nota',
};

const EVENT_DOT_COLOR = 'rgba(217,77,115,0.35)';

export function formatEventText(event: Event): string {
  if (event.type === EventType.DILATION) return `${EVENT_LABEL[event.type]} ${event.value}cm`;
  if (event.value) return `${EVENT_LABEL[event.type]}: ${event.value}`;
  return EVENT_LABEL[event.type];
}

function formatTimeForTimezone(date: Date | string, timezone: string | null): string {
  const d = new Date(date);
  if (timezone) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  }
  return formatTimeWithDate(d);
}

type TimelineEventItemProps = {
  event: Event;
  timezone?: string | null;
  onEdit?: (event: Event) => void;
};

export function TimelineEventItem({ event, timezone, onEdit }: TimelineEventItemProps) {
  const Icon = EVENT_ICON[event.type];
  const timeLabel = timezone
    ? formatTimeForTimezone(event.occurredAt, timezone)
    : formatTimeWithDate(new Date(event.occurredAt));

  return (
    <button
      type="button"
      onClick={onEdit ? () => onEdit(event) : undefined}
      disabled={!onEdit}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        cursor: onEdit ? 'pointer' : 'default',
      }}
    >
      <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: EVENT_DOT_COLOR }} />
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {timeLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <Icon size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{EVENT_LABEL[event.type]}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {event.value ?? '—'}
        </span>
        <span style={{ fontSize: 8, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          evento
        </span>
      </div>
    </button>
  );
}
