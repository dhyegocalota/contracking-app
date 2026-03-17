import { describe, expect, test } from 'bun:test';
import type { SessionResponse } from '@contracking/shared';
import { EventType, Intensity, Position } from '@contracking/shared';
import type { LocalContraction, LocalEvent, LocalSession, Tombstone } from './storage';
import { mergeWithCloud } from './sync';

function makeLocalContraction(overrides: Partial<LocalContraction> = {}): LocalContraction {
  return {
    id: crypto.randomUUID(),
    startedAt: '2024-01-01T10:00:00.000Z',
    endedAt: '2024-01-01T10:01:00.000Z',
    intensity: null,
    position: null,
    notes: null,
    syncedAt: null,
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeLocalEvent(overrides: Partial<LocalEvent> = {}): LocalEvent {
  return {
    id: crypto.randomUUID(),
    type: EventType.NOTE,
    value: null,
    occurredAt: '2024-01-01T12:00:00.000Z',
    syncedAt: null,
    updatedAt: '2024-01-01T12:00:00.000Z',
    ...overrides,
  };
}

function makeLocalSession(overrides: Partial<LocalSession> = {}): LocalSession {
  return {
    id: 'session-1',
    patientName: null,
    gestationalWeek: null,
    timezone: 'America/Sao_Paulo',
    startedAt: '2024-01-01T00:00:00.000Z',
    contractions: [],
    events: [],
    tombstones: [],
    ...overrides,
  };
}

function makeCloudResponse(overrides: Partial<SessionResponse> = {}): SessionResponse {
  return {
    session: {
      id: 'session-1',
      userId: 'user-1',
      publicId: 'public-abc',
      patientName: null,
      gestationalWeek: null,
      startedAt: new Date('2024-01-01T00:00:00.000Z'),
      endedAt: null,
      timezone: 'America/Sao_Paulo',
    },
    contractions: [],
    events: [],
    stats: {
      totalContractions: 0,
      averageDuration: 0,
      averageInterval: 0,
      regularity: null,
      alertFiveOneOne: false,
      lastDilation: null,
    },
    ...overrides,
  };
}

describe('mergeWithCloud', () => {
  test('returns publicId from cloud response', () => {
    const local = makeLocalSession();
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.publicId).toBe('public-abc');
  });

  test('adds cloud contractions that local does not have', () => {
    const local = makeLocalSession();
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: Intensity.STRONG,
          position: null,
          notes: null,
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.id).toBe('c1');
    expect(merged.contractions[0]!.syncedAt).not.toBeNull();
  });

  test('adds cloud events that local does not have', () => {
    const local = makeLocalSession();
    const cloud = makeCloudResponse({
      events: [
        {
          id: 'e1',
          userId: 'user-1',
          type: EventType.NOTE,
          value: 'cloud note',
          occurredAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.events).toHaveLength(1);
    expect(merged.events[0]!.value).toBe('cloud note');
    expect(merged.events[0]!.syncedAt).not.toBeNull();
  });

  test('keeps unsynced local contractions not in cloud', () => {
    const local = makeLocalSession({
      contractions: [makeLocalContraction({ id: 'local-c1', syncedAt: null })],
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.id).toBe('local-c1');
    expect(merged.contractions[0]!.syncedAt).toBeNull();
  });

  test('keeps unsynced local events not in cloud', () => {
    const local = makeLocalSession({
      events: [makeLocalEvent({ id: 'local-e1', syncedAt: null })],
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.events).toHaveLength(1);
    expect(merged.events[0]!.id).toBe('local-e1');
  });

  test('local unsynced contraction wins over cloud version', () => {
    const local = makeLocalSession({
      contractions: [
        makeLocalContraction({
          id: 'c1',
          notes: 'local version',
          syncedAt: null,
          updatedAt: '2024-01-01T10:05:00.000Z',
        }),
      ],
    });
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: Intensity.MODERATE,
          position: null,
          notes: 'cloud version',
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.notes).toBe('local version');
  });

  test('cloud wins for synced contraction with same id', () => {
    const local = makeLocalSession({
      contractions: [
        makeLocalContraction({
          id: 'c1',
          notes: 'old local',
          syncedAt: '2024-01-01T09:00:00.000Z',
          updatedAt: '2024-01-01T09:00:00.000Z',
        }),
      ],
    });
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: null,
          position: null,
          notes: 'cloud version',
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.notes).toBe('cloud version');
  });

  test('tombstoned contraction stays deleted even when cloud has it', () => {
    const local = makeLocalSession({
      tombstones: [{ id: 'c1', deletedAt: '2024-01-01T10:05:00.000Z' }],
    });
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: null,
          position: null,
          notes: null,
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(0);
  });

  test('tombstoned event stays deleted even when cloud has it', () => {
    const local = makeLocalSession({
      tombstones: [{ id: 'e1', deletedAt: '2024-01-01T12:05:00.000Z' }],
    });
    const cloud = makeCloudResponse({
      events: [
        {
          id: 'e1',
          userId: 'user-1',
          type: EventType.NOTE,
          value: 'should be gone',
          occurredAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.events).toHaveLength(0);
  });

  test('synced local contraction not in cloud survives (only tombstones delete)', () => {
    const local = makeLocalSession({
      contractions: [
        makeLocalContraction({
          id: 'synced-but-not-in-cloud',
          syncedAt: '2024-01-01T10:02:00.000Z',
        }),
      ],
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.id).toBe('synced-but-not-in-cloud');
  });

  test('synced local event not in cloud survives (only tombstones delete)', () => {
    const local = makeLocalSession({
      events: [
        makeLocalEvent({
          id: 'synced-but-not-in-cloud',
          syncedAt: '2024-01-01T12:02:00.000Z',
        }),
      ],
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.events).toHaveLength(1);
    expect(merged.events[0]!.id).toBe('synced-but-not-in-cloud');
  });

  test('unsynced local contraction not in cloud survives (not deleted, just new)', () => {
    const local = makeLocalSession({
      contractions: [makeLocalContraction({ id: 'new-local', syncedAt: null })],
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.id).toBe('new-local');
  });

  test('merges both cloud and local-only items together', () => {
    const local = makeLocalSession({
      contractions: [makeLocalContraction({ id: 'local-only', syncedAt: null })],
      events: [makeLocalEvent({ id: 'local-event', type: EventType.WATER_BREAK, syncedAt: null })],
    });
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'cloud-c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: null,
          position: null,
          notes: null,
        },
      ],
      events: [
        {
          id: 'cloud-e1',
          userId: 'user-1',
          type: EventType.DILATION,
          value: '5',
          occurredAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(2);
    expect(merged.events).toHaveLength(2);
  });

  test('active contraction (endedAt null, unsynced) survives when cloud has ended version', () => {
    const local = makeLocalSession({
      contractions: [
        makeLocalContraction({
          id: 'c1',
          endedAt: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:03:00.000Z',
        }),
      ],
    });
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:02:00Z'),
          intensity: null,
          position: null,
          notes: null,
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.endedAt).toBeNull();
  });

  test('empty cloud response keeps all local data', () => {
    const local = makeLocalSession({
      contractions: [
        makeLocalContraction({ id: 'c1', syncedAt: null }),
        makeLocalContraction({ id: 'c2', syncedAt: null }),
      ],
      events: [makeLocalEvent({ id: 'e1', syncedAt: null })],
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(2);
    expect(merged.events).toHaveLength(1);
  });

  test('empty local data takes all cloud data', () => {
    const local = makeLocalSession();
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: null,
          position: null,
          notes: null,
        },
        {
          id: 'c2',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T11:00:00Z'),
          endedAt: new Date('2024-01-01T11:01:00Z'),
          intensity: null,
          position: null,
          notes: null,
        },
      ],
      events: [
        {
          id: 'e1',
          userId: 'user-1',
          type: EventType.NOTE,
          value: 'test',
          occurredAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(2);
    expect(merged.events).toHaveLength(1);
  });

  test('preserves tombstones after merge', () => {
    const tombstones: Tombstone[] = [
      { id: 'c1', deletedAt: '2024-01-01T10:05:00.000Z' },
      { id: 'e1', deletedAt: '2024-01-01T12:05:00.000Z' },
    ];
    const local = makeLocalSession({ tombstones });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.tombstones).toEqual(tombstones);
  });

  test('imported data (syncedAt null) survives subsequent merges', () => {
    const importedContraction = makeLocalContraction({
      id: 'imported-c1',
      syncedAt: null,
      updatedAt: '2024-01-01T10:00:00.000Z',
    });
    const local = makeLocalSession({
      contractions: [importedContraction],
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.id).toBe('imported-c1');
  });

  test('cloud contraction with intensity and position is preserved', () => {
    const local = makeLocalSession();
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: Intensity.STRONG,
          position: Position.FRONT,
          notes: 'detailed note',
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions[0]!.intensity).toBe(Intensity.STRONG);
    expect(merged.contractions[0]!.position).toBe(Position.FRONT);
    expect(merged.contractions[0]!.notes).toBe('detailed note');
  });

  test('local-only tombstoned contraction is excluded from merge', () => {
    const local = makeLocalSession({
      contractions: [makeLocalContraction({ id: 'c1', syncedAt: null })],
      tombstones: [{ id: 'c1', deletedAt: '2024-01-01T10:05:00.000Z' }],
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(0);
  });

  test('multiple cloud and local items merge correctly without duplicates', () => {
    const local = makeLocalSession({
      contractions: [
        makeLocalContraction({ id: 'c1', syncedAt: null, notes: 'local c1' }),
        makeLocalContraction({ id: 'c3', syncedAt: null, notes: 'local c3' }),
      ],
      events: [makeLocalEvent({ id: 'e1', syncedAt: null, value: 'local e1' })],
    });
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: null,
          position: null,
          notes: 'cloud c1',
        },
        {
          id: 'c2',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T11:00:00Z'),
          endedAt: new Date('2024-01-01T11:01:00Z'),
          intensity: null,
          position: null,
          notes: 'cloud c2',
        },
      ],
      events: [
        {
          id: 'e2',
          userId: 'user-1',
          type: EventType.DILATION,
          value: '3',
          occurredAt: new Date('2024-01-01T13:00:00Z'),
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(3);
    expect(merged.events).toHaveLength(2);
    const contractionNotes = merged.contractions.map((c) => c.notes).sort();
    expect(contractionNotes).toEqual(['cloud c2', 'local c1', 'local c3']);
  });

  test('unsynced local event wins over cloud version', () => {
    const local = makeLocalSession({
      events: [
        makeLocalEvent({
          id: 'e1',
          value: 'local value',
          syncedAt: null,
          updatedAt: '2024-01-01T12:05:00.000Z',
        }),
      ],
    });
    const cloud = makeCloudResponse({
      events: [
        {
          id: 'e1',
          userId: 'user-1',
          type: EventType.NOTE,
          value: 'cloud value',
          occurredAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.events).toHaveLength(1);
    expect(merged.events[0]!.value).toBe('local value');
  });

  test('cloud event wins over synced local event', () => {
    const local = makeLocalSession({
      events: [
        makeLocalEvent({
          id: 'e1',
          value: 'old local',
          syncedAt: '2024-01-01T11:00:00.000Z',
          updatedAt: '2024-01-01T11:00:00.000Z',
        }),
      ],
    });
    const cloud = makeCloudResponse({
      events: [
        {
          id: 'e1',
          userId: 'user-1',
          type: EventType.NOTE,
          value: 'cloud value',
          occurredAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.events).toHaveLength(1);
    expect(merged.events[0]!.value).toBe('cloud value');
  });

  test('device A export then device B import and sync preserves imported data', () => {
    const importedContraction = makeLocalContraction({
      id: 'from-device-a',
      notes: 'device A data',
      syncedAt: null,
      updatedAt: '2024-01-01T10:00:00.000Z',
    });
    const deviceBSession = makeLocalSession({
      contractions: [importedContraction],
    });
    const cloudBeforeImport = makeCloudResponse();
    const merged = mergeWithCloud(deviceBSession, cloudBeforeImport);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.notes).toBe('device A data');
  });

  test('edited startedAt preserved when local unsynced wins over cloud', () => {
    const local = makeLocalSession({
      contractions: [
        makeLocalContraction({
          id: 'c1',
          startedAt: '2024-01-01T09:50:00.000Z',
          endedAt: '2024-01-01T10:01:00.000Z',
          syncedAt: null,
          updatedAt: '2024-01-01T10:05:00.000Z',
        }),
      ],
    });
    const cloud = makeCloudResponse({
      contractions: [
        {
          id: 'c1',
          userId: 'user-1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T10:01:00Z'),
          intensity: null,
          position: null,
          notes: null,
        },
      ],
    });
    const merged = mergeWithCloud(local, cloud);
    expect(merged.contractions).toHaveLength(1);
    expect(merged.contractions[0]!.startedAt).toBe('2024-01-01T09:50:00.000Z');
  });

  test('session metadata preserved during merge', () => {
    const local = makeLocalSession({
      patientName: 'Maria',
      gestationalWeek: 38,
    });
    const cloud = makeCloudResponse();
    const merged = mergeWithCloud(local, cloud);
    expect(merged.patientName).toBe('Maria');
    expect(merged.gestationalWeek).toBe(38);
  });
});
