import { describe, expect, test } from 'bun:test';
import {
  formatAbsoluteDate,
  formatChartTime,
  formatDayHeader,
  formatRelativeTime,
  formatShortDateTime,
  formatTimeWithDate,
  getDayKey,
} from './format-date';

describe('formatTimeWithDate', () => {
  test('returns only time for today', () => {
    const now = new Date();
    const result = formatTimeWithDate(now);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  test('returns date and time for non-today', () => {
    const pastDate = new Date(2024, 2, 14, 10, 30);
    const result = formatTimeWithDate(pastDate);
    expect(result).toBe('14 mar 10:30');
  });
});

describe('formatDayHeader', () => {
  test('returns Hoje for today', () => {
    const result = formatDayHeader(new Date());
    expect(result).toBe('Hoje');
  });

  test('returns Ontem for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatDayHeader(yesterday);
    expect(result).toBe('Ontem');
  });

  test('returns DD MMM for older dates', () => {
    const oldDate = new Date(2024, 0, 15);
    const result = formatDayHeader(oldDate);
    expect(result).toBe('15 jan');
  });
});

describe('formatChartTime', () => {
  test('returns HH:MM when includeDate is false', () => {
    const date = new Date(2024, 2, 14, 10, 30);
    const result = formatChartTime({ date, includeDate: false });
    expect(result).toBe('10:30');
  });

  test('returns DD/MM HH:MM when includeDate is true', () => {
    const date = new Date(2024, 2, 14, 10, 30);
    const result = formatChartTime({ date, includeDate: true });
    expect(result).toBe('14/03 10:30');
  });
});

describe('getDayKey', () => {
  test('returns consistent key for same day', () => {
    const morning = new Date(2024, 2, 14, 8, 0);
    const evening = new Date(2024, 2, 14, 20, 0);
    expect(getDayKey(morning)).toBe(getDayKey(evening));
  });

  test('returns different keys for different days', () => {
    const day1 = new Date(2024, 2, 14);
    const day2 = new Date(2024, 2, 15);
    expect(getDayKey(day1)).not.toBe(getDayKey(day2));
  });
});

describe('formatRelativeTime', () => {
  test('returns minutes and seconds for less than 1 hour', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000 - 30 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('5min 30s');
  });

  test('returns only seconds when less than 1 minute', () => {
    const date = new Date(Date.now() - 45 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('45s');
  });

  test('returns 0s for just now', () => {
    const result = formatRelativeTime(new Date());
    expect(result).toBe('0s');
  });

  test('returns hours and minutes for 1-24 hours', () => {
    const date = new Date(Date.now() - 2 * 3600 * 1000 - 15 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('2h 15min');
  });

  test('returns only hours when minutes is zero', () => {
    const date = new Date(Date.now() - 3 * 3600 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('3h');
  });

  test('returns days for 1-7 days', () => {
    const date = new Date(Date.now() - 3 * 86400 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('3 dias atrás');
  });

  test('returns absolute date for more than 7 days', () => {
    const date = new Date(2024, 0, 15);
    const result = formatRelativeTime(date);
    expect(result).toBe('15/01/2024');
  });
});

describe('formatAbsoluteDate', () => {
  test('returns DD/MM/YYYY format', () => {
    const result = formatAbsoluteDate(new Date(2024, 2, 5));
    expect(result).toBe('05/03/2024');
  });
});

describe('formatShortDateTime', () => {
  test('returns DD/MM às HH:MM format', () => {
    const result = formatShortDateTime(new Date(2024, 2, 14, 10, 30));
    expect(result).toBe('14/03 às 10:30');
  });
});
