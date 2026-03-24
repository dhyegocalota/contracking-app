import type { Contraction, Event, SessionStats, TrackingSession } from '@contracking/shared';
import { DateRange, EventType, POLLING_INTERVAL_MILLISECONDS, PushSubscriptionType } from '@contracking/shared';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Calendar, Clock, Droplets, Globe, MessageSquare, Ruler, User, Utensils } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchPublicSession, pollPublicSession } from '../api';
import { usePolling } from '../hooks/use-polling';
import { usePushSubscription } from '../hooks/use-push-subscription';
import { filterByDateRange } from '../utils/filter-by-date';
import { formatDuration, formatInterval } from '../utils/format-date';
import { DateRangeFilter } from './date-range-filter';
import { PublicChart } from './public-chart';
import { Skeleton } from './skeleton';
import { Timeline } from './timeline';

function getPublicIdFromPath(): string {
  const parts = window.location.pathname.split('/');
  return parts[2] ?? '';
}

function formatTime(date: Date | string, timezone: string | null): string {
  const d = new Date(date);
  if (timezone) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimezoneAbbreviation(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZoneName: 'short', timeZone: timezone }).formatToParts(
      new Date(),
    );
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
}

type PatientTagProps = {
  Icon: LucideIcon;
  label: string;
};

function PatientTag({ Icon, label }: PatientTagProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <Icon size={10} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

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

const EVENT_ICON: Record<EventType, LucideIcon> = {
  [EventType.WATER_BREAK]: Droplets,
  [EventType.MEAL]: Utensils,
  [EventType.DILATION]: Ruler,
  [EventType.NOTE]: MessageSquare,
};

function formatEventText(event: Event): string {
  if (event.type === EventType.WATER_BREAK) return 'Bolsa ruptura';
  if (event.type === EventType.MEAL) return 'Última refeição';
  if (event.type === EventType.DILATION) return `Dilatação ${event.value}`;
  return event.value ?? 'Nota';
}

type EventLogItemProps = {
  event: Event;
  timezone: string | null;
};

function EventLogItem({ event, timezone }: EventLogItemProps) {
  const Icon = EVENT_ICON[event.type];

  return (
    <div
      className="flex items-center gap-2 rounded-[10px] px-3 py-1.5 mb-0.5"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <Icon size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{formatEventText(event)}</span>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(event.occurredAt, timezone)}
      </span>
    </div>
  );
}

type PublicPageState = {
  session: TrackingSession | null;
  contractions: Contraction[];
  events: Event[];
  stats: SessionStats | null;
  loading: boolean;
  lastPollTimestamp: string;
};

const INITIAL_STATE: PublicPageState = {
  session: null,
  contractions: [],
  events: [],
  stats: null,
  loading: true,
  lastPollTimestamp: new Date().toISOString(),
};

export function PublicPage() {
  const [state, setState] = useState<PublicPageState>(INITIAL_STATE);
  const [dateRange, setDateRange] = useState<DateRange>(DateRange.TODAY);
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const publicId = getPublicIdFromPath();
  const { isSubscribed, isSupported, subscribe, unsubscribe } = usePushSubscription({
    type: PushSubscriptionType.COMPANION,
    publicId,
  });

  const handleDateRangeChange = (range: DateRange, from?: string, to?: string) => {
    setDateRange(range);
    if (from !== undefined) setCustomFrom(from || null);
    if (to !== undefined) setCustomTo(to || null);
  };

  useEffect(() => {
    fetchPublicSession(publicId)
      .then((data) => {
        setState({
          session: data.session,
          contractions: data.contractions,
          events: data.events,
          stats: data.stats,
          loading: false,
          lastPollTimestamp: new Date().toISOString(),
        });
      })
      .catch(() => setState((prev) => ({ ...prev, loading: false })));
  }, [publicId]);

  const poll = async () => {
    const data = await pollPublicSession(publicId, state.lastPollTimestamp);
    setState((prev) => {
      const existingContractionIds = new Set(prev.contractions.map((c) => c.id));
      const existingEventIds = new Set(prev.events.map((e) => e.id));
      const newContractions = data.contractions.filter((c) => !existingContractionIds.has(c.id));
      const newEvents = data.events.filter((e) => !existingEventIds.has(e.id));
      return {
        ...prev,
        contractions: [...prev.contractions, ...newContractions],
        events: [...prev.events, ...newEvents],
        stats: data.stats,
        lastPollTimestamp: new Date().toISOString(),
      };
    });
  };

  usePolling({ callback: poll, intervalMs: POLLING_INTERVAL_MILLISECONDS, enabled: !state.loading });

  if (state.loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="max-w-xl mx-auto px-4 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton width={180} height={20} />
            <Skeleton width={240} height={14} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3].map((index) => (
              <Skeleton key={index} width={80} height={28} rounded="8px" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} height={64} rounded="12px" />
            ))}
          </div>
          <Skeleton height={120} rounded="12px" />
          <div className="flex flex-col gap-1">
            {[1, 2, 3].map((index) => (
              <Skeleton key={index} height={40} rounded="10px" />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} height={52} rounded="10px" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { session, stats } = state;
  const timezone = session?.timezone ?? null;
  const timezoneAbbreviation = timezone ? formatTimezoneAbbreviation(timezone) : null;
  const sortedContractions = [...state.contractions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
  const firstContractionAt = sortedContractions[0]?.startedAt ?? null;
  const contractions = filterByDateRange({ items: state.contractions, range: dateRange, customFrom, customTo });
  const events = filterByDateRange({ items: state.events, range: dateRange, customFrom, customTo });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl mx-auto px-4 py-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Contracking
            </h1>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(217,77,115,0.1)' }}
            >
              <div
                className="rounded-full animate-pulse"
                style={{ width: 6, height: 6, background: 'var(--accent)' }}
              />
              <span style={{ fontSize: 10, color: 'var(--accent)' }}>AO VIVO</span>
            </div>
            {isSupported && (
              <button
                type="button"
                onClick={isSubscribed ? unsubscribe : subscribe}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{
                  background: isSubscribed ? 'var(--card-bg)' : 'var(--accent)',
                  color: isSubscribed ? 'var(--text-secondary)' : 'white',
                  border: isSubscribed ? '1px solid var(--card-border)' : 'none',
                }}
              >
                {isSubscribed ? 'Notificações ativas' : 'Ativar notificações'}
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sessão compartilhada · atualiza em tempo real</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {session?.patientName && <PatientTag Icon={User} label={session.patientName} />}
          {session?.gestationalWeek && <PatientTag Icon={Calendar} label={`Semana ${session.gestationalWeek}`} />}
          {firstContractionAt && (
            <PatientTag Icon={Clock} label={`Início ${formatTime(firstContractionAt, timezone)}`} />
          )}
          {timezoneAbbreviation && <PatientTag Icon={Globe} label={`Horários em ${timezoneAbbreviation}`} />}
        </div>

        <DateRangeFilter
          value={dateRange}
          customFrom={customFrom}
          customTo={customTo}
          onChange={handleDateRangeChange}
        />

        {stats?.alertFiveOneOne && (
          <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
            style={{
              background: 'rgba(255,167,38,0.08)',
              border: '1px solid rgba(255,167,38,0.15)',
            }}
          >
            <AlertTriangle size={14} style={{ color: 'rgb(255,167,38)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'rgb(255,167,38)' }}>
              Contrações a cada 5min ou menos há 1h — padrão 5-1-1
            </span>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <StatCard value={String(stats.totalContractions)} label="Total" />
            <StatCard value={formatDuration(stats.averageDuration)} label="Duração" />
            <StatCard value={formatInterval(stats.averageInterval)} label="Intervalo" />
            <StatCard value={stats.lastDilation ?? '—'} label="Dilatação" />
          </div>
        )}

        {contractions.length > 0 && <PublicChart contractions={contractions} />}

        {events.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Eventos
            </span>
            <div>
              {events.map((event) => (
                <EventLogItem key={event.id} event={event} timezone={timezone} />
              ))}
            </div>
          </div>
        )}

        <Timeline contractions={contractions} regularity={stats?.regularity ?? null} />

        <div
          className="flex flex-col items-center gap-2 py-6 mt-2 rounded-xl"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Acompanhe suas contrações em tempo real</span>
          <a
            href="/"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Usar o Contracking
          </a>
        </div>
      </div>
    </div>
  );
}
