import { describe, expect, test } from 'bun:test';
import { DateRange } from '@contracking/shared';
import { filterByDateRange } from './filter-by-date';

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
}

describe('filterByDateRange', () => {
  test('TODAY returns only items from today', () => {
    const items = [{ startedAt: minutesAgo(5) }, { startedAt: daysAgo(2) }, { startedAt: daysAgo(5) }];
    const result = filterByDateRange({ items, range: DateRange.TODAY });
    expect(result).toHaveLength(1);
  });

  test('THREE_DAYS returns items from last 3 days', () => {
    const items = [
      { startedAt: minutesAgo(5) },
      { startedAt: daysAgo(2) },
      { startedAt: daysAgo(5) },
      { startedAt: daysAgo(10) },
    ];
    const result = filterByDateRange({ items, range: DateRange.THREE_DAYS });
    expect(result).toHaveLength(2);
  });

  test('SEVEN_DAYS returns items from last 7 days', () => {
    const items = [
      { startedAt: minutesAgo(5) },
      { startedAt: daysAgo(2) },
      { startedAt: daysAgo(5) },
      { startedAt: daysAgo(10) },
    ];
    const result = filterByDateRange({ items, range: DateRange.SEVEN_DAYS });
    expect(result).toHaveLength(3);
  });

  test('THIRTY_DAYS returns items from last 30 days', () => {
    const items = [
      { startedAt: minutesAgo(5) },
      { startedAt: daysAgo(2) },
      { startedAt: daysAgo(10) },
      { startedAt: daysAgo(35) },
    ];
    const result = filterByDateRange({ items, range: DateRange.THIRTY_DAYS });
    expect(result).toHaveLength(3);
  });

  test('CUSTOM filters by date range', () => {
    const items = [{ startedAt: minutesAgo(5) }, { startedAt: daysAgo(3) }, { startedAt: daysAgo(8) }];
    const from = daysAgo(5).toISOString().split('T')[0];
    const to = daysAgo(1).toISOString().split('T')[0];
    const result = filterByDateRange({
      items,
      range: DateRange.CUSTOM,
      customFrom: from,
      customTo: to,
    });
    expect(result).toHaveLength(1);
  });

  test('CUSTOM with no bounds returns all items', () => {
    const items = [{ startedAt: minutesAgo(5) }, { startedAt: daysAgo(35) }];
    const result = filterByDateRange({ items, range: DateRange.CUSTOM });
    expect(result).toHaveLength(2);
  });

  test('works with occurredAt items', () => {
    const items = [{ occurredAt: minutesAgo(5) }, { occurredAt: daysAgo(5) }];
    const result = filterByDateRange({ items, range: DateRange.TODAY });
    expect(result).toHaveLength(1);
  });

  test('returns empty array for empty input', () => {
    const result = filterByDateRange({ items: [], range: DateRange.TODAY });
    expect(result).toHaveLength(0);
  });
});
