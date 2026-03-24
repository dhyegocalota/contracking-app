import type { Contraction, Event } from '@contracking/shared';
import { DateRange } from '@contracking/shared';
import { formatDayHeader, formatShortDateTime, getDayKey } from '../utils/format-date';
import { TimelineEventItem } from './timeline-event-item';
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
  onDeleteEvent?: (id: string) => void;
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

type TimelineEntry =
  | { kind: 'contraction'; item: Contraction; previous: Contraction | null }
  | { kind: 'event'; item: Event };

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
  const contractionEntries: { timestamp: number; entry: TimelineEntry }[] = contractions.map((contraction, index) => ({
    timestamp: new Date(contraction.startedAt).getTime(),
    entry: { kind: 'contraction', item: contraction, previous: contractions[index + 1] ?? null },
  }));

  const eventEntries: { timestamp: number; entry: TimelineEntry }[] = events.map((event) => ({
    timestamp: new Date(event.occurredAt).getTime(),
    entry: { kind: 'event', item: event },
  }));

  return [...contractionEntries, ...eventEntries].sort((a, b) => b.timestamp - a.timestamp).map((item) => item.entry);
}

function groupEntriesByDay(entries: TimelineEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let currentKey = '';

  for (const entry of entries) {
    const date = entry.kind === 'contraction' ? new Date(entry.item.startedAt) : new Date(entry.item.occurredAt);
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
  onDeleteEvent,
  onDateChange,
}: TimelineProps) {
  const finishedContractions = [...contractions]
    .filter((contraction) => contraction.endedAt !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const regularityStyle = regularity ? REGULARITY_STYLE[regularity] : null;
  const entries = buildInterleavedTimeline({ contractions: finishedContractions, events });
  const dayGroups = groupEntriesByDay(entries);

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
            {group.entries.map((entry) => {
              if (entry.kind === 'event') {
                return (
                  <TimelineEventItem
                    key={entry.item.id}
                    event={entry.item}
                    timezone={timezone}
                    onDelete={onDeleteEvent}
                  />
                );
              }
              return (
                <TimelineItem
                  key={entry.item.id}
                  contraction={entry.item}
                  previousContraction={entry.previous}
                  isNew={entry.item.id === newestContractionId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
