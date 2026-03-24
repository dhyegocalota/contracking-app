import { describe, expect, test } from 'bun:test';

type MinimalContraction = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

type MinimalEvent = {
  id: string;
  occurredAt: string;
};

type TimelineEntry =
  | { kind: 'contraction'; id: string; timestamp: number }
  | { kind: 'event'; id: string; timestamp: number };

function buildInterleavedTimeline({
  contractions,
  events,
}: {
  contractions: MinimalContraction[];
  events: MinimalEvent[];
}): TimelineEntry[] {
  const contractionEntries: TimelineEntry[] = contractions.map((contraction) => ({
    kind: 'contraction',
    id: contraction.id,
    timestamp: new Date(contraction.startedAt).getTime(),
  }));

  const eventEntries: TimelineEntry[] = events.map((event) => ({
    kind: 'event',
    id: event.id,
    timestamp: new Date(event.occurredAt).getTime(),
  }));

  return [...contractionEntries, ...eventEntries].sort((a, b) => b.timestamp - a.timestamp);
}

describe('buildInterleavedTimeline', () => {
  test('returns empty for no items', () => {
    const result = buildInterleavedTimeline({ contractions: [], events: [] });
    expect(result).toEqual([]);
  });

  test('returns contractions only when no events', () => {
    const contractions = [
      { id: 'c1', startedAt: '2026-03-24T15:00:00Z', endedAt: '2026-03-24T15:01:00Z' },
      { id: 'c2', startedAt: '2026-03-24T14:00:00Z', endedAt: '2026-03-24T14:01:00Z' },
    ];
    const result = buildInterleavedTimeline({ contractions, events: [] });
    expect(result.map((entry) => entry.id)).toEqual(['c1', 'c2']);
  });

  test('returns events only when no contractions', () => {
    const events = [
      { id: 'e1', occurredAt: '2026-03-24T15:30:00Z' },
      { id: 'e2', occurredAt: '2026-03-24T14:30:00Z' },
    ];
    const result = buildInterleavedTimeline({ contractions: [], events });
    expect(result.map((entry) => entry.id)).toEqual(['e1', 'e2']);
  });

  test('interleaves events between contractions chronologically', () => {
    const contractions = [
      { id: 'c1', startedAt: '2026-03-24T16:00:00Z', endedAt: '2026-03-24T16:01:00Z' },
      { id: 'c2', startedAt: '2026-03-24T14:00:00Z', endedAt: '2026-03-24T14:01:00Z' },
    ];
    const events = [{ id: 'e1', occurredAt: '2026-03-24T15:00:00Z' }];
    const result = buildInterleavedTimeline({ contractions, events });
    expect(result.map((entry) => entry.id)).toEqual(['c1', 'e1', 'c2']);
    expect(result.map((entry) => entry.kind)).toEqual(['contraction', 'event', 'contraction']);
  });

  test('places event at correct position among many contractions', () => {
    const contractions = [
      { id: 'c1', startedAt: '2026-03-24T18:00:00Z', endedAt: '2026-03-24T18:01:00Z' },
      { id: 'c2', startedAt: '2026-03-24T16:00:00Z', endedAt: '2026-03-24T16:01:00Z' },
      { id: 'c3', startedAt: '2026-03-24T14:00:00Z', endedAt: '2026-03-24T14:01:00Z' },
    ];
    const events = [
      { id: 'e1', occurredAt: '2026-03-24T17:00:00Z' },
      { id: 'e2', occurredAt: '2026-03-24T15:00:00Z' },
    ];
    const result = buildInterleavedTimeline({ contractions, events });
    expect(result.map((entry) => entry.id)).toEqual(['c1', 'e1', 'c2', 'e2', 'c3']);
  });

  test('sorts descending by timestamp (newest first)', () => {
    const contractions = [{ id: 'c1', startedAt: '2026-03-24T10:00:00Z', endedAt: '2026-03-24T10:01:00Z' }];
    const events = [{ id: 'e1', occurredAt: '2026-03-24T12:00:00Z' }];
    const result = buildInterleavedTimeline({ contractions, events });
    expect(result[0]!.id).toBe('e1');
    expect(result[1]!.id).toBe('c1');
  });

  test('handles simultaneous timestamps', () => {
    const contractions = [{ id: 'c1', startedAt: '2026-03-24T15:00:00Z', endedAt: '2026-03-24T15:01:00Z' }];
    const events = [{ id: 'e1', occurredAt: '2026-03-24T15:00:00Z' }];
    const result = buildInterleavedTimeline({ contractions, events });
    expect(result).toHaveLength(2);
  });
});
