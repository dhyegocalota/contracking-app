import type { SessionStats } from '@contracking/shared';
import { formatDuration, formatInterval } from '../utils/format-date';

type StatusBarProps = {
  stats: SessionStats;
};

type StatItemProps = {
  value: string;
  label: string;
};

function StatItem({ value, label }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
      <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

export function StatusBar({ stats }: StatusBarProps) {
  return (
    <div
      className="flex justify-around items-center mx-4 py-2.5 px-4 rounded-[14px]"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <StatItem value={String(stats.totalContractions)} label="contrações" />
      <StatItem value={formatDuration(stats.averageDuration)} label="duração" />
      <StatItem value={formatInterval(stats.averageInterval)} label="intervalo" />
    </div>
  );
}
