import type { Contraction } from '@contracking/shared';
import {
  DateRange,
  EventType,
  type Intensity,
  type Position,
  PushSubscriptionType,
  SyncStatus,
} from '@contracking/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSession } from '../hooks/use-local-session';
import { useNotifications } from '../hooks/use-notifications';
import { usePushSubscription } from '../hooks/use-push-subscription';
import { useTimer } from '../hooks/use-timer';
import { getPreferences, savePreferences } from '../storage';
import { filterByDateRange } from '../utils/filter-by-date';
import { AccountSheet } from './account-sheet';
import { BottomSheet } from './bottom-sheet';
import { DateRangeFilter } from './date-range-filter';
import { DebugPanel } from './debug-panel';
import { EditContraction } from './edit-contraction';
import { EventChips } from './event-chips';
import { EventForm } from './event-form';
import { EventsList } from './events-list';
import { FiveOneOneProgress } from './five-one-one-progress';
import { Header } from './header';
import { INSTRUCTIONS_SEEN_KEY, InstructionsModal } from './instructions-modal';
import { IntensityChips } from './intensity-chips';
import { MainButton } from './main-button';
import { MetricsPage } from './metrics-page';
import { PositionChips } from './position-chips';
import { ShareModal } from './share-modal';
import { StatusBanners } from './status-banners';
import { Timeline } from './timeline';

const EMPTY_STATS = {
  totalContractions: 0,
  averageDuration: 0,
  averageInterval: 0,
  regularity: null as null,
  alertFiveOneOne: false,
  lastDilation: null,
};

type ActiveTab = 'tracking' | 'metrics';

const EVENT_TITLE: Record<EventType, string> = {
  [EventType.WATER_BREAK]: 'Ruptura de Bolsa',
  [EventType.MEAL]: 'Refeição',
  [EventType.DILATION]: 'Dilatação',
  [EventType.NOTE]: 'Nota',
};

export function TrackingPage() {
  const {
    session,
    contractions,
    events,
    stats,
    syncStatus,
    publicId,
    userEmail,
    startContraction,
    stopContraction,
    updateContraction,
    deleteContraction,
    createEvent,
    deleteEvent,
    sync,
    logout,
    refreshFromStorage,
  } = useLocalSession();
  const timer = useTimer();

  const [activeTab, setActiveTab] = useState<ActiveTab>('tracking');
  const [preferences, setPreferences] = useState(() => getPreferences());
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [editingContraction, setEditingContraction] = useState<Contraction | null>(null);
  const [activeEventType, setActiveEventType] = useState<EventType | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [feedbackRipple, setFeedbackRipple] = useState<'start' | 'stop' | null>(null);
  const [newestContractionId, setNewestContractionId] = useState<string | null>(null);
  const newestContractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timelineDateRange, setTimelineDateRange] = useState<DateRange>(DateRange.TODAY);
  const [timelineCustomFrom, setTimelineCustomFrom] = useState<string | null>(null);
  const [timelineCustomTo, setTimelineCustomTo] = useState<string | null>(null);

  const handleTimelineDateRangeChange = (range: DateRange, from?: string, to?: string) => {
    setTimelineDateRange(range);
    if (from !== undefined) setTimelineCustomFrom(from || null);
    if (to !== undefined) setTimelineCustomTo(to || null);
  };

  const filteredTimelineContractions = filterByDateRange({
    items: contractions,
    range: timelineDateRange,
    customFrom: timelineCustomFrom,
    customTo: timelineCustomTo,
  });

  useEffect(() => {
    if (!localStorage.getItem(INSTRUCTIONS_SEEN_KEY)) setInstructionsOpen(true);
  }, []);

  const unsyncedCount =
    session.contractions.filter((contraction) => contraction.syncedAt === null).length +
    session.events.filter((event) => event.syncedAt === null).length;

  const activeContraction = contractions.find((contraction) => contraction.endedAt === null) ?? null;
  const lastContraction = contractions.filter((contraction) => contraction.endedAt !== null).at(-1) ?? null;
  const lastContractionAt = lastContraction ? new Date(lastContraction.endedAt as string) : null;

  const activeContractionStartedAtMs = activeContraction?.startedAt.getTime() ?? null;

  useEffect(() => {
    if (!activeContractionStartedAtMs) return;
    if (timer.isRunning) return;
    const elapsedSeconds = Math.floor((Date.now() - activeContractionStartedAtMs) / 1000);
    timer.startFrom(elapsedSeconds);
  }, [activeContractionStartedAtMs, timer.isRunning, timer.startFrom]);

  const handleAutoStop = useCallback(
    (contractionId: string) => {
      timer.stop();
      stopContraction(contractionId);
      setNewestContractionId(contractionId);
      if (newestContractionTimerRef.current) clearTimeout(newestContractionTimerRef.current);
      newestContractionTimerRef.current = setTimeout(() => setNewestContractionId(null), 1000);
      const updatedPreferences = { ...preferences, lastIntensity: intensity, lastPosition: position };
      savePreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      if (!preferences.repeatLastIntensity) setIntensity(null);
      if (!preferences.repeatLastPosition) setPosition(null);
    },
    [timer, stopContraction, preferences, intensity, position],
  );

  const { subscribe: subscribePush } = usePushSubscription({ type: PushSubscriptionType.OWNER });

  useNotifications({ activeContraction, onAutoStop: handleAutoStop, onPermissionGranted: subscribePush });

  const isVisuallyActive = activeContraction !== null && !isStopping;

  const triggerFeedback = (type: 'start' | 'stop') => {
    setFeedbackRipple(type);
    setTimeout(() => setFeedbackRipple(null), 500);
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'start' ? 80 : [40, 30, 40]);
    }
  };

  const handleButtonPress = () => {
    if (activeContraction) {
      triggerFeedback('stop');
      setIsStopping(true);
      timer.stop();
      stopContraction(activeContraction.id);
      setNewestContractionId(activeContraction.id);
      if (newestContractionTimerRef.current) clearTimeout(newestContractionTimerRef.current);
      newestContractionTimerRef.current = setTimeout(() => setNewestContractionId(null), 1000);
      const updatedPreferences = { ...preferences, lastIntensity: intensity, lastPosition: position };
      savePreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      if (!preferences.repeatLastIntensity) setIntensity(null);
      if (!preferences.repeatLastPosition) setPosition(null);
      setIsStopping(false);
      return;
    }

    triggerFeedback('start');
    const nextIntensity = intensity ?? (preferences.repeatLastIntensity ? preferences.lastIntensity : null);
    const nextPosition = position ?? (preferences.repeatLastPosition ? preferences.lastPosition : null);
    const contractionId = startContraction();
    if (nextIntensity) updateContraction({ id: contractionId, data: { intensity: nextIntensity } });
    if (nextPosition) updateContraction({ id: contractionId, data: { position: nextPosition } });
    setIntensity(nextIntensity);
    setPosition(nextPosition);
    timer.reset();
    timer.start();
  };

  const handleIntensityChange = (value: Intensity) => {
    const nextIntensity = intensity === value ? null : value;
    setIntensity(nextIntensity);
    if (!activeContraction) return;
    updateContraction({ id: activeContraction.id, data: { intensity: nextIntensity ?? undefined } });
  };

  const handlePositionChange = (value: Position) => {
    const nextPosition = position === value ? null : value;
    setPosition(nextPosition);
    if (!activeContraction) return;
    updateContraction({ id: activeContraction.id, data: { position: nextPosition ?? undefined } });
  };

  const handleEditSave = (data: {
    startedAt: string;
    endedAt: string | null;
    intensity: Intensity | null;
    position: Position | null;
    notes: string;
  }) => {
    if (!editingContraction) return;
    updateContraction({
      id: editingContraction.id,
      data: {
        startedAt: data.startedAt,
        endedAt: data.endedAt ?? undefined,
        intensity: data.intensity ?? undefined,
        position: data.position ?? undefined,
        notes: data.notes || undefined,
      },
    });
    setEditingContraction(null);
  };

  const handleEditDelete = (id: string) => {
    deleteContraction(id);
    setEditingContraction(null);
  };

  const handleEventSubmit = (value?: string) => {
    if (!activeEventType) return;
    createEvent({ type: activeEventType, value });
    setActiveEventType(null);
  };

  const handleShareClick = () => {
    if (syncStatus === SyncStatus.NOT_AUTHENTICATED) {
      window.location.href = '/login';
      return;
    }
    setShareOpen(true);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <Header
          patientName={session.patientName}
          gestationalWeek={session.gestationalWeek}
          timezone={session.timezone}
          syncStatus={syncStatus}
          userEmail={userEmail}
          onHelpClick={() => setInstructionsOpen(true)}
          onShareClick={handleShareClick}
          onAccountClick={() => setAccountSheetOpen(true)}
          onSyncClick={sync}
        />
        <StatusBanners syncStatus={syncStatus} />
        <div className="flex mx-4 gap-1 rounded-lg p-0.5" style={{ background: 'var(--card-bg)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('tracking')}
            className="flex-1 py-1.5 rounded-md text-xs font-medium"
            style={{
              background: activeTab === 'tracking' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'tracking' ? 'white' : 'var(--text-muted)',
            }}
          >
            Contrações
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className="flex-1 py-1.5 rounded-md text-xs font-medium"
            style={{
              background: activeTab === 'metrics' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'metrics' ? 'white' : 'var(--text-muted)',
            }}
          >
            Métricas
          </button>
        </div>

        {activeTab === 'metrics' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <MetricsPage
              contractions={contractions}
              events={events}
              stats={stats ?? EMPTY_STATS}
              onDeleteEvent={deleteEvent}
              onImportComplete={refreshFromStorage}
            />
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="flex flex-col" style={{ animation: 'fadeIn 0.2s ease' }}>
            <div className="flex justify-center py-6 relative">
              <MainButton
                isActive={isVisuallyActive}
                elapsedSeconds={timer.elapsedSeconds}
                lastContractionAt={lastContractionAt}
                onPress={handleButtonPress}
              />
              {feedbackRipple && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    key={Date.now()}
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: '50%',
                      border: `2px solid ${feedbackRipple === 'start' ? 'var(--accent)' : 'var(--text-secondary)'}`,
                      animation: 'pressRipple 0.5s ease-out forwards',
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-center py-1.5">
              <IntensityChips value={intensity} onChange={handleIntensityChange} />
            </div>
            <div className="flex justify-center py-1.5">
              <PositionChips value={position} onChange={handlePositionChange} />
            </div>
            <div className="flex justify-center py-2">
              <EventChips onEventClick={setActiveEventType} />
            </div>
            <div className="flex justify-center py-1">
              <button
                type="button"
                onClick={() => {
                  const updated = {
                    ...preferences,
                    repeatLastIntensity: !preferences.repeatLastIntensity,
                    repeatLastPosition: !preferences.repeatLastPosition,
                  };
                  savePreferences(updated);
                  setPreferences(updated);
                }}
                className="flex items-center gap-2"
                style={{ color: 'var(--text-faint)', fontSize: 10 }}
              >
                <span>Salvar preferências</span>
                <span
                  style={{
                    width: 24,
                    height: 14,
                    borderRadius: 7,
                    background: preferences.repeatLastIntensity ? 'var(--accent)' : 'var(--text-faint)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0 2px',
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'white',
                      transform: preferences.repeatLastIntensity ? 'translateX(10px)' : 'translateX(0)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </span>
              </button>
            </div>
            {events.length > 0 && (
              <div className="mt-2">
                <EventsList events={events} onDelete={deleteEvent} />
              </div>
            )}
            <FiveOneOneProgress contractions={filteredTimelineContractions} />
            <div style={{ height: 1, background: 'var(--divider)', margin: '8px 16px' }} />
            <div className="px-4 pb-2">
              <DateRangeFilter
                value={timelineDateRange}
                customFrom={timelineCustomFrom}
                customTo={timelineCustomTo}
                onChange={handleTimelineDateRangeChange}
              />
            </div>
            <div className="pb-8">
              <Timeline
                contractions={filteredTimelineContractions}
                allContractions={contractions}
                regularity={stats?.regularity ?? null}
                newestContractionId={newestContractionId}
                onEdit={setEditingContraction}
                onDelete={deleteContraction}
                onDateChange={handleTimelineDateRangeChange}
              />
            </div>
          </div>
        )}
      </div>

      <BottomSheet
        isOpen={editingContraction !== null}
        onClose={() => setEditingContraction(null)}
        title="Editar contração"
      >
        {editingContraction && (
          <EditContraction
            contraction={editingContraction}
            onSave={handleEditSave}
            onDelete={handleEditDelete}
            onClose={() => setEditingContraction(null)}
          />
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={activeEventType !== null}
        onClose={() => setActiveEventType(null)}
        title={activeEventType ? EVENT_TITLE[activeEventType] : undefined}
      >
        {activeEventType && (
          <EventForm
            eventType={activeEventType}
            onSubmit={handleEventSubmit}
            onClose={() => setActiveEventType(null)}
          />
        )}
      </BottomSheet>

      <AccountSheet
        isOpen={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        userEmail={userEmail}
        syncStatus={syncStatus}
        unsyncedCount={unsyncedCount}
        totalContractions={contractions.length}
        onLogout={logout}
        onSync={sync}
      />

      <InstructionsModal isOpen={instructionsOpen} onClose={() => setInstructionsOpen(false)} />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        publicId={publicId ?? ''}
        onSync={sync}
        isAuthenticated={syncStatus !== SyncStatus.NOT_AUTHENTICATED}
      />

      <DebugPanel syncStatus={syncStatus} userEmail={userEmail} publicId={publicId} />
    </div>
  );
}
