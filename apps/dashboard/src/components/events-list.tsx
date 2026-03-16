import type { Event } from '@contracking/shared';
import { EventType } from '@contracking/shared';
import { Droplets, MessageSquare, Ruler, Utensils, X } from 'lucide-react';
import { formatTimeWithDate } from '../utils/format-date';

const EVENT_ICON = {
  [EventType.WATER_BREAK]: Droplets,
  [EventType.MEAL]: Utensils,
  [EventType.DILATION]: Ruler,
  [EventType.NOTE]: MessageSquare,
};

const EVENT_LABEL = {
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

type EventsListProps = {
  events: Event[];
  onDelete?: (id: string) => void;
};

export function EventsList({ events, onDelete }: EventsListProps) {
  if (events.length === 0) return null;

  const sortedEvents = [...events].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return (
    <div className="px-4 flex flex-col gap-1">
      <span className="uppercase tracking-wider font-semibold" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
        Eventos
      </span>
      {sortedEvents.map((event) => {
        const Icon = EVENT_ICON[event.type];
        return (
          <div
            key={event.id}
            className="flex items-center gap-2 rounded-[10px] px-3 py-2"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Icon size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{formatEventText(event)}</span>
            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTimeWithDate(new Date(event.occurredAt))}
            </span>
            {onDelete && (
              <button type="button" onClick={() => onDelete(event.id)} style={{ color: 'var(--text-faint)' }}>
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
