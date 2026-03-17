import type { Contraction, Intensity, Position } from '@contracking/shared';
import { useState } from 'react';
import { IntensityChips } from './intensity-chips';
import { PositionChips } from './position-chips';

type EditContractionData = {
  startedAt: string;
  endedAt: string | null;
  intensity: Intensity | null;
  position: Position | null;
  notes: string;
};

type EditContractionProps = {
  contraction: Contraction;
  onSave: (data: EditContractionData) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

function toTimeValue(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function toDateValue(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function combineDateAndTime({ date, time }: { date: string; time: string }): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const combined = new Date(year!, month! - 1, day!, hours, minutes, seconds ?? 0);
  return combined.toISOString();
}

const INPUT_STYLE = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: 0,
  fontVariantNumeric: 'tabular-nums' as const,
  fontFamily: 'inherit',
};

const TIME_PATTERN = /^\d{0,2}:?\d{0,2}:?\d{0,2}$/;

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
}

function TimeField({
  label,
  time,
  date,
  onTimeChange,
  onDateChange,
}: {
  label: string;
  time: string;
  date: string;
  onTimeChange: (value: string) => void;
  onDateChange: (value: string) => void;
}) {
  const handleTimeInput = (raw: string) => {
    const formatted = formatTimeInput(raw);
    if (TIME_PATTERN.test(formatted)) onTimeChange(formatted);
  };

  return (
    <div
      className="flex-1 flex flex-col gap-1 p-3 rounded-[10px]"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="HH:MM:SS"
        value={time}
        onChange={(event) => handleTimeInput(event.target.value)}
        className="w-full"
        style={{ ...INPUT_STYLE, fontSize: 22, color: 'var(--text-primary)', fontWeight: 600 }}
      />
      <input
        type="date"
        value={date}
        onChange={(event) => onDateChange(event.target.value)}
        className="w-full"
        style={{ ...INPUT_STYLE, fontSize: 11, color: 'var(--text-faint)' }}
      />
    </div>
  );
}

export function EditContraction({ contraction, onSave, onDelete, onClose: _ }: EditContractionProps) {
  const [startTime, setStartTime] = useState(toTimeValue(contraction.startedAt));
  const [startDate, setStartDate] = useState(toDateValue(contraction.startedAt));
  const [endTime, setEndTime] = useState(toTimeValue(contraction.endedAt));
  const [endDate, setEndDate] = useState(toDateValue(contraction.endedAt));
  const [intensity, setIntensity] = useState<Intensity | null>(contraction.intensity);
  const [position, setPosition] = useState<Position | null>(contraction.position);
  const [notes, setNotes] = useState(contraction.notes ?? '');

  const handleIntensityChange = (value: Intensity) => {
    setIntensity(intensity === value ? null : value);
  };

  const handlePositionChange = (value: Position) => {
    setPosition(position === value ? null : value);
  };

  const hasEnd = endTime !== '' && endDate !== '';

  const handleSave = () => {
    const startedAt = combineDateAndTime({ date: startDate, time: startTime });
    const endedAt = hasEnd ? combineDateAndTime({ date: endDate, time: endTime }) : null;
    onSave({ startedAt, endedAt, intensity, position, notes });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <TimeField
          label="Início"
          time={startTime}
          date={startDate}
          onTimeChange={setStartTime}
          onDateChange={setStartDate}
        />
        {contraction.endedAt && (
          <TimeField label="Fim" time={endTime} date={endDate} onTimeChange={setEndTime} onDateChange={setEndDate} />
        )}
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
        onClick={handleSave}
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
