import type { Contraction } from '@contracking/shared';
import {
  FIVE_ONE_ONE_DURATION_THRESHOLD_SECONDS,
  FIVE_ONE_ONE_INTERVAL_THRESHOLD_SECONDS,
  FIVE_ONE_ONE_MIN_CONTRACTIONS,
  FIVE_ONE_ONE_WINDOW_SECONDS,
} from '@contracking/shared';
import { formatDuration } from '../utils/format-date';

type FiveOneOneProgressProps = {
  contractions: Contraction[];
};

const MET_COLOR = 'var(--accent)';
const MET_BACKGROUND = 'rgba(217,77,115,0.08)';
const MET_BORDER = 'rgba(217,77,115,0.15)';

function getContractionsFromLastHour(contractions: Contraction[]): Contraction[] {
  const oneHourAgo = Date.now() - FIVE_ONE_ONE_WINDOW_SECONDS * 1000;
  return contractions.filter(
    (contraction) => contraction.endedAt !== null && new Date(contraction.startedAt).getTime() >= oneHourAgo,
  );
}

function computeProgress(lastHourContractions: Contraction[]): {
  count: number;
  intervalMinutes: number | null;
  durationSeconds: number | null;
  intervalMet: boolean;
  durationMet: boolean;
  countMet: boolean;
} {
  const count = lastHourContractions.length;
  const countMet = count >= FIVE_ONE_ONE_MIN_CONTRACTIONS;

  if (count < 2) {
    return { count, intervalMinutes: null, durationSeconds: null, intervalMet: false, durationMet: false, countMet };
  }

  const sorted = [...lastHourContractions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  const intervals = sorted
    .slice(1)
    .map(
      (contraction, index) =>
        (new Date(contraction.startedAt).getTime() - new Date(sorted[index]!.startedAt).getTime()) / 1000,
    );
  const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;

  const averageDuration =
    sorted
      .map(
        (contraction) => (new Date(contraction.endedAt!).getTime() - new Date(contraction.startedAt).getTime()) / 1000,
      )
      .reduce((sum, value) => sum + value, 0) / sorted.length;

  return {
    count,
    intervalMinutes: Math.round(averageInterval / 60),
    durationSeconds: Math.round(averageDuration),
    intervalMet: averageInterval <= FIVE_ONE_ONE_INTERVAL_THRESHOLD_SECONDS,
    durationMet: averageDuration >= FIVE_ONE_ONE_DURATION_THRESHOLD_SECONDS,
    countMet,
  };
}

type CriterionProps = {
  label: string;
  value: string;
  met: boolean;
};

function Criterion({ label, value, met }: CriterionProps) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 flex-1 rounded-lg py-1.5"
      style={{
        background: met ? MET_BACKGROUND : 'var(--card-bg)',
        border: `1px solid ${met ? MET_BORDER : 'var(--card-border)'}`,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: met ? MET_COLOR : 'var(--text-secondary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 8,
          color: met ? MET_COLOR : 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function FiveOneOneProgress({ contractions }: FiveOneOneProgressProps) {
  const lastHourContractions = getContractionsFromLastHour(contractions);
  const progress = computeProgress(lastHourContractions);

  if (progress.count < 2) return null;

  const allMet = progress.intervalMet && progress.durationMet && progress.countMet;
  const metCount = [progress.intervalMet, progress.durationMet, progress.countMet].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-1.5 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Regra 5-1-1
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>última hora</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-md"
          style={{
            fontSize: 9,
            background: allMet ? MET_BACKGROUND : 'var(--card-bg)',
            color: allMet ? MET_COLOR : 'var(--text-muted)',
          }}
        >
          {metCount}/3
        </span>
      </div>
      <div className="flex gap-2">
        <Criterion
          label={`Intervalo (\u2264${FIVE_ONE_ONE_INTERVAL_THRESHOLD_SECONDS / 60}min)`}
          value={progress.intervalMinutes !== null ? formatDuration(progress.intervalMinutes * 60) : '—'}
          met={progress.intervalMet}
        />
        <Criterion
          label={`Duração (\u2265${FIVE_ONE_ONE_DURATION_THRESHOLD_SECONDS}s)`}
          value={progress.durationSeconds !== null ? formatDuration(progress.durationSeconds) : '—'}
          met={progress.durationMet}
        />
        <Criterion
          label={`Contrações (\u2265${FIVE_ONE_ONE_MIN_CONTRACTIONS})`}
          value={String(progress.count)}
          met={progress.countMet}
        />
      </div>
    </div>
  );
}
