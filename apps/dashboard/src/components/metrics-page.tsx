import type { Contraction, Event } from '@contracking/shared';
import { calculateSessionStats, DateRange } from '@contracking/shared';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { filterByDateRange } from '../utils/filter-by-date';
import { formatDuration, formatInterval, formatShortDateTime } from '../utils/format-date';
import { DateRangeFilter } from './date-range-filter';
import { ExportImport } from './export-import';
import { PublicChart } from './public-chart';
import { Timeline } from './timeline';

type StatCardProps = {
  value: string;
  label: string;
};

function StatCard({ value, label }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-2.5 text-center"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="uppercase tracking-wider" style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

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

type MetricsEmptyStateBannerProps = {
  contractions: Contraction[];
  onDateRangeChange: (range: DateRange) => void;
};

function MetricsEmptyStateBanner({ contractions, onDateRangeChange }: MetricsEmptyStateBannerProps) {
  const lastContraction =
    [...contractions]
      .filter((contraction) => contraction.endedAt !== null)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .at(0) ?? null;

  return (
    <div className="flex flex-col items-center gap-2 py-6 mx-4">
      <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        Nenhuma contração neste período.
      </span>
      {lastContraction && (
        <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Última contração: {formatShortDateTime(new Date(lastContraction.startedAt))}{' '}
          <button
            type="button"
            onClick={() => onDateRangeChange(DateRange.THIRTY_DAYS)}
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

type MetricsPageProps = {
  contractions: Contraction[];
  events: Event[];
  onEditEvent?: (event: Event) => void;
  onImportComplete: () => void;
};

export function MetricsPage({ contractions, events, onEditEvent, onImportComplete }: MetricsPageProps) {
  const [dateRange, setDateRange] = useState<DateRange>(DateRange.TODAY);
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);

  const handleDateRangeChange = (range: DateRange, from?: string, to?: string) => {
    setDateRange(range);
    if (range === DateRange.CUSTOM) {
      if (from !== undefined) setCustomFrom(from || null);
      if (to !== undefined) setCustomTo(to || null);
      return;
    }
    const today = new Date();
    const toDate = today.toISOString().slice(0, 10);
    const daysMap: Partial<Record<DateRange, number>> = {
      [DateRange.TODAY]: 0,
      [DateRange.THREE_DAYS]: 3,
      [DateRange.SEVEN_DAYS]: 7,
      [DateRange.THIRTY_DAYS]: 30,
    };
    const days = daysMap[range] ?? 0;
    const fromDate = new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10);
    setCustomFrom(fromDate);
    setCustomTo(toDate);
  };

  const filteredContractions = filterByDateRange({ items: contractions, range: dateRange, customFrom, customTo });
  const filteredEvents = filterByDateRange({ items: events, range: dateRange, customFrom, customTo });
  const stats = calculateSessionStats({ contractions: filteredContractions, events: filteredEvents });
  const regularityStyle = stats.regularity ? REGULARITY_STYLE[stats.regularity] : null;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="mx-4">
        <DateRangeFilter
          value={dateRange}
          customFrom={customFrom}
          customTo={customTo}
          onChange={handleDateRangeChange}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 mx-4">
        <StatCard value={String(stats.totalContractions)} label="Total" />
        <StatCard value={formatDuration(stats.averageDuration)} label="Duração" />
        <StatCard value={formatInterval(stats.averageInterval)} label="Intervalo" />
        <StatCard value={stats.lastDilation ?? '—'} label="Dilatação" />
      </div>

      {regularityStyle && (
        <div className="mx-4 flex items-center justify-end">
          <span
            className="px-2.5 py-1 rounded-md"
            style={{ fontSize: 10, background: regularityStyle.background, color: regularityStyle.color }}
          >
            {regularityStyle.label}
          </span>
        </div>
      )}

      {stats.alertFiveOneOne && (
        <div
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mx-4"
          style={{
            background: 'rgba(255,167,38,0.08)',
            border: '1px solid rgba(255,167,38,0.15)',
          }}
        >
          <AlertTriangle size={14} style={{ color: 'rgb(255,167,38)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgb(255,167,38)' }}>Padrão 5-1-1 detectado na última hora</span>
        </div>
      )}

      {filteredContractions.length === 0 && (
        <MetricsEmptyStateBanner contractions={contractions} onDateRangeChange={handleDateRangeChange} />
      )}

      {filteredContractions.length > 0 && (
        <>
          <div className="mx-4">
            <PublicChart contractions={filteredContractions} />
          </div>

          <Timeline
            contractions={filteredContractions}
            allContractions={contractions}
            events={filteredEvents}
            regularity={stats.regularity}
            onEditEvent={onEditEvent}
            onDateChange={handleDateRangeChange}
          />
        </>
      )}

      <div className="mx-4">
        <ExportImport onImportComplete={onImportComplete} />
      </div>
    </div>
  );
}
