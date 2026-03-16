import { DateRange } from '@contracking/shared';

const DAYS_BY_RANGE: Partial<Record<DateRange, number>> = {
  [DateRange.TODAY]: 0,
  [DateRange.THREE_DAYS]: 3,
  [DateRange.SEVEN_DAYS]: 7,
  [DateRange.THIRTY_DAYS]: 30,
};

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getDateFromItem(item: { startedAt?: Date; occurredAt?: Date }): Date {
  if (item.startedAt) return new Date(item.startedAt);
  if (item.occurredAt) return new Date(item.occurredAt);
  return new Date();
}

export function filterByDateRange<T extends { startedAt: Date } | { occurredAt: Date }>({
  items,
  range,
  customFrom,
  customTo,
}: {
  items: T[];
  range: DateRange;
  customFrom?: string | null;
  customTo?: string | null;
}): T[] {
  const now = new Date();

  if (range === DateRange.CUSTOM) {
    const from = customFrom ? startOfDay(new Date(customFrom)) : null;
    const to = customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : null;
    return items.filter((item) => {
      const date = getDateFromItem(item);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });
  }

  const days = DAYS_BY_RANGE[range] ?? 0;
  const cutoff = startOfDay(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));
  return items.filter((item) => getDateFromItem(item) >= cutoff);
}
