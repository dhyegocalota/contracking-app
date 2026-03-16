import { Position } from '@contracking/shared';
import type { LucideIcon } from 'lucide-react';
import { Armchair, ArrowDownToLine, BedSingle, Circle, Footprints, PersonStanding } from 'lucide-react';

type PositionChipsProps = {
  value: Position | null;
  onChange: (position: Position) => void;
};

const ICON_SIZE = 14;

const POSITION_CONFIG: Record<Position, { label: string; Icon: LucideIcon }> = {
  [Position.LYING]: { label: 'Deitada', Icon: BedSingle },
  [Position.SITTING]: { label: 'Sentada', Icon: Armchair },
  [Position.STANDING]: { label: 'Em pé', Icon: PersonStanding },
  [Position.WALKING]: { label: 'Andando', Icon: Footprints },
  [Position.SQUATTING]: { label: 'Cócoras', Icon: ArrowDownToLine },
  [Position.BALL]: { label: 'Bola', Icon: Circle },
};

type PositionChipProps = {
  position: Position;
  isActive: boolean;
  onPress: (position: Position) => void;
};

function PositionChip({ position, isActive, onPress }: PositionChipProps) {
  const { label, Icon } = POSITION_CONFIG[position];

  const chipStyle = isActive
    ? { background: 'rgba(217,77,115,0.12)', border: '1px solid rgba(217,77,115,0.3)' }
    : { background: 'var(--card-bg)', border: '1px solid var(--card-border)' };

  const iconColor = isActive ? 'var(--accent)' : 'var(--text-muted)';

  return (
    <button
      type="button"
      onClick={() => onPress(position)}
      className="flex flex-col items-center justify-center gap-1 rounded-[10px]"
      style={{ width: 38, height: 38, ...chipStyle, animation: isActive ? 'scaleIn 0.15s ease' : undefined }}
    >
      <Icon size={ICON_SIZE} style={{ color: iconColor }} />
      <span className="uppercase tracking-wider" style={{ fontSize: 7, color: iconColor }}>
        {label}
      </span>
    </button>
  );
}

export function PositionChips({ value, onChange }: PositionChipsProps) {
  const handlePress = (position: Position) => {
    onChange(value === position ? (null as unknown as Position) : position);
  };

  return (
    <div className="flex gap-2">
      {Object.values(Position).map((position) => (
        <PositionChip key={position} position={position} isActive={value === position} onPress={handlePress} />
      ))}
    </div>
  );
}
