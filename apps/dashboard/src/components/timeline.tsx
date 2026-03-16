import type { Contraction } from '@contracking/shared';
import { DateRange } from '@contracking/shared';
import { formatDayHeader, formatShortDateTime, getDayKey } from '../utils/format-date';
import { TimelineItem } from './timeline-item';

type TimelineProps = {
  contractions: Contraction[];
  allContractions?: Contraction[];
  regularity: 'regular' | 'irregular' | null;
  onEdit?: (contraction: Contraction) => void;
  onDelete?: (id: string) => void;
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

type DayGroup = {
  key: string;
  label: string;
  contractions: Contraction[];
};

function groupByDay(contractions: Contraction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let currentKey = '';

  for (const contraction of contractions) {
    const date = new Date(contraction.startedAt);
    const key = getDayKey(date);
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ key, label: formatDayHeader(date), contractions: [] });
    }
    groups[groups.length - 1].contractions.push(contraction);
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

export function Timeline({ contractions, allContractions, regularity, onEdit, onDelete, onDateChange }: TimelineProps) {
  const sorted = [...contractions]
    .filter((contraction) => contraction.endedAt !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const regularityStyle = regularity ? REGULARITY_STYLE[regularity] : null;
  const dayGroups = groupByDay(sorted);

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
      {sorted.length === 0 && allContractions && (
        <EmptyStateBanner allContractions={allContractions} onDateChange={onDateChange} />
      )}
      <div>
        {dayGroups.map((group) => (
          <div key={group.key}>
            <div className="px-4 py-1 uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-faint)' }}>
              {group.label}
            </div>
            {group.contractions.map((contraction, index) => {
              const previousContraction = group.contractions[index + 1] ?? null;
              return (
                <TimelineItem
                  key={contraction.id}
                  contraction={contraction}
                  previousContraction={previousContraction}
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
