import type { EventType, Intensity, Position } from '@contracking/shared';
import { LOCAL_SESSION_STORAGE_KEY } from '@contracking/shared';

const ACTIVE_CONTRACTION_KEY = 'contracking_active_contraction';

export type ActiveContractionState = {
  contractionId: string;
  startedAt: string;
  notifiedLevels: string[];
};

export function setActiveContraction(state: ActiveContractionState): void {
  localStorage.setItem(ACTIVE_CONTRACTION_KEY, JSON.stringify(state));
}

export function getActiveContraction(): ActiveContractionState | null {
  const raw = localStorage.getItem(ACTIVE_CONTRACTION_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ActiveContractionState;
}

export function clearActiveContraction(): void {
  localStorage.removeItem(ACTIVE_CONTRACTION_KEY);
}

const PREFERENCES_STORAGE_KEY = 'contracking_preferences';

export type LocalPreferences = {
  repeatLastIntensity: boolean;
  repeatLastPosition: boolean;
  lastIntensity: Intensity | null;
  lastPosition: Position | null;
};

const DEFAULT_PREFERENCES: LocalPreferences = {
  repeatLastIntensity: true,
  repeatLastPosition: true,
  lastIntensity: null,
  lastPosition: null,
};

export function getPreferences(): LocalPreferences {
  const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (!raw) return { ...DEFAULT_PREFERENCES };
  return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<LocalPreferences>) };
}

export function savePreferences(preferences: LocalPreferences): void {
  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export type LocalContraction = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  intensity: Intensity | null;
  position: Position | null;
  notes: string | null;
  syncedAt: string | null;
  updatedAt: string;
};

export type LocalEvent = {
  id: string;
  type: EventType;
  value: string | null;
  occurredAt: string;
  syncedAt: string | null;
  updatedAt: string;
};

export type Tombstone = {
  id: string;
  deletedAt: string;
};

export type LocalSession = {
  id: string;
  publicId?: string;
  patientName: string | null;
  gestationalWeek: number | null;
  timezone: string;
  startedAt: string;
  contractions: LocalContraction[];
  events: LocalEvent[];
  tombstones: Tombstone[];
};

export function getLocalSession(): LocalSession | null {
  const raw = localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
  if (!raw) return null;

  const session = JSON.parse(raw) as LocalSession;

  if (!session.tombstones) session.tombstones = [];

  const oldDeletedContractions = (session as Record<string, unknown>).deletedContractionIds as string[] | undefined;
  const oldDeletedEvents = (session as Record<string, unknown>).deletedEventIds as string[] | undefined;
  const hasOldFormat = (oldDeletedContractions?.length ?? 0) > 0 || (oldDeletedEvents?.length ?? 0) > 0;

  if (hasOldFormat) {
    const now = new Date().toISOString();
    session.tombstones = [
      ...session.tombstones,
      ...(oldDeletedContractions ?? []).map((id: string) => ({ id, deletedAt: now })),
      ...(oldDeletedEvents ?? []).map((id: string) => ({ id, deletedAt: now })),
    ];
    delete (session as Record<string, unknown>).deletedContractionIds;
    delete (session as Record<string, unknown>).deletedEventIds;
    saveLocalSession(session);
  }

  session.contractions = session.contractions.map((contraction) => ({
    ...contraction,
    updatedAt: contraction.updatedAt ?? contraction.startedAt,
  }));
  session.events = session.events.map((event) => ({
    ...event,
    updatedAt: event.updatedAt ?? event.occurredAt,
  }));

  const needsSyncReset = !(session as Record<string, unknown>).syncResetDone;
  if (needsSyncReset) {
    session.contractions = session.contractions.map((contraction) => ({ ...contraction, syncedAt: null }));
    session.events = session.events.map((event) => ({ ...event, syncedAt: null }));
    session.tombstones = [];
    (session as Record<string, unknown>).syncResetDone = true;
    saveLocalSession(session);
  }

  return session;
}

export function saveLocalSession(session: LocalSession): void {
  localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function createLocalSession(): LocalSession {
  const session: LocalSession = {
    id: crypto.randomUUID(),
    patientName: null,
    gestationalWeek: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    startedAt: new Date().toISOString(),
    contractions: [],
    events: [],
    tombstones: [],
  };
  saveLocalSession(session);
  return session;
}

export function addLocalContraction(contraction: LocalContraction): void {
  const session = getLocalSession();
  if (!session) return;
  session.contractions.push(contraction);
  saveLocalSession(session);
}

export function updateLocalContraction({ id, data }: { id: string; data: Partial<LocalContraction> }): void {
  const session = getLocalSession();
  if (!session) return;
  session.contractions = session.contractions.map((contraction) =>
    contraction.id === id
      ? { ...contraction, ...data, syncedAt: null, updatedAt: new Date().toISOString() }
      : contraction,
  );
  saveLocalSession(session);
}

export function deleteLocalContraction(id: string): void {
  const session = getLocalSession();
  if (!session) return;
  session.contractions = session.contractions.filter((contraction) => contraction.id !== id);
  session.tombstones = [...session.tombstones, { id, deletedAt: new Date().toISOString() }];
  saveLocalSession(session);
}

export function addLocalEvent(event: LocalEvent): void {
  const session = getLocalSession();
  if (!session) return;
  session.events.push(event);
  saveLocalSession(session);
}

export function updateLocalEvent({ id, data }: { id: string; data: Partial<LocalEvent> }): void {
  const session = getLocalSession();
  if (!session) return;
  session.events = session.events.map((event) =>
    event.id === id ? { ...event, ...data, syncedAt: null, updatedAt: new Date().toISOString() } : event,
  );
  saveLocalSession(session);
}

export function deleteLocalEvent(id: string): void {
  const session = getLocalSession();
  if (!session) return;
  session.events = session.events.filter((event) => event.id !== id);
  session.tombstones = [...session.tombstones, { id, deletedAt: new Date().toISOString() }];
  saveLocalSession(session);
}
