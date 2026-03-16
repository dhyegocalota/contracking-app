import { Intensity } from '@contracking/shared';

type IntensityChipsProps = {
  value: Intensity | null;
  onChange: (intensity: Intensity) => void;
};

type BarSpec = { height: number };

const INTENSITY_CONFIG: Record<Intensity, { label: string; bars: BarSpec[] }> = {
  [Intensity.MILD]: { label: 'Leve', bars: [{ height: 5 }] },
  [Intensity.MODERATE]: { label: 'Mod.', bars: [{ height: 5 }, { height: 9 }] },
  [Intensity.STRONG]: { label: 'Forte', bars: [{ height: 5 }, { height: 9 }, { height: 14 }] },
};

const BAR_WIDTH = 3.5;
const BAR_BORDER_RADIUS = 1;
const BAR_GAP = 2;
const MAX_BAR_HEIGHT = 14;

type IntensityBarsProps = {
  bars: BarSpec[];
  isActive: boolean;
};

function IntensityBars({ bars, isActive }: IntensityBarsProps) {
  const barColor = isActive ? 'var(--accent)' : 'var(--text-muted)';

  return (
    <svg
      role="img"
      aria-label="intensidade"
      width={bars.length * BAR_WIDTH + (bars.length - 1) * BAR_GAP}
      height={MAX_BAR_HEIGHT}
      style={{ overflow: 'visible' }}
    >
      {bars.map((bar, index) => (
        <rect
          key={bar.height}
          x={index * (BAR_WIDTH + BAR_GAP)}
          y={MAX_BAR_HEIGHT - bar.height}
          width={BAR_WIDTH}
          height={bar.height}
          rx={BAR_BORDER_RADIUS}
          fill={barColor}
        />
      ))}
    </svg>
  );
}

type IntensityChipProps = {
  intensity: Intensity;
  isActive: boolean;
  onPress: (intensity: Intensity) => void;
};

function IntensityChip({ intensity, isActive, onPress }: IntensityChipProps) {
  const config = INTENSITY_CONFIG[intensity];

  const chipStyle = isActive
    ? { background: 'rgba(217,77,115,0.12)', border: '1px solid rgba(217,77,115,0.3)' }
    : { background: 'var(--card-bg)', border: '1px solid var(--card-border)' };

  return (
    <button
      type="button"
      onClick={() => onPress(intensity)}
      className="flex flex-col items-center justify-center gap-1 rounded-[10px]"
      style={{ width: 38, height: 38, ...chipStyle, animation: isActive ? 'scaleIn 0.15s ease' : undefined }}
    >
      <IntensityBars bars={config.bars} isActive={isActive} />
      <span
        className="uppercase tracking-wider"
        style={{ fontSize: 7, color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        {config.label}
      </span>
    </button>
  );
}

export function IntensityChips({ value, onChange }: IntensityChipsProps) {
  const handlePress = (intensity: Intensity) => {
    onChange(value === intensity ? (null as unknown as Intensity) : intensity);
  };

  return (
    <div className="flex gap-2">
      {Object.values(Intensity).map((intensity) => (
        <IntensityChip key={intensity} intensity={intensity} isActive={value === intensity} onPress={handlePress} />
      ))}
    </div>
  );
}
