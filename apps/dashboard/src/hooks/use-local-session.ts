import type {
  Contraction,
  Event,
  EventType,
  Intensity,
  Position,
  SessionResponse,
  SessionStats,
} from '@contracking/shared';
import {
  AUTH_TOKEN_STORAGE_KEY,
  calculateSessionStats,
  LOCAL_SESSION_STORAGE_KEY,
  SYNC_INTERVAL_MILLISECONDS,
  SyncStatus,
} from '@contracking/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { logout as apiLogout, fetchCurrentUser } from '../api';
import {
  addLocalContraction,
  addLocalEvent,
  createLocalSession,
  deleteLocalContraction,
  deleteLocalEvent,
  getLocalSession,
  type LocalSession,
  saveLocalSession,
  updateLocalContraction,
} from '../storage';
import { mergeWithCloud, pullFromCloud, pushToCloud } from '../sync';

const PLACEHOLDER_USER_ID = 'local';

function toContraction(local: {
  id: string;
  startedAt: string;
  endedAt: string | null;
  intensity: Intensity | null;
  position: Position | null;
  notes: string | null;
}): Contraction {
  return {
    id: local.id,
    userId: PLACEHOLDER_USER_ID,
    startedAt: new Date(local.startedAt),
    endedAt: local.endedAt ? new Date(local.endedAt) : null,
    intensity: local.intensity,
    position: local.position,
    notes: local.notes,
  };
}

function toEvent(local: { id: string; type: EventType; value: string | null; occurredAt: string }): Event {
  return {
    id: local.id,
    userId: PLACEHOLDER_USER_ID,
    type: local.type,
    value: local.value,
    occurredAt: new Date(local.occurredAt),
  };
}

function determineUnsyncedStatus(session: LocalSession | null): SyncStatus {
  const hasUnsynced =
    session?.contractions.some((contraction) => contraction.syncedAt === null) ||
    session?.events.some((event) => event.syncedAt === null);
  return hasUnsynced ? SyncStatus.UNSYNCED : SyncStatus.SYNCED;
}

export function useLocalSession() {
  const [localSession, setLocalSession] = useState<LocalSession>(() => getLocalSession() ?? createLocalSession());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    const hasToken = !!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (hasToken) return SyncStatus.UNSYNCED;
    if (!navigator.onLine) return SyncStatus.OFFLINE;
    return SyncStatus.NOT_AUTHENTICATED;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const publicId = localSession.publicId ?? null;
  const contractions = localSession.contractions.map((contraction) => toContraction(contraction));
  const events = localSession.events.map((event) => toEvent(event));
  const stats: SessionStats = calculateSessionStats({ contractions, events });

  const refreshFromStorage = useCallback(() => {
    const stored = getLocalSession();
    if (stored) setLocalSession(stored);
  }, []);

  const handleStartContraction = useCallback(() => {
    const now = new Date().toISOString();
    const contraction = {
      id: crypto.randomUUID(),
      startedAt: now,
      endedAt: null,
      intensity: null,
      position: null,
      notes: null,
      syncedAt: null,
      updatedAt: now,
    };
    addLocalContraction(contraction);
    refreshFromStorage();
    return contraction.id;
  }, [refreshFromStorage]);

  const handleStopContraction = useCallback(
    (id: string) => {
      updateLocalContraction({ id, data: { endedAt: new Date().toISOString(), syncedAt: null } });
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const handleUpdateContraction = useCallback(
    ({ id, data }: { id: string; data: { intensity?: Intensity; position?: Position; notes?: string } }) => {
      updateLocalContraction({ id, data: { ...data, syncedAt: null } });
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const handleDeleteContraction = useCallback(
    (id: string) => {
      deleteLocalContraction(id);
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const handleCreateEvent = useCallback(
    ({ type, value }: { type: EventType; value?: string }) => {
      const now = new Date().toISOString();
      const event = {
        id: crypto.randomUUID(),
        type,
        value: value ?? null,
        occurredAt: now,
        syncedAt: null,
        updatedAt: now,
      };
      addLocalEvent(event);
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const handleDeleteEvent = useCallback(
    (id: string) => {
      deleteLocalEvent(id);
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const handleSync = useCallback(async () => {
    if (syncingRef.current) return null;
    if (!navigator.onLine) {
      setSyncStatus(SyncStatus.OFFLINE);
      return null;
    }
    syncingRef.current = true;
    setSyncStatus(SyncStatus.SYNCING);
    try {
      const local = getLocalSession();
      if (!local) return null;

      let cloudState: SessionResponse | null = null;
      const syncLog: Record<string, unknown> = { at: new Date().toISOString() };

      try {
        cloudState = await pushToCloud(local);
        syncLog.push = { ok: true, contractions: cloudState.contractions.length };
      } catch (pushError) {
        syncLog.push = { error: (pushError as Error).message };
        try {
          cloudState = await pullFromCloud();
          syncLog.pull = { ok: true, contractions: cloudState?.contractions.length ?? 0 };
        } catch (pullError) {
          syncLog.pull = { error: (pullError as Error).message };
        }
      }

      if (cloudState) {
        const afterSync = getLocalSession();
        if (afterSync) {
          const merged = mergeWithCloud(afterSync, cloudState);
          merged.publicId = cloudState.session.publicId;
          merged.tombstones = [];
          const cloudContractionIds = new Set(cloudState.contractions.map((c) => c.id));
          const cloudEventIds = new Set(cloudState.events.map((e) => e.id));
          const syncedAt = new Date().toISOString();
          merged.contractions = merged.contractions.map((c) =>
            cloudContractionIds.has(c.id) ? { ...c, syncedAt } : c,
          );
          merged.events = merged.events.map((e) => (cloudEventIds.has(e.id) ? { ...e, syncedAt } : e));
          saveLocalSession(merged);
          syncLog.merged = {
            contractions: merged.contractions.length,
            unsynced: merged.contractions.filter((c) => c.syncedAt === null).length,
          };
        }
      }

      localStorage.setItem('contracking_debug_sync', JSON.stringify(syncLog));
      refreshFromStorage();
      setIsAuthenticated(true);
      setSyncStatus(determineUnsyncedStatus(getLocalSession()));
      return cloudState;
    } catch (syncError) {
      localStorage.setItem('contracking_debug_sync', JSON.stringify({ error: (syncError as Error).message }));
      setSyncStatus(SyncStatus.UNSYNCED);
      return null;
    } finally {
      syncingRef.current = false;
    }
  }, [refreshFromStorage]);

  const handleLogout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // offline
    }
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem('contracking_auth_checked');
    localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
    localStorage.removeItem('contracking_preferences');
    localStorage.removeItem('contracking_active_contraction');
    localStorage.removeItem('contracking_local_banner_dismissed');
    setLocalSession(createLocalSession());
    setIsAuthenticated(false);
    setUserEmail(null);
    setSyncStatus(SyncStatus.NOT_AUTHENTICATED);
  }, []);

  const updateSessionInfo = useCallback(
    ({ patientName, gestationalWeek }: { patientName?: string; gestationalWeek?: number }) => {
      const session = getLocalSession();
      if (!session) return;
      if (patientName !== undefined) session.patientName = patientName;
      if (gestationalWeek !== undefined) session.gestationalWeek = gestationalWeek;
      saveLocalSession(session);
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  useEffect(() => {
    if (!navigator.onLine) {
      setSyncStatus(SyncStatus.OFFLINE);
      return;
    }

    fetchCurrentUser()
      .then(async (user) => {
        setIsAuthenticated(true);
        setUserEmail(user.email);

        try {
          await handleSync();
        } catch {
          setSyncStatus(determineUnsyncedStatus(getLocalSession()));
        }
      })
      .catch(() => {
        setSyncStatus(SyncStatus.NOT_AUTHENTICATED);
      });
  }, [handleSync]);

  useEffect(() => {
    const handleOnline = () => {
      if (isAuthenticated) {
        handleSync();
        return;
      }
      fetchCurrentUser()
        .then((user) => {
          setIsAuthenticated(true);
          setUserEmail(user.email);
          setSyncStatus(determineUnsyncedStatus(getLocalSession()));
        })
        .catch(() => {
          setSyncStatus(SyncStatus.NOT_AUTHENTICATED);
        });
    };

    const handleOffline = () => setSyncStatus(SyncStatus.OFFLINE);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, handleSync]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, handleSync]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (syncStatus === SyncStatus.OFFLINE) return;

    const intervalId = setInterval(() => handleSync(), SYNC_INTERVAL_MILLISECONDS);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, syncStatus, handleSync]);

  return {
    session: localSession,
    contractions,
    events,
    stats,
    syncStatus,
    publicId,
    userEmail,
    startContraction: handleStartContraction,
    stopContraction: handleStopContraction,
    updateContraction: handleUpdateContraction,
    deleteContraction: handleDeleteContraction,
    createEvent: handleCreateEvent,
    deleteEvent: handleDeleteEvent,
    sync: handleSync,
    updateSessionInfo,
    refreshFromStorage,
    logout: handleLogout,
  };
}
