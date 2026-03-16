import type { Contraction, Intensity, Position } from '@contracking/shared';
import { useState } from 'react';
import { IntensityChips } from './intensity-chips';
import { PositionChips } from './position-chips';

type EditContractionProps = {
  contraction: Contraction;
  onSave: (data: { intensity: Intensity | null; position: Position | null; notes: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function EditContraction({ contraction, onSave, onDelete, onClose: _ }: EditContractionProps) {
  const [intensity, setIntensity] = useState<Intensity | null>(contraction.intensity);
  const [position, setPosition] = useState<Position | null>(contraction.position);
  const [notes, setNotes] = useState(contraction.notes ?? '');

  const handleIntensityChange = (value: Intensity) => {
    setIntensity(intensity === value ? null : value);
  };

  const handlePositionChange = (value: Position) => {
    setPosition(position === value ? null : value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            Início
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatDateTime(contraction.startedAt)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            Fim
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatDateTime(contraction.endedAt)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
          Intensidade
        </span>
        <IntensityChips value={intensity} onChange={handleIntensityChange} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
          Posição
        </span>
        <PositionChips value={position} onChange={handlePositionChange} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
          Notas
        </span>
        <textarea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Observações..."
          className="w-full p-3 rounded-[10px] text-sm resize-none outline-none"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => onSave({ intensity, position, notes })}
        className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white"
        style={{ background: 'var(--accent)' }}
      >
        Salvar
      </button>
      <button
        type="button"
        onClick={() => onDelete(contraction.id)}
        className="w-full py-2 text-sm font-medium"
        style={{ color: 'var(--accent)' }}
      >
        Excluir
      </button>
    </div>
  );
}
