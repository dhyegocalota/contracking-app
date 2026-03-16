import { DateRange } from '@contracking/shared';

const RANGE_LABELS: Record<DateRange, string> = {
  [DateRange.TODAY]: 'Hoje',
  [DateRange.THREE_DAYS]: '3d',
  [DateRange.SEVEN_DAYS]: '7d',
  [DateRange.THIRTY_DAYS]: '30d',
  [DateRange.CUSTOM]: 'Custom',
};

const RANGES: DateRange[] = [
  DateRange.TODAY,
  DateRange.THREE_DAYS,
  DateRange.SEVEN_DAYS,
  DateRange.THIRTY_DAYS,
  DateRange.CUSTOM,
];

type DateRangeFilterProps = {
  value: DateRange;
  customFrom: string | null;
  customTo: string | null;
  onChange: (range: DateRange, from?: string, to?: string) => void;
};

export function DateRangeFilter({ value, customFrom, customTo, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            className="px-2.5 py-1 rounded-full"
            style={{
              fontSize: 10,
              background: value === range ? 'var(--accent)' : 'var(--card-bg)',
              color: value === range ? 'white' : 'var(--text-muted)',
              border: value === range ? 'none' : '1px solid var(--card-border)',
            }}
          >
            {RANGE_LABELS[range]}
          </button>
        ))}
      </div>
      {value === DateRange.CUSTOM && (
        <div className="flex gap-2">
          <input
            type="date"
            value={customFrom ?? ''}
            onChange={(event) => onChange(DateRange.CUSTOM, event.target.value, customTo ?? undefined)}
            className="flex-1 px-2 py-1 rounded-lg text-sm"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)',
            }}
          />
          <input
            type="date"
            value={customTo ?? ''}
            onChange={(event) => onChange(DateRange.CUSTOM, customFrom ?? undefined, event.target.value)}
            className="flex-1 px-2 py-1 rounded-lg text-sm"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)',
            }}
          />
        </div>
      )}
    </div>
  );
}
