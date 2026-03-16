import { describe, expect, test } from 'bun:test';
import { EventType } from './enums';
import { calculateRegularity, calculateSessionStats, detectFiveOneOneAlert } from './stats';
import type { Contraction, Event } from './types';

function makeContraction(overrides: Partial<Contraction> = {}): Contraction {
  return {
    id: 'c1',
    userId: 'u1',
    startedAt: new Date(),
    endedAt: new Date(),
    intensity: null,
    position: null,
    notes: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    userId: 'u1',
    type: EventType.NOTE,
    value: null,
    occurredAt: new Date(),
    ...overrides,
  };
}

function makeContractionAt(startOffsetSeconds: number, durationSeconds: number): Contraction {
  const startedAt = new Date(Date.now() - startOffsetSeconds * 1000);
  const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  return makeContraction({ id: String(startOffsetSeconds), startedAt, endedAt });
}

describe('calculateRegularity', () => {
  test('returns null when fewer than 6 finished contractions', () => {
    const contractions = Array.from({ length: 5 }, (_, index) => makeContractionAt(index * 300, 60));
    expect(calculateRegularity(contractions)).toBeNull();
  });

  test('returns regular with consistent intervals', () => {
    const contractions = Array.from({ length: 7 }, (_, index) => makeContractionAt(index * 300, 60));
    expect(calculateRegularity(contractions)).toBe('regular');
  });

  test('returns irregular with varying intervals', () => {
    const offsets = [0, 120, 600, 660, 1500, 1560, 2400];
    const contractions = offsets.map((offset) => makeContractionAt(offset, 60));
    expect(calculateRegularity(contractions)).toBe('irregular');
  });

  test('ignores unfinished contractions', () => {
    const finished = Array.from({ length: 5 }, (_, index) => makeContractionAt(index * 300, 60));
    const unfinished = makeContraction({ id: 'unfinished', endedAt: null });
    expect(calculateRegularity([...finished, unfinished])).toBeNull();
  });

  test('uses only last 5 intervals with more than 6 contractions', () => {
    const regularPart = Array.from({ length: 6 }, (_, index) => makeContractionAt(7200 + index * 300, 60));
    const earlyOutlier = makeContractionAt(10000, 60);
    expect(calculateRegularity([earlyOutlier, ...regularPart])).toBe('regular');
  });
});

describe('detectFiveOneOneAlert', () => {
  test('returns false with fewer than 5 finished contractions', () => {
    const contractions = Array.from({ length: 4 }, (_, index) => makeContractionAt(index * 240, 90));
    expect(detectFiveOneOneAlert(contractions)).toBe(false);
  });

  test('returns true when all 3 conditions met', () => {
    const contractions = Array.from({ length: 5 }, (_, index) => makeContractionAt(4000 + index * 240, 90));
    expect(detectFiveOneOneAlert(contractions)).toBe(true);
  });

  test('returns false when interval too long', () => {
    const contractions = Array.from({ length: 5 }, (_, index) => makeContractionAt(4000 + index * 600, 90));
    expect(detectFiveOneOneAlert(contractions)).toBe(false);
  });

  test('returns false when duration too short', () => {
    const contractions = Array.from({ length: 5 }, (_, index) => makeContractionAt(4000 + index * 240, 30));
    expect(detectFiveOneOneAlert(contractions)).toBe(false);
  });

  test('returns false when window too short', () => {
    const contractions = Array.from({ length: 5 }, (_, index) => makeContractionAt(index * 240, 90));
    expect(detectFiveOneOneAlert(contractions)).toBe(false);
  });
});

describe('calculateSessionStats', () => {
  test('returns zeros and null when no contractions', () => {
    const stats = calculateSessionStats({ contractions: [], events: [] });
    expect(stats.totalContractions).toBe(0);
    expect(stats.averageDuration).toBe(0);
    expect(stats.averageInterval).toBe(0);
    expect(stats.regularity).toBeNull();
    expect(stats.alertFiveOneOne).toBe(false);
    expect(stats.lastDilation).toBeNull();
  });

  test('computes correct averages with sample data', () => {
    const contractions = Array.from({ length: 3 }, (_, index) => makeContractionAt(4000 + index * 300, 60));
    const stats = calculateSessionStats({ contractions, events: [] });
    expect(stats.totalContractions).toBe(3);
    expect(stats.averageDuration).toBeCloseTo(60, 0);
    expect(stats.averageInterval).toBeCloseTo(300, 0);
  });

  test('finds last dilation event', () => {
    const events = [
      makeEvent({ id: 'e1', type: EventType.DILATION, value: '4', occurredAt: new Date(Date.now() - 2000) }),
      makeEvent({ id: 'e2', type: EventType.DILATION, value: '6', occurredAt: new Date(Date.now() - 1000) }),
      makeEvent({ id: 'e3', type: EventType.NOTE, value: 'some note', occurredAt: new Date() }),
    ];
    const stats = calculateSessionStats({ contractions: [], events });
    expect(stats.lastDilation).toBe('6');
  });
});
