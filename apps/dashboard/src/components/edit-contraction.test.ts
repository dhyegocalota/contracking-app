import { describe, expect, test } from 'bun:test';

function combineDateAndTime({ date, time }: { date: string; time: string }): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const combined = new Date(year!, month! - 1, day!, hours, minutes, seconds ?? 0);
  return combined.toISOString();
}

function computeEndTime({
  startDate,
  startTime,
  durationSeconds,
}: {
  startDate: string;
  startTime: string;
  durationSeconds: number;
}): { time: string; date: string } {
  const startIso = combineDateAndTime({ date: startDate, time: startTime });
  const endMs = new Date(startIso).getTime() + durationSeconds * 1000;
  const endDate = new Date(endMs);
  return {
    time: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:${String(endDate.getSeconds()).padStart(2, '0')}`,
    date: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
  };
}

function computeDurationSeconds({
  startDate,
  startTime,
  endDate,
  endTime,
}: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}): number {
  const startMs = new Date(combineDateAndTime({ date: startDate, time: startTime })).getTime();
  const endMs = new Date(combineDateAndTime({ date: endDate, time: endTime })).getTime();
  return Math.round((endMs - startMs) / 1000);
}

describe('computeEndTime', () => {
  test('adds 60 seconds to start time', () => {
    const result = computeEndTime({ startDate: '2026-03-24', startTime: '10:00:00', durationSeconds: 60 });
    expect(result.time).toBe('10:01:00');
    expect(result.date).toBe('2026-03-24');
  });

  test('adds 90 seconds to start time', () => {
    const result = computeEndTime({ startDate: '2026-03-24', startTime: '10:00:00', durationSeconds: 90 });
    expect(result.time).toBe('10:01:30');
    expect(result.date).toBe('2026-03-24');
  });

  test('adds 300 seconds (5 min) to start time', () => {
    const result = computeEndTime({ startDate: '2026-03-24', startTime: '14:30:00', durationSeconds: 300 });
    expect(result.time).toBe('14:35:00');
    expect(result.date).toBe('2026-03-24');
  });

  test('rolls over to next hour', () => {
    const result = computeEndTime({ startDate: '2026-03-24', startTime: '23:59:00', durationSeconds: 120 });
    expect(result.time).toBe('00:01:00');
    expect(result.date).toBe('2026-03-25');
  });

  test('handles 5 seconds minimum duration', () => {
    const result = computeEndTime({ startDate: '2026-03-24', startTime: '08:00:00', durationSeconds: 5 });
    expect(result.time).toBe('08:00:05');
    expect(result.date).toBe('2026-03-24');
  });
});

describe('computeDurationSeconds', () => {
  test('computes 60 seconds between two times', () => {
    const result = computeDurationSeconds({
      startDate: '2026-03-24',
      startTime: '10:00:00',
      endDate: '2026-03-24',
      endTime: '10:01:00',
    });
    expect(result).toBe(60);
  });

  test('computes 45 seconds', () => {
    const result = computeDurationSeconds({
      startDate: '2026-03-24',
      startTime: '10:00:00',
      endDate: '2026-03-24',
      endTime: '10:00:45',
    });
    expect(result).toBe(45);
  });

  test('handles cross-midnight duration', () => {
    const result = computeDurationSeconds({
      startDate: '2026-03-24',
      startTime: '23:59:00',
      endDate: '2026-03-25',
      endTime: '00:01:00',
    });
    expect(result).toBe(120);
  });
});

describe('duration slider roundtrip', () => {
  test('setting duration via slider produces same duration when recomputed', () => {
    const startDate = '2026-03-24';
    const startTime = '10:00:00';
    const targetDuration = 75;

    const endResult = computeEndTime({ startDate, startTime, durationSeconds: targetDuration });
    const recomputed = computeDurationSeconds({
      startDate,
      startTime,
      endDate: endResult.date,
      endTime: endResult.time,
    });

    expect(recomputed).toBe(targetDuration);
  });

  test('roundtrip works for various durations', () => {
    const startDate = '2026-03-24';
    const startTime = '15:30:00';

    for (const duration of [5, 30, 60, 90, 120, 180, 240, 300]) {
      const endResult = computeEndTime({ startDate, startTime, durationSeconds: duration });
      const recomputed = computeDurationSeconds({
        startDate,
        startTime,
        endDate: endResult.date,
        endTime: endResult.time,
      });
      expect(recomputed).toBe(duration);
    }
  });
});
