import type { Contraction, Event } from '@contracking/shared';
import { DateRange } from '@contracking/shared';
import { formatDayHeader, formatShortDateTime, getDayKey } from '../utils/format-date';
import { TimelineEventItem } from './timeline-event-item';
import { TimelineInterval } from './timeline-interval';
import { TimelineItem } from './timeline-item';

type TimelineProps = {
  contractions: Contraction[];
  allContractions?: Contraction[];
  events?: Event[];
  regularity: 'regular' | 'irregular' | null;
  newestContractionId?: string | null;
  timezone?: string | null;
  onEdit?: (contraction: Contraction) => void;
  onDelete?: (id: string) => void;
  onEditEvent?: (event: Event) => void;
  onDateChange?: (range: DateRange) => void;
};

const REGULARITY_STYLE = {
  regular: {
    background: 'rgba(76,175,80,0.1)',
    color: 'rgba(76,175,80,0.7)',
    label: 'Regular',
  },
  irregular: {
    background: 'rgba(255,167,38,0.1)',
    color: 'rgba(255,167,38,0.7)',
    label: 'Irregular',
  },
};

type TimelineEntry = {
  kind: 'contraction' | 'event';
  id: string;
  timestamp: number;
  endTimestamp: number | null;
  contraction?: Contraction;
  event?: Event;
};

type DayGroup = {
  key: string;
  label: string;
  entries: TimelineEntry[];
};

function buildInterleavedTimeline({
  contractions,
  events,
}: {
  contractions: Contraction[];
  events: Event[];
}): TimelineEntry[] {
  const contractionEntries: TimelineEntry[] = contractions.map((contraction) => ({
    kind: 'contraction',
    id: contraction.id,
    timestamp: new Date(contraction.startedAt).getTime(),
    endTimestamp: contraction.endedAt ? new Date(contraction.endedAt).getTime() : null,
    contraction,
  }));

  const eventEntries: TimelineEntry[] = events.map((event) => ({
    kind: 'event',
    id: event.id,
    timestamp: new Date(event.occurredAt).getTime(),
    endTimestamp: new Date(event.occurredAt).getTime(),
    event,
  }));

  return [...contractionEntries, ...eventEntries].sort((a, b) => b.timestamp - a.timestamp);
}

function computeIntervalBetween(current: TimelineEntry, next: TimelineEntry): number | null {
  const nextEnd = next.endTimestamp ?? next.timestamp;
  const intervalSeconds = Math.round((current.timestamp - nextEnd) / 1000);
  if (intervalSeconds <= 0) return null;
  return intervalSeconds;
}

function groupEntriesByDay(entries: TimelineEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let currentKey = '';

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const key = getDayKey(date);
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ key, label: formatDayHeader(date), entries: [] });
    }
    groups[groups.length - 1]!.entries.push(entry);
  }

  return groups;
}

function findLastContraction(contractions: Contraction[]): Contraction | null {
  return (
    [...contractions]
      .filter((contraction) => contraction.endedAt !== null)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .at(0) ?? null
  );
}

type EmptyStateBannerProps = {
  allContractions: Contraction[];
  onDateChange?: (range: DateRange) => void;
};

function EmptyStateBanner({ allContractions, onDateChange }: EmptyStateBannerProps) {
  const lastContraction = findLastContraction(allContractions);

  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        Nenhuma contração neste período.
      </span>
      {lastContraction && onDateChange && (
        <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Última contração: {formatShortDateTime(new Date(lastContraction.startedAt))}{' '}
          <button
            type="button"
            onClick={() => onDateChange(DateRange.THIRTY_DAYS)}
            className="rounded-full px-2 py-0.5"
            style={{ fontSize: 11, background: 'var(--accent)', color: 'white' }}
          >
            Ver
          </button>
        </span>
      )}
    </div>
  );
}

export function Timeline({
  contractions,
  allContractions,
  events = [],
  regularity,
  newestContractionId,
  timezone,
  onEdit,
  onDelete,
  onEditEvent,
  onDateChange,
}: TimelineProps) {
  const finishedContractions = [...contractions]
    .filter((contraction) => contraction.endedAt !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const regularityStyle = regularity ? REGULARITY_STYLE[regularity] : null;
  const allEntries = buildInterleavedTimeline({ contractions: finishedContractions, events });
  const dayGroups = groupEntriesByDay(allEntries);

  return (
    <div className="flex flex-col gap-2 px-4">
      <div className="flex items-center justify-between">
        <span className="uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Histórico
        </span>
        {regularityStyle && (
          <span
            className="px-2 py-0.5 rounded-md"
            style={{ fontSize: 9, background: regularityStyle.background, color: regularityStyle.color }}
          >
            {regularityStyle.label}
          </span>
        )}
      </div>
      {finishedContractions.length === 0 && allContractions && (
        <EmptyStateBanner allContractions={allContractions} onDateChange={onDateChange} />
      )}
      <div>
        {dayGroups.map((group) => (
          <div key={group.key}>
            <div className="px-4 py-1 uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-faint)' }}>
              {group.label}
            </div>
            {group.entries.map((entry, index) => {
              const nextEntry = group.entries[index + 1] ?? null;
              const intervalSeconds = nextEntry ? computeIntervalBetween(entry, nextEntry) : null;

              return (
                <div key={entry.id}>
                  {entry.kind === 'event' && entry.event && (
                    <TimelineEventItem event={entry.event} timezone={timezone} onEdit={onEditEvent} />
                  )}
                  {entry.kind === 'contraction' && entry.contraction && (
                    <TimelineItem
                      contraction={entry.contraction}
                      isNew={entry.id === newestContractionId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  )}
                  {intervalSeconds !== null && <TimelineInterval seconds={intervalSeconds} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
