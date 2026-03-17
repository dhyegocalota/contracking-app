import { afterEach, describe, expect, test } from 'bun:test';
import { EventType, Intensity, LOCAL_SESSION_STORAGE_KEY } from '@contracking/shared';
import {
  addLocalContraction,
  addLocalEvent,
  createLocalSession,
  deleteLocalContraction,
  deleteLocalEvent,
  getLocalSession,
  type LocalContraction,
  type LocalEvent,
  type LocalSession,
  saveLocalSession,
  updateLocalContraction,
} from './storage';

function makeLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key in store) delete store[key];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (_index: number) => null,
  } as Storage;
}

afterEach(() => {
  globalThis.localStorage = makeLocalStorage();
});

globalThis.localStorage = makeLocalStorage();

describe('getLocalSession', () => {
  test('returns null when no session stored', () => {
    expect(getLocalSession()).toBeNull();
  });

  test('returns parsed session when stored', () => {
    const session: LocalSession = {
      id: 'test-id',
      patientName: null,
      gestationalWeek: null,
      timezone: 'America/Sao_Paulo',
      startedAt: '2024-01-01T00:00:00.000Z',
      contractions: [],
      events: [],
      tombstones: [],
    };
    localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(session));
    expect(getLocalSession()).toEqual({ ...session, syncResetDone: true });
  });

  test('migrates old deletedContractionIds and deletedEventIds to tombstones', () => {
    const oldSession = {
      id: 'test-id',
      patientName: null,
      gestationalWeek: null,
      timezone: 'America/Sao_Paulo',
      startedAt: '2024-01-01T00:00:00.000Z',
      contractions: [],
      events: [],
      syncResetDone: true,
      deletedContractionIds: ['c1'],
      deletedEventIds: ['e1'],
    };
    localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(oldSession));
    const session = getLocalSession()!;
    expect(session.tombstones).toHaveLength(2);
    expect(session.tombstones.map((t) => t.id).sort()).toEqual(['c1', 'e1']);
    expect((session as Record<string, unknown>).deletedContractionIds).toBeUndefined();
    expect((session as Record<string, unknown>).deletedEventIds).toBeUndefined();
  });

  test('adds updatedAt from startedAt when missing on contractions', () => {
    const session = {
      id: 'test-id',
      patientName: null,
      gestationalWeek: null,
      timezone: 'America/Sao_Paulo',
      startedAt: '2024-01-01T00:00:00.000Z',
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: null,
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
        },
      ],
      events: [],
      tombstones: [],
    };
    localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(session));
    const loaded = getLocalSession()!;
    expect(loaded.contractions[0]!.updatedAt).toBe('2024-01-01T10:00:00Z');
  });

  test('adds updatedAt from occurredAt when missing on events', () => {
    const session = {
      id: 'test-id',
      patientName: null,
      gestationalWeek: null,
      timezone: 'America/Sao_Paulo',
      startedAt: '2024-01-01T00:00:00.000Z',
      contractions: [],
      events: [{ id: 'e1', type: EventType.NOTE, value: null, occurredAt: '2024-01-01T12:00:00Z', syncedAt: null }],
      tombstones: [],
    };
    localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(session));
    const loaded = getLocalSession()!;
    expect(loaded.events[0]!.updatedAt).toBe('2024-01-01T12:00:00Z');
  });
});

describe('saveLocalSession', () => {
  test('persists session to localStorage', () => {
    const session: LocalSession = {
      id: 'test-id',
      patientName: 'Maria',
      gestationalWeek: 38,
      timezone: 'America/Sao_Paulo',
      startedAt: '2024-01-01T00:00:00.000Z',
      contractions: [],
      events: [],
      tombstones: [],
    };
    saveLocalSession(session);
    const stored = JSON.parse(localStorage.getItem(LOCAL_SESSION_STORAGE_KEY)!);
    expect(stored.id).toBe('test-id');
    expect(stored.patientName).toBe('Maria');
  });
});

describe('createLocalSession', () => {
  test('creates and persists a new session', () => {
    const session = createLocalSession();
    expect(session.id).toBeDefined();
    expect(session.timezone).toBeDefined();
    expect(session.contractions).toEqual([]);
    expect(session.events).toEqual([]);
    expect(session.tombstones).toEqual([]);
    expect(getLocalSession()).toEqual({ ...session, syncResetDone: true });
  });
});

describe('addLocalContraction', () => {
  test('adds contraction to existing session', () => {
    createLocalSession();
    const contraction: LocalContraction = {
      id: 'c1',
      startedAt: '2024-01-01T10:00:00.000Z',
      endedAt: null,
      intensity: null,
      position: null,
      notes: null,
      syncedAt: null,
      updatedAt: '2024-01-01T10:00:00.000Z',
    };
    addLocalContraction(contraction);
    const session = getLocalSession()!;
    expect(session.contractions).toHaveLength(1);
    expect(session.contractions[0]!.id).toBe('c1');
  });

  test('does nothing when no session exists', () => {
    addLocalContraction({
      id: 'c1',
      startedAt: '2024-01-01T10:00:00.000Z',
      endedAt: null,
      intensity: null,
      position: null,
      notes: null,
      syncedAt: null,
      updatedAt: '2024-01-01T10:00:00.000Z',
    });
    expect(getLocalSession()).toBeNull();
  });
});

describe('updateLocalContraction', () => {
  test('updates contraction fields and resets syncedAt and sets updatedAt', () => {
    createLocalSession();
    addLocalContraction({
      id: 'c1',
      startedAt: '2024-01-01T10:00:00.000Z',
      endedAt: null,
      intensity: null,
      position: null,
      notes: null,
      syncedAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    });
    updateLocalContraction({
      id: 'c1',
      data: { endedAt: '2024-01-01T10:01:00.000Z', intensity: Intensity.STRONG },
    });
    const updated = getLocalSession()!;
    expect(updated.contractions[0]!.endedAt).toBe('2024-01-01T10:01:00.000Z');
    expect(updated.contractions[0]!.intensity).toBe(Intensity.STRONG);
    expect(updated.contractions[0]!.syncedAt).toBeNull();
    expect(updated.contractions[0]!.updatedAt).not.toBe('2024-01-01T10:00:00.000Z');
  });

  test('updates startedAt and resets syncedAt', () => {
    createLocalSession();
    addLocalContraction({
      id: 'c1',
      startedAt: '2024-01-01T10:00:00.000Z',
      endedAt: '2024-01-01T10:01:00.000Z',
      intensity: null,
      position: null,
      notes: null,
      syncedAt: '2024-01-01T10:02:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    });
    updateLocalContraction({
      id: 'c1',
      data: { startedAt: '2024-01-01T09:55:00.000Z' },
    });
    const updated = getLocalSession()!;
    expect(updated.contractions[0]!.startedAt).toBe('2024-01-01T09:55:00.000Z');
    expect(updated.contractions[0]!.syncedAt).toBeNull();
  });

  test('updates both startedAt and endedAt together', () => {
    createLocalSession();
    addLocalContraction({
      id: 'c1',
      startedAt: '2024-01-01T10:00:00.000Z',
      endedAt: '2024-01-01T10:01:00.000Z',
      intensity: null,
      position: null,
      notes: null,
      syncedAt: '2024-01-01T10:02:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    });
    updateLocalContraction({
      id: 'c1',
      data: { startedAt: '2024-01-01T09:50:00.000Z', endedAt: '2024-01-01T09:51:00.000Z' },
    });
    const updated = getLocalSession()!;
    expect(updated.contractions[0]!.startedAt).toBe('2024-01-01T09:50:00.000Z');
    expect(updated.contractions[0]!.endedAt).toBe('2024-01-01T09:51:00.000Z');
    expect(updated.contractions[0]!.syncedAt).toBeNull();
  });
});

describe('deleteLocalContraction', () => {
  test('removes contraction from session and adds tombstone', () => {
    createLocalSession();
    addLocalContraction({
      id: 'c1',
      startedAt: '2024-01-01T10:00:00.000Z',
      endedAt: null,
      intensity: null,
      position: null,
      notes: null,
      syncedAt: null,
      updatedAt: '2024-01-01T10:00:00.000Z',
    });
    deleteLocalContraction('c1');
    const session = getLocalSession()!;
    expect(session.contractions).toHaveLength(0);
    expect(session.tombstones).toHaveLength(1);
    expect(session.tombstones[0]!.id).toBe('c1');
  });
});

describe('addLocalEvent', () => {
  test('adds event to existing session', () => {
    createLocalSession();
    const event: LocalEvent = {
      id: 'e1',
      type: EventType.NOTE,
      value: 'test note',
      occurredAt: '2024-01-01T10:00:00.000Z',
      syncedAt: null,
      updatedAt: '2024-01-01T10:00:00.000Z',
    };
    addLocalEvent(event);
    const session = getLocalSession()!;
    expect(session.events).toHaveLength(1);
    expect(session.events[0]!.type).toBe(EventType.NOTE);
  });
});

describe('deleteLocalEvent', () => {
  test('removes event from session and adds tombstone', () => {
    createLocalSession();
    addLocalEvent({
      id: 'e1',
      type: EventType.DILATION,
      value: '4',
      occurredAt: '2024-01-01T10:00:00.000Z',
      syncedAt: null,
      updatedAt: '2024-01-01T10:00:00.000Z',
    });
    deleteLocalEvent('e1');
    const session = getLocalSession()!;
    expect(session.events).toHaveLength(0);
    expect(session.tombstones).toHaveLength(1);
    expect(session.tombstones[0]!.id).toBe('e1');
  });
});
