import type { Event } from '@contracking/shared';
import { EventType } from '@contracking/shared';
import type { LucideIcon } from 'lucide-react';
import { Droplets, MessageSquare, Ruler, Utensils, X } from 'lucide-react';
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

function formatEventText(event: Event): string {
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
  onDelete?: (id: string) => void;
};

export function TimelineEventItem({ event, timezone, onDelete }: TimelineEventItemProps) {
  const Icon = EVENT_ICON[event.type];
  const timeLabel = timezone
    ? formatTimeForTimezone(event.occurredAt, timezone)
    : formatTimeWithDate(new Date(event.occurredAt));

  return (
    <div
      className="flex items-center gap-2 mx-1 my-0.5 rounded-lg px-3 py-1.5"
      style={{
        background: 'rgba(217,77,115,0.04)',
        border: '1px dashed rgba(217,77,115,0.12)',
      }}
    >
      <Icon size={11} style={{ color: 'var(--accent)', flexShrink: 0, opacity: 0.6 }} />
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{formatEventText(event)}</span>
      <span style={{ fontSize: 10, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{timeLabel}</span>
      {onDelete && (
        <button type="button" onClick={() => onDelete(event.id)} style={{ color: 'var(--text-faint)' }}>
          <X size={11} />
        </button>
      )}
    </div>
  );
}
