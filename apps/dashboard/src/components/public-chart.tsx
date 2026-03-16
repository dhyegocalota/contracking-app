import type { Contraction } from '@contracking/shared';
import { Intensity } from '@contracking/shared';
import { useState } from 'react';
import { formatChartTime, getDayKey } from '../utils/format-date';

type Tab = 'interval' | 'duration' | 'intensity';

const TAB_LABELS: Record<Tab, string> = {
  interval: 'Intervalo',
  duration: 'Duração',
  intensity: 'Intensidade',
};

const TABS: Tab[] = ['interval', 'duration', 'intensity'];

const INTENSITY_VALUE: Record<Intensity, number> = {
  [Intensity.MILD]: 1,
  [Intensity.MODERATE]: 2,
  [Intensity.STRONG]: 3,
};

const CHART_WIDTH = 400;
const CHART_HEIGHT = 120;
const Y_AXIS_WIDTH = 30;
const GRID_LINE_Y_POSITIONS = [30, 60, 90];
const DOT_RADIUS = 3;

type DataPoint = {
  value: number;
  date: Date;
};

type YAxisConfig = {
  unit: string;
  labels: { value: string; y: number }[];
};

const INTERVAL_Y_AXIS: YAxisConfig = {
  unit: 'min',
  labels: [
    { value: '20', y: 10 },
    { value: '15', y: 37 },
    { value: '10', y: 64 },
    { value: '5', y: 91 },
    { value: '0', y: 118 },
  ],
};

const DURATION_Y_AXIS: YAxisConfig = {
  unit: 'seg',
  labels: [
    { value: '90', y: 10 },
    { value: '60', y: 42 },
    { value: '30', y: 74 },
    { value: '0', y: 118 },
  ],
};

const INTENSITY_Y_AXIS: YAxisConfig = {
  unit: 'nível',
  labels: [
    { value: 'Forte', y: 20 },
    { value: 'Mod', y: 60 },
    { value: 'Leve', y: 100 },
  ],
};

const Y_AXIS_BY_TAB: Record<Tab, YAxisConfig> = {
  interval: INTERVAL_Y_AXIS,
  duration: DURATION_Y_AXIS,
  intensity: INTENSITY_Y_AXIS,
};

function buildIntervalData(contractions: Contraction[]): DataPoint[] {
  const completed = contractions.filter((contraction) => contraction.endedAt !== null);
  return completed
    .map((contraction, index) => {
      const previous = completed[index - 1];
      if (!previous?.endedAt) return null;
      const diffMs = new Date(contraction.startedAt).getTime() - new Date(previous.endedAt).getTime();
      return { value: diffMs / 60000, date: new Date(contraction.startedAt) };
    })
    .filter((point): point is DataPoint => point !== null);
}

function buildDurationData(contractions: Contraction[]): DataPoint[] {
  return contractions
    .filter((contraction) => contraction.endedAt !== null)
    .map((contraction) => ({
      value: (new Date(contraction.endedAt as string).getTime() - new Date(contraction.startedAt).getTime()) / 1000,
      date: new Date(contraction.startedAt),
    }));
}

function buildIntensityData(contractions: Contraction[]): DataPoint[] {
  return contractions
    .filter((contraction) => contraction.intensity !== null)
    .map((contraction) => ({
      value: INTENSITY_VALUE[contraction.intensity as Intensity],
      date: new Date(contraction.startedAt),
    }));
}

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

function spansMultipleDays(data: DataPoint[]): boolean {
  if (data.length < 2) return false;
  const dayKeys = new Set(data.map((point) => getDayKey(point.date)));
  return dayKeys.size > 1;
}

type PublicChartProps = {
  contractions: Contraction[];
};

export function PublicChart({ contractions }: PublicChartProps) {
  const [activeTab, setActiveTab] = useState<Tab>('interval');

  const dataBuilders: Record<Tab, () => DataPoint[]> = {
    interval: () => buildIntervalData(contractions),
    duration: () => buildDurationData(contractions),
    intensity: () => buildIntensityData(contractions),
  };

  const data = dataBuilders[activeTab]();
  const points = buildPoints(data);
  const pathData = points.length > 1 ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';
  const fillData =
    points.length > 1
      ? `M ${points[0].x},${CHART_HEIGHT} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${CHART_HEIGHT} Z`
      : '';

  const includeDate = spansMultipleDays(data);
  const yAxis = Y_AXIS_BY_TAB[activeTab];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="px-2.5 py-1 rounded-md"
            style={{
              fontSize: 10,
              background: activeTab === tab ? 'rgba(217,77,115,0.1)' : 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div className="flex">
        <div
          className="flex flex-col justify-between flex-shrink-0 relative"
          style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT }}
        >
          {yAxis.labels.map((label) => (
            <span
              key={label.value}
              className="absolute right-1"
              style={{ fontSize: 8, color: 'var(--text-faint)', top: label.y, transform: 'translateY(-50%)' }}
            >
              {label.value}
            </span>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          <div
            className="relative"
            style={{
              height: CHART_HEIGHT,
              borderBottom: '1px solid var(--divider)',
              borderLeft: '1px solid var(--divider)',
            }}
          >
            <svg
              role="img"
              aria-label={TAB_LABELS[activeTab]}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', display: 'block' }}
            >
              {GRID_LINE_Y_POSITIONS.map((y) => (
                <line key={y} x1={0} y1={y} x2={CHART_WIDTH} y2={y} stroke="var(--divider)" strokeWidth={1} />
              ))}
              {fillData && <path d={fillData} fill="rgba(217,77,115,0.08)" />}
              {pathData && (
                <path d={pathData} fill="none" stroke="rgba(217,77,115,0.5)" strokeWidth={2} strokeLinecap="round" />
              )}
              {points.map((point, index) => (
                <circle
                  key={data[index].date.getTime()}
                  cx={point.x}
                  cy={point.y}
                  r={DOT_RADIUS}
                  fill="var(--accent)"
                />
              ))}
            </svg>
            <div
              className="flex justify-between absolute bottom-0 left-0 right-0"
              style={{ transform: 'translateY(100%)' }}
            >
              {data.slice(0, 5).map((point) => (
                <span
                  key={point.date.getTime()}
                  style={{ fontSize: 8, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatChartTime({ date: point.date, includeDate })}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
