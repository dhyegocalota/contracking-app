import { describe, expect, test } from 'bun:test';
import type { Contraction } from '@contracking/shared';
import { Intensity } from '@contracking/shared';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}min`;
}

function formatInterval(seconds: number): string {
  return `${Math.round(seconds / 60)}min`;
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const INTENSITY_VALUE: Record<Intensity, number> = {
  [Intensity.MILD]: 1,
  [Intensity.MODERATE]: 2,
  [Intensity.STRONG]: 3,
};

type DataPoint = {
  value: number;
  time: string;
};

function buildIntervalData(contractions: Contraction[]): DataPoint[] {
  const completed = contractions.filter((c) => c.endedAt !== null);
  return completed
    .map((contraction, index) => {
      const previous = completed[index - 1];
      if (!previous?.endedAt) return null;
      const diffMs = new Date(contraction.startedAt).getTime() - new Date(previous.endedAt).getTime();
      return { value: diffMs / 60000, time: formatTime(contraction.startedAt) };
    })
    .filter((point): point is DataPoint => point !== null);
}

function buildDurationData(contractions: Contraction[]): DataPoint[] {
  return contractions
    .filter((c) => c.endedAt !== null)
    .map((c) => ({
      value: (new Date(c.endedAt as string).getTime() - new Date(c.startedAt).getTime()) / 1000,
      time: formatTime(c.startedAt),
    }));
}

function buildIntensityData(contractions: Contraction[]): DataPoint[] {
  return contractions
    .filter((c) => c.intensity !== null)
    .map((c) => ({
      value: INTENSITY_VALUE[c.intensity as Intensity],
      time: formatTime(c.startedAt),
    }));
}

const CHART_WIDTH = 400;
const CHART_HEIGHT = 120;

function buildPoints(data: DataPoint[]): { x: number; y: number }[] {
  if (data.length === 0) return [];

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  return data.map((point, index) => ({
    x: data.length === 1 ? CHART_WIDTH / 2 : (index / (data.length - 1)) * CHART_WIDTH,
    y: CHART_HEIGHT - ((point.value - minValue) / range) * (CHART_HEIGHT - 20) - 10,
  }));
}

function makeContraction(overrides: Partial<Contraction> = {}): Contraction {
  return {
    id: 'c1',
    userId: 'u1',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    endedAt: new Date('2024-01-01T10:01:00Z'),
    intensity: null,
    position: null,
    notes: null,
    ...overrides,
  };
}

describe('formatDuration', () => {
  test('formats seconds under 60 with s suffix', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  test('formats exactly 60 seconds as 1min', () => {
    expect(formatDuration(60)).toBe('1min');
  });

  test('rounds to nearest minute', () => {
    expect(formatDuration(90)).toBe('2min');
  });

  test('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  test('formats 59 seconds with s suffix', () => {
    expect(formatDuration(59)).toBe('59s');
  });
});

describe('formatInterval', () => {
  test('formats 300 seconds as 5min', () => {
    expect(formatInterval(300)).toBe('5min');
  });

  test('formats 0 seconds as 0min', () => {
    expect(formatInterval(0)).toBe('0min');
  });

  test('rounds to nearest minute', () => {
    expect(formatInterval(90)).toBe('2min');
  });
});

describe('buildIntervalData', () => {
  test('returns empty array for empty contractions', () => {
    expect(buildIntervalData([])).toEqual([]);
  });

  test('returns empty array for single contraction', () => {
    const contractions = [makeContraction()];
    expect(buildIntervalData(contractions)).toEqual([]);
  });

  test('skips contractions without endedAt', () => {
    const contractions = [makeContraction({ endedAt: null })];
    expect(buildIntervalData(contractions)).toEqual([]);
  });

  test('computes interval between two completed contractions in minutes', () => {
    const contractions = [
      makeContraction({
        id: 'c1',
        startedAt: new Date('2024-01-01T10:00:00Z'),
        endedAt: new Date('2024-01-01T10:01:00Z'),
      }),
      makeContraction({
        id: 'c2',
        startedAt: new Date('2024-01-01T10:06:00Z'),
        endedAt: new Date('2024-01-01T10:07:00Z'),
      }),
    ];
    const result = buildIntervalData(contractions);
    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBeCloseTo(5, 1);
  });
});

describe('buildDurationData', () => {
  test('returns empty array for empty contractions', () => {
    expect(buildDurationData([])).toEqual([]);
  });

  test('excludes contractions without endedAt', () => {
    const contractions = [makeContraction({ endedAt: null })];
    expect(buildDurationData(contractions)).toEqual([]);
  });

  test('computes duration in seconds', () => {
    const contractions = [
      makeContraction({
        startedAt: new Date('2024-01-01T10:00:00Z'),
        endedAt: new Date('2024-01-01T10:01:30Z'),
      }),
    ];
    const result = buildDurationData(contractions);
    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBe(90);
  });
});

describe('buildIntensityData', () => {
  test('returns empty array for empty contractions', () => {
    expect(buildIntensityData([])).toEqual([]);
  });

  test('excludes contractions without intensity', () => {
    const contractions = [makeContraction({ intensity: null })];
    expect(buildIntensityData(contractions)).toEqual([]);
  });

  test('maps mild intensity to value 1', () => {
    const contractions = [makeContraction({ intensity: Intensity.MILD })];
    const result = buildIntensityData(contractions);
    expect(result[0]!.value).toBe(1);
  });

  test('maps moderate intensity to value 2', () => {
    const contractions = [makeContraction({ intensity: Intensity.MODERATE })];
    const result = buildIntensityData(contractions);
    expect(result[0]!.value).toBe(2);
  });

  test('maps strong intensity to value 3', () => {
    const contractions = [makeContraction({ intensity: Intensity.STRONG })];
    const result = buildIntensityData(contractions);
    expect(result[0]!.value).toBe(3);
  });
});

describe('buildPoints', () => {
  test('returns empty array for empty data', () => {
    expect(buildPoints([])).toEqual([]);
  });

  test('centers single point horizontally', () => {
    const data = [{ value: 5, time: '10:00' }];
    const points = buildPoints(data);
    expect(points).toHaveLength(1);
    expect(points[0]!.x).toBe(CHART_WIDTH / 2);
  });

  test('first point of multiple starts at x=0', () => {
    const data = [
      { value: 1, time: '10:00' },
      { value: 2, time: '10:05' },
    ];
    const points = buildPoints(data);
    expect(points[0]!.x).toBe(0);
  });

  test('last point of multiple ends at x=CHART_WIDTH', () => {
    const data = [
      { value: 1, time: '10:00' },
      { value: 2, time: '10:05' },
    ];
    const points = buildPoints(data);
    expect(points[points.length - 1]!.x).toBe(CHART_WIDTH);
  });

  test('normalizes y values within chart bounds', () => {
    const data = [
      { value: 0, time: '10:00' },
      { value: 10, time: '10:05' },
    ];
    const points = buildPoints(data);
    const yValues = points.map((p) => p.y);
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...yValues)).toBeLessThanOrEqual(CHART_HEIGHT);
  });

  test('handles equal values without division by zero', () => {
    const data = [
      { value: 5, time: '10:00' },
      { value: 5, time: '10:05' },
    ];
    const points = buildPoints(data);
    expect(points).toHaveLength(2);
    expect(points[0]!.y).toBe(points[1]!.y);
  });
});
