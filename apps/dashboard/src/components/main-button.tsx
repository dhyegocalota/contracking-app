import { CONTRACTION_TIMEOUT_SECONDS, CONTRACTION_WARNING_SECONDS } from '@contracking/shared';
import { formatRelativeTime } from '../utils/format-date';

type MainButtonProps = {
  isActive: boolean;
  elapsedSeconds: number;
  lastContractionAt: Date | null;
  onPress: () => void;
};

const IDLE_GLOW = '0 0 40px rgba(185,58,94,0.15)';
const ACTIVE_PULSE_COLOR = 'rgba(239,68,68,0.25)';
const ACTIVE_PULSE_COLOR_INTENSE = 'rgba(239,68,68,0.4)';
const WARNING_PULSE_COLOR = 'rgba(255,167,38,0.25)';
const WARNING_PULSE_COLOR_INTENSE = 'rgba(255,167,38,0.4)';
const DANGER_PULSE_COLOR = 'rgba(239,68,68,0.25)';
const DANGER_PULSE_COLOR_INTENSE = 'rgba(239,68,68,0.4)';

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatLastContraction(lastContractionAt: Date | null): string {
  if (!lastContractionAt) return '';
  return `Última há ${formatRelativeTime(lastContractionAt)}`;
}

type PulseColors = { pulseColor: string; pulseColorIntense: string };

function resolvePulseColors({ elapsedSeconds }: { elapsedSeconds: number }): PulseColors {
  if (elapsedSeconds > CONTRACTION_WARNING_SECONDS)
    return { pulseColor: DANGER_PULSE_COLOR, pulseColorIntense: DANGER_PULSE_COLOR_INTENSE };
  if (elapsedSeconds > CONTRACTION_TIMEOUT_SECONDS)
    return { pulseColor: WARNING_PULSE_COLOR, pulseColorIntense: WARNING_PULSE_COLOR_INTENSE };
  return { pulseColor: ACTIVE_PULSE_COLOR, pulseColorIntense: ACTIVE_PULSE_COLOR_INTENSE };
}

function resolveSubtitle({
  isActive,
  elapsedSeconds,
  lastContractionAt,
}: {
  isActive: boolean;
  elapsedSeconds: number;
  lastContractionAt: Date | null;
}): string {
  if (!isActive) return formatLastContraction(lastContractionAt);
  if (elapsedSeconds > CONTRACTION_WARNING_SECONDS) return 'esqueceu de parar?';
  if (elapsedSeconds > CONTRACTION_TIMEOUT_SECONDS) return 'contração longa!';
  return 'toque para parar';
}

export function MainButton({ isActive, elapsedSeconds, lastContractionAt, onPress }: MainButtonProps) {
  const pulseColors = isActive ? resolvePulseColors({ elapsedSeconds }) : null;
  const subtitle = resolveSubtitle({ isActive, elapsedSeconds, lastContractionAt });

  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex flex-col items-center justify-center w-[140px] h-[140px] rounded-full ${isActive ? 'bg-gradient-to-br from-stop-dark to-stop' : ''}`}
      style={
        {
          boxShadow: isActive ? undefined : IDLE_GLOW,
          border: isActive ? undefined : '2px solid var(--accent)',
          background: isActive ? undefined : 'transparent',
          transition: 'all 0.3s ease',
          animation: isActive ? 'pulseGlow 2s ease-in-out infinite' : undefined,
          '--pulse-color': pulseColors?.pulseColor,
          '--pulse-color-intense': pulseColors?.pulseColorIntense,
        } as React.CSSProperties
      }
    >
      <span
        className="text-2xl font-semibold"
        style={{
          fontVariantNumeric: isActive ? 'tabular-nums' : undefined,
          color: isActive ? 'white' : 'var(--accent)',
        }}
      >
        {isActive ? formatTime(elapsedSeconds) : 'Iniciar'}
      </span>
      <span className="text-[11px]" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
        {subtitle}
      </span>
    </button>
  );
}
