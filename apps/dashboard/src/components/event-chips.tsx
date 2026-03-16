import { EventType } from '@contracking/shared';
import type { LucideIcon } from 'lucide-react';
import { Droplets, MessageSquare, Ruler, Utensils } from 'lucide-react';

type EventChipsProps = {
  onEventClick: (eventType: EventType) => void;
};

type EventChipConfig = {
  Icon: LucideIcon;
  label: string;
};

const EVENT_CONFIG: Record<EventType, EventChipConfig> = {
  [EventType.WATER_BREAK]: { Icon: Droplets, label: 'Bolsa' },
  [EventType.MEAL]: { Icon: Utensils, label: 'Refeição' },
  [EventType.DILATION]: { Icon: Ruler, label: 'Dilatação' },
  [EventType.NOTE]: { Icon: MessageSquare, label: 'Nota' },
};

const ICON_SIZE = 11;

type EventChipProps = {
  eventType: EventType;
  onPress: (eventType: EventType) => void;
};

function EventChip({ eventType, onPress }: EventChipProps) {
  const { Icon, label } = EVENT_CONFIG[eventType];

  return (
    <button
      type="button"
      onClick={() => onPress(eventType)}
      className="flex items-center rounded-lg px-2.5 gap-1.5"
      style={{
        height: 28,
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <Icon size={ICON_SIZE} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
    </button>
  );
}

export function EventChips({ onEventClick }: EventChipsProps) {
  return (
    <div className="flex gap-2">
      {Object.values(EventType).map((eventType) => (
        <EventChip key={eventType} eventType={eventType} onPress={onEventClick} />
      ))}
    </div>
  );
}
