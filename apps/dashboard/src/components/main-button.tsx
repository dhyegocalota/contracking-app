import { CONTRACTION_TIMEOUT_SECONDS, CONTRACTION_WARNING_SECONDS } from '@contracking/shared';
import { formatRelativeTime } from '../utils/format-date';

type MainButtonProps = {
  isActive: boolean;
  elapsedSeconds: number;
  lastContractionAt: Date | null;
  onPress: () => void;
};

const IDLE_GLOW = '0 0 60px rgba(185,58,94,0.25)';
const ACTIVE_GLOW = '0 0 80px rgba(185,58,94,0.35), 0 0 120px rgba(185,58,94,0.15)';
const WARNING_GLOW = '0 0 80px rgba(255,167,38,0.35), 0 0 120px rgba(255,167,38,0.15)';
const DANGER_GLOW = '0 0 80px rgba(239,68,68,0.35), 0 0 120px rgba(239,68,68,0.15)';

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatLastContraction(lastContractionAt: Date | null): string {
  if (!lastContractionAt) return '';
  return `Última contração há ${formatRelativeTime(lastContractionAt)}`;
}

function resolveGlow({ isActive, elapsedSeconds }: { isActive: boolean; elapsedSeconds: number }): string {
  if (!isActive) return IDLE_GLOW;
  if (elapsedSeconds > CONTRACTION_WARNING_SECONDS) return DANGER_GLOW;
  if (elapsedSeconds > CONTRACTION_TIMEOUT_SECONDS) return WARNING_GLOW;
  return ACTIVE_GLOW;
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
  const glow = resolveGlow({ isActive, elapsedSeconds });
  const subtitle = resolveSubtitle({ isActive, elapsedSeconds, lastContractionAt });

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex flex-col items-center justify-center w-[140px] h-[140px] rounded-full bg-gradient-to-br from-accent-dark to-accent"
      style={{
        boxShadow: glow,
        transition: 'all 0.3s ease',
        animation: isActive ? 'pulseGlow 2s ease-in-out infinite' : undefined,
      }}
    >
      <span
        className="text-2xl font-semibold text-white"
        style={{ fontVariantNumeric: isActive ? 'tabular-nums' : undefined }}
      >
        {isActive ? formatTime(elapsedSeconds) : 'Iniciar'}
      </span>
      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {subtitle}
      </span>
    </button>
  );
}
