import { describe, expect, test } from 'bun:test';

function combineDateAndTime({ date, time }: { date: string; time: string }): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(year!, month! - 1, day!, hours, minutes);
  return combined.toISOString();
}

function toTimeValue(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toDateValue(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('edit event time helpers', () => {
  test('toTimeValue extracts HH:MM from Date', () => {
    const date = new Date(2026, 2, 24, 15, 30);
    expect(toTimeValue(date)).toBe('15:30');
  });

  test('toTimeValue extracts from ISO string', () => {
    const date = new Date(2026, 2, 24, 8, 5);
    expect(toTimeValue(date.toISOString())).toBe('08:05');
  });

  test('toDateValue extracts YYYY-MM-DD from Date', () => {
    const date = new Date(2026, 2, 24);
    expect(toDateValue(date)).toBe('2026-03-24');
  });

  test('combineDateAndTime produces valid ISO string', () => {
    const result = combineDateAndTime({ date: '2026-03-24', time: '15:30' });
    const parsed = new Date(result);
    expect(parsed.getHours()).toBe(15);
    expect(parsed.getMinutes()).toBe(30);
    expect(parsed.getDate()).toBe(24);
  });

  test('changing time preserves date', () => {
    const original = new Date(2026, 2, 24, 10, 0);
    const date = toDateValue(original);
    const newTime = '14:45';
    const result = combineDateAndTime({ date, time: newTime });
    const parsed = new Date(result);
    expect(parsed.getDate()).toBe(24);
    expect(parsed.getHours()).toBe(14);
    expect(parsed.getMinutes()).toBe(45);
  });

  test('changing date preserves time', () => {
    const original = new Date(2026, 2, 24, 10, 30);
    const time = toTimeValue(original);
    const newDate = '2026-03-25';
    const result = combineDateAndTime({ date: newDate, time });
    const parsed = new Date(result);
    expect(parsed.getDate()).toBe(25);
    expect(parsed.getHours()).toBe(10);
    expect(parsed.getMinutes()).toBe(30);
  });
});
