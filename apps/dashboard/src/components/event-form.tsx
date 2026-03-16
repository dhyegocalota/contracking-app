import { EventType } from '@contracking/shared';
import { useState } from 'react';

type EventFormProps = {
  eventType: EventType;
  onSubmit: (value?: string) => void;
  onClose: () => void;
};

const DILATION_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function WaterBreakForm({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Registrar ruptura de bolsa?
      </p>
      <button
        type="button"
        onClick={onSubmit}
        className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white"
        style={{ background: 'var(--accent)' }}
      >
        Confirmar
      </button>
    </div>
  );
}

function MealForm({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Registrar última refeição?
      </p>
      <button
        type="button"
        onClick={onSubmit}
        className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white"
        style={{ background: 'var(--accent)' }}
      >
        Confirmar
      </button>
    </div>
  );
}

function DilationForm({ onSubmit }: { onSubmit: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Dilatação (cm)
      </p>
      <div className="flex flex-wrap gap-2">
        {DILATION_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSubmit(String(value))}
            className="flex items-center justify-center text-sm font-medium rounded-full"
            style={{
              width: 36,
              height: 36,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)',
            }}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function NoteForm({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!note.trim()) return;
    onSubmit(note.trim());
  };

  return (
    <div className="flex flex-col gap-4">
      <textarea
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Digite sua nota..."
        className="w-full p-3 rounded-[10px] text-sm resize-none outline-none"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          color: 'var(--text-primary)',
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white"
        style={{ background: 'var(--accent)' }}
      >
        Salvar
      </button>
    </div>
  );
}

export function EventForm({ eventType, onSubmit, onClose: _ }: EventFormProps) {
  if (eventType === EventType.WATER_BREAK) return <WaterBreakForm onSubmit={() => onSubmit()} />;
  if (eventType === EventType.MEAL) return <MealForm onSubmit={() => onSubmit()} />;
  if (eventType === EventType.DILATION) return <DilationForm onSubmit={(value) => onSubmit(value)} />;
  return <NoteForm onSubmit={(value) => onSubmit(value)} />;
}
