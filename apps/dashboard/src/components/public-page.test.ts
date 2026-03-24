import { describe, expect, test } from 'bun:test';

type MinimalContraction = {
  startedAt: Date | string;
};

function findFirstContractionTime(contractions: MinimalContraction[]): string | null {
  const sorted = [...contractions].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return sorted[0]?.startedAt ? new Date(sorted[0].startedAt).toISOString() : null;
}

function formatTime(date: Date | string, timezone: string | null): string {
  const d = new Date(date);
  if (timezone) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

describe('first contraction time', () => {
  test('returns null for empty contractions', () => {
    expect(findFirstContractionTime([])).toBeNull();
  });

  test('returns earliest contraction time', () => {
    const contractions = [
      { startedAt: '2026-03-24T15:00:00.000Z' },
      { startedAt: '2026-03-24T14:00:00.000Z' },
      { startedAt: '2026-03-24T16:00:00.000Z' },
    ];
    expect(findFirstContractionTime(contractions)).toBe('2026-03-24T14:00:00.000Z');
  });

  test('handles single contraction', () => {
    const contractions = [{ startedAt: '2026-03-24T10:30:00.000Z' }];
    expect(findFirstContractionTime(contractions)).toBe('2026-03-24T10:30:00.000Z');
  });

  test('handles Date objects', () => {
    const contractions = [
      { startedAt: new Date('2026-03-24T12:00:00.000Z') },
      { startedAt: new Date('2026-03-24T11:00:00.000Z') },
    ];
    expect(findFirstContractionTime(contractions)).toBe('2026-03-24T11:00:00.000Z');
  });
});

describe('formatTime with timezone', () => {
  test('formats time in specified timezone', () => {
    const result = formatTime('2026-03-24T18:00:00.000Z', 'America/Sao_Paulo');
    expect(result).toBe('15:00');
  });

  test('formats time in UTC timezone', () => {
    const result = formatTime('2026-03-24T18:00:00.000Z', 'UTC');
    expect(result).toBe('18:00');
  });

  test('formats time without timezone using local time', () => {
    const date = new Date('2026-03-24T18:00:00.000Z');
    const result = formatTime(date, null);
    const expected = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});
