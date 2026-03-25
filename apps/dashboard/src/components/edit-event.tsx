import type { Event } from '@contracking/shared';
import { EventType } from '@contracking/shared';
import { useState } from 'react';

const EVENT_LABEL: Record<EventType, string> = {
  [EventType.WATER_BREAK]: 'Bolsa',
  [EventType.MEAL]: 'Refeição',
  [EventType.DILATION]: 'Dilatação',
  [EventType.NOTE]: 'Nota',
};

type EditEventData = {
  value: string | null;
  occurredAt: string;
};

type EditEventProps = {
  event: Event;
  onSave: (data: EditEventData) => void;
  onDelete: (id: string) => void;
};

function toTimeValue(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toDateValue(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function combineDateAndTime({ date, time }: { date: string; time: string }): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(year!, month! - 1, day!, hours, minutes);
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

const HAS_VALUE: Record<EventType, boolean> = {
  [EventType.WATER_BREAK]: false,
  [EventType.MEAL]: false,
  [EventType.DILATION]: true,
  [EventType.NOTE]: true,
};

const VALUE_PLACEHOLDER: Record<EventType, string> = {
  [EventType.WATER_BREAK]: '',
  [EventType.MEAL]: '',
  [EventType.DILATION]: 'Ex: 4',
  [EventType.NOTE]: 'Observações...',
};

export function EditEvent({ event, onSave, onDelete }: EditEventProps) {
  const [time, setTime] = useState(toTimeValue(event.occurredAt));
  const [date, setDate] = useState(toDateValue(event.occurredAt));
  const [value, setValue] = useState(event.value ?? '');

  const handleSave = () => {
    const occurredAt = combineDateAndTime({ date, time });
    onSave({ value: value || null, occurredAt });
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-col gap-1 p-3 rounded-[10px]"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
          Horário
        </span>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="flex-1"
            style={{ ...INPUT_STYLE, fontSize: 22, color: 'var(--text-primary)', fontWeight: 600 }}
          />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            style={{ ...INPUT_STYLE, fontSize: 11, color: 'var(--text-faint)' }}
          />
        </div>
      </div>

      <div
        className="flex items-center gap-2 p-3 rounded-[10px]"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{EVENT_LABEL[event.type]}</span>
      </div>

      {HAS_VALUE[event.type] && (
        <div className="flex flex-col gap-2">
          <span className="uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            {event.type === EventType.DILATION ? 'Dilatação (cm)' : 'Valor'}
          </span>
          <textarea
            rows={event.type === EventType.NOTE ? 3 : 1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={VALUE_PLACEHOLDER[event.type]}
            className="w-full p-3 rounded-[10px] text-sm resize-none outline-none"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}

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
        onClick={() => onDelete(event.id)}
        className="w-full py-2 text-sm font-medium"
        style={{ color: 'var(--accent)' }}
      >
        Excluir
      </button>
    </div>
  );
}
