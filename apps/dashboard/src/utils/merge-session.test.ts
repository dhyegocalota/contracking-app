import { describe, expect, test } from 'bun:test';
import type { LocalSession } from '../storage';
import { isValidLocalSession, mergeImportedSession } from './merge-session';

function makeSession(overrides: Partial<LocalSession> = {}): LocalSession {
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

describe('mergeImportedSession', () => {
  test('adds new contractions from imported session', () => {
    const existing = makeSession({
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: '2024-01-01T10:01:00Z',
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });
    const imported = makeSession({
      contractions: [
        {
          id: 'c2',
          startedAt: '2024-01-01T11:00:00Z',
          endedAt: '2024-01-01T11:01:00Z',
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T11:00:00Z',
        },
      ],
    });

    const { merged, contractionCount } = mergeImportedSession({ existing, imported });
    expect(merged.contractions).toHaveLength(2);
    expect(contractionCount).toBe(1);
  });

  test('keeps existing contraction when imported has no endedAt', () => {
    const existing = makeSession({
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: '2024-01-01T10:01:00Z',
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });
    const imported = makeSession({
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: null,
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });

    const { merged } = mergeImportedSession({ existing, imported });
    expect(merged.contractions[0].endedAt).toBe('2024-01-01T10:01:00Z');
  });

  test('prefers imported contraction with later endedAt', () => {
    const existing = makeSession({
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: '2024-01-01T10:01:00Z',
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });
    const imported = makeSession({
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: '2024-01-01T10:02:00Z',
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });

    const { merged } = mergeImportedSession({ existing, imported });
    expect(merged.contractions[0].endedAt).toBe('2024-01-01T10:02:00Z');
  });

  test('prefers imported contraction with endedAt over existing without', () => {
    const existing = makeSession({
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: null,
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });
    const imported = makeSession({
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: '2024-01-01T10:01:00Z',
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });

    const { merged } = mergeImportedSession({ existing, imported });
    expect(merged.contractions[0].endedAt).toBe('2024-01-01T10:01:00Z');
  });

  test('adds new events from imported session', () => {
    const existing = makeSession({
      events: [
        {
          id: 'e1',
          type: 'note' as never,
          value: 'existing',
          occurredAt: '2024-01-01T10:00:00Z',
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });
    const imported = makeSession({
      events: [
        {
          id: 'e2',
          type: 'note' as never,
          value: 'imported',
          occurredAt: '2024-01-01T11:00:00Z',
          syncedAt: null,
          updatedAt: '2024-01-01T11:00:00Z',
        },
      ],
    });

    const { merged, eventCount } = mergeImportedSession({ existing, imported });
    expect(merged.events).toHaveLength(2);
    expect(eventCount).toBe(1);
  });

  test('does not duplicate existing events', () => {
    const existing = makeSession({
      events: [
        {
          id: 'e1',
          type: 'note' as never,
          value: 'test',
          occurredAt: '2024-01-01T10:00:00Z',
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });
    const imported = makeSession({
      events: [
        {
          id: 'e1',
          type: 'note' as never,
          value: 'test',
          occurredAt: '2024-01-01T10:00:00Z',
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });

    const { merged, eventCount } = mergeImportedSession({ existing, imported });
    expect(merged.events).toHaveLength(1);
    expect(eventCount).toBe(0);
  });

  test('skips imported contractions that are tombstoned', () => {
    const existing = makeSession({
      tombstones: [{ id: 'c1', deletedAt: '2024-01-01T10:05:00Z' }],
    });
    const imported = makeSession({
      contractions: [
        {
          id: 'c1',
          startedAt: '2024-01-01T10:00:00Z',
          endedAt: '2024-01-01T10:01:00Z',
          intensity: null,
          position: null,
          notes: null,
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });

    const { merged, contractionCount } = mergeImportedSession({ existing, imported });
    expect(merged.contractions).toHaveLength(0);
    expect(contractionCount).toBe(0);
  });

  test('skips imported events that are tombstoned', () => {
    const existing = makeSession({
      tombstones: [{ id: 'e1', deletedAt: '2024-01-01T10:05:00Z' }],
    });
    const imported = makeSession({
      events: [
        {
          id: 'e1',
          type: 'note' as never,
          value: 'imported',
          occurredAt: '2024-01-01T10:00:00Z',
          syncedAt: null,
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ],
    });

    const { merged, eventCount } = mergeImportedSession({ existing, imported });
    expect(merged.events).toHaveLength(0);
    expect(eventCount).toBe(0);
  });

  test('merges tombstones from imported session', () => {
    const existing = makeSession({
      tombstones: [{ id: 'c1', deletedAt: '2024-01-01T10:05:00Z' }],
    });
    const imported = makeSession({
      tombstones: [{ id: 'c2', deletedAt: '2024-01-01T11:05:00Z' }],
    });

    const { merged } = mergeImportedSession({ existing, imported });
    expect(merged.tombstones).toHaveLength(2);
  });
});

describe('isValidLocalSession', () => {
  test('returns true for valid session', () => {
    expect(isValidLocalSession({ id: 'test', contractions: [], events: [] })).toBe(true);
  });

  test('returns false for null', () => {
    expect(isValidLocalSession(null)).toBe(false);
  });

  test('returns false for missing fields', () => {
    expect(isValidLocalSession({ id: 'test' })).toBe(false);
  });

  test('returns false for non-object', () => {
    expect(isValidLocalSession('string')).toBe(false);
  });
});
