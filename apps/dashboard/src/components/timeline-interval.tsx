import { formatInterval } from '../utils/format-date';

type TimelineIntervalProps = {
  seconds: number;
};

export function TimelineInterval({ seconds }: TimelineIntervalProps) {
  return (
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
        {formatInterval(seconds)} de intervalo
      </span>
    </div>
  );
}
